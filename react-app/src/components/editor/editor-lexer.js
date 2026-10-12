// 轻量词法分析器（ES Module 版），从 public/js/editor-lexer.js 移植。
// 为「高亮层」提供逐行 token 切分，支持 Python / Java / Go / JavaScript。
// 规则按顺序匹配，先命中先出 token；行首为 `#`/`//` 的行整体按注释处理。

// 重要（踩过的坑，勿改回）：
//   这些规则会被拼进同一个合并正则 `( A | B | C ... )` 里用 exec 逐个匹配，因此
//   1) 不能对「不存在的捕获组」反向引用：\1、\2 指向不存在的组时会被当作空串，
//      配合 * 量词会匹配零长字符串，导致每次 exec 都在行首命中、整行 token 丢失；
//      → 三引号规则改用等价字符类写法 "(?:" 等正向否定环视。
//   2) 不能用 \b：合并正则前面多了 `(?:`，而 `:` 是非单词字符，于是 `\b` 会在
//      `:` 与首字母之间「成立」，产生一个零长且带捕获的假匹配（exec 得到 index=0、
//      m[1]=''），行首的 class/import 等词就再也匹配不到了。
//      → 一律用 (?<![0-9A-Za-z_]) ... (?![0-9A-Za-z_]) 显式表达单词边界，
//        这样既避开上面两个坑，也能正确处理中文标识符（JS 的 \b 不把中文当单词字符）。
const WB_START = '(?<![0-9A-Za-z_$])';
const WB_END = '(?![0-9A-Za-z_$])';

const PATTERN = {
  ws: /[ \t]+/,
  // 三引号必须排在最前面：若把后面那条「引号 + 可选结束引号」的分支放在前面，
  // 它会在 """ 处先匹配到单个 "，于是三引号被当成普通字符串，跨行状态全乱。
  pyTriple: /"""(?:[^"]|"(?!""))*(?:"""|$)|'''(?:[^']|'(?!''))*(?:'''|$)|"(?:\\[\s\S]|[^\\"\n])*"?|'(?:\\[\s\S]|[^\\'\n])*'?/,
  jsTemplate: /`(?:\\[\s\S]|[^\\`]|\$\{)*?(?:`|$)/,
  jsTemplateTail: /^(?:\\[\s\S]|[^\\`])*`?/,
  string: /"(?:\\[\s\S]|[^\\"\n])*"?|'(?:\\[\s\S]|[^\\'\n])*'?/,
  blockComment: /\/\*[\s\S]*?(?:\*\/|$)/,
  func: /[A-Za-z_]\w*(?=\s*\()/,
  capsName: new RegExp(`${WB_START}[A-Z]\\w*`),
  // 普通标识符必须放在 capsName 之后：它要兜住所有不以大写字母开头的名字
  ident: new RegExp(`${WB_START}[A-Za-z_]\\w*`),
  number: new RegExp(`${WB_START}(?:0[xXbBoO][0-9a-fA-F_]+|\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)${WB_END}`),
  operator: /\+{2}|-{2}|\/\/|\*\*|=>|->|:=|==|!=|<=|>=|&&|\|\||[+\-*/%&|^~!<>=?:]+/,
  punctuation: /[{}()[\];,.@#]/,
};

const LANGUAGES = {
  python: {
    label: 'Python',
    comment: '#',
    multiline: true,
    lineComment: /#[^\n]*/,
    rules: [
      'ws', 'pyTriple', 'string', 'func', 'capsName', 'ident', 'number', 'operator', 'punctuation',
    ],
    keywords: (
      'and as assert async await break class continue def del elif else except finally for from global if ' +
      'import in is lambda nonlocal not or pass raise return try while with yield match case'
    ).split(' '),
    literals: ['None', 'True', 'False', 'self', 'cls', 'NotImplemented', 'Ellipsis'],
  },
  java: {
    label: 'Java',
    comment: '//',
    lineComment: /\/\/[^\n]*/,
    textBlock: true,
    rules: [
      'ws', 'blockComment', 'string', 'func', 'capsName', 'ident', 'number', 'operator', 'punctuation',
    ],
    keywords: (
      'abstract assert boolean break byte case catch char class const continue default do double else enum ' +
      'extends final finally float for goto if implements import instanceof int interface long native new ' +
      'package private protected public record return sealed short static strictfp super switch synchronized ' +
      'this throw throws transient try var void volatile while yield permits non-sealed'
    ).split(' '),
    literals: ['true', 'false', 'null'],
  },
  go: {
    label: 'Go',
    comment: '//',
    lineComment: /\/\/[^\n]*/,
    rawString: true,
    rules: [
      'ws', 'blockComment', 'string', 'func', 'capsName', 'ident', 'number', 'operator', 'punctuation',
    ],
    keywords: (
      'break case chan const continue default defer else fallthrough for func go goto if import interface ' +
      'map package range return select struct switch type var'
    ).split(' '),
    literals: ['true', 'false', 'nil', 'iota', 'any', 'error', 'string', 'int', 'int64', 'float64', 'bool', 'byte', 'rune'],
  },
  javascript: {
    label: 'JavaScript',
    comment: '//',
    lineComment: /\/\/[^\n]*/,
    template: true,
    rules: [
      'ws', 'blockComment', 'string', 'func', 'capsName', 'ident', 'number', 'operator', 'punctuation',
    ],
    keywords: (
      'async await break case catch class const continue debugger default delete do else export extends ' +
      'finally for from function get if import in instanceof let new of return set static super switch this ' +
      'throw try typeof var void while with yield'
    ).split(' '),
    literals: ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'globalThis'],
  },
};

for (const name of Object.keys(LANGUAGES)) {
  const lang = LANGUAGES[name];
  lang.keywords = new Set(lang.keywords);
  lang.literals = new Set(lang.literals);
  lang.compiled = lang.rules.map((r) => ({ cls: r, find: PATTERN[r] }));

  const countCaptures = (s) => {
    let n = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== '(') continue;
      if (s[i - 1] === '\\') continue;
      const next = s[i + 1];
      const isGroupSyntax = next === '?';
      if (isGroupSyntax) continue;
      n += 1;
    }
    return n;
  };

  const parts = [];
  const slots = [];
  let groupNo = 1;
  for (const r of lang.compiled) {
    const source = r.find.source;
    const inner = countCaptures(source);
    slots.push({ group: groupNo, cls: r.cls });
    groupNo += 1 + inner;
    parts.push(`(${source})`);
  }
  lang.regex = new RegExp(parts.join('|'), 'g');
  lang.groupRule = [null];
  slots.forEach((s) => {
    lang.groupRule[s.group] = s.cls;
  });
  lang.groupCount = groupNo - 1;
}

const CLASS_OF = {
  func: 'fn',
  capsName: 'cls',
  number: 'num',
  operator: 'op',
  punctuation: 'punc',
};

function matchToken(lang, rest, m) {
  if (lang.groupRule && m) {
    for (let g = m.length - 1; g >= 1; g--) {
      if (m[g] !== undefined && lang.groupRule[g]) {
        return { cls: lang.groupRule[g], text: m[0] };
      }
    }
    return { cls: null, text: m[0] };
  }

  let best = null;
  for (const r of lang.compiled) {
    r.find.lastIndex = 0;
    const mm = r.find.exec(rest);
    if (!mm || mm[0] === '') continue;
    if (best === null || mm.index < best.index) {
      best = { index: mm.index, length: mm[0].length, cls: r.cls };
    }
    if (best.index === 0) break;
  }
  return best ? { cls: best.cls, text: rest.slice(best.index, best.index + best.length), index: best.index } : null;
}

function isWordChar(ch) {
  return !!ch && /[0-9A-Za-z_$]/.test(ch);
}

function tokenizeLine(line, lang, state) {
  const out = [];
  let i = 0;
  let guard = 0;

  const push = (text, cls) => {
    if (text) out.push({ t: text, c: cls });
  };

  while (i < line.length && guard++ < 8000) {
    if (state.multiline) {
      const { closer } = state.multiline;
      const end = line.indexOf(closer, i);
      if (end === -1) {
        push(line.slice(i), 'str');
        i = line.length;
        continue;
      }
      const stop = end + closer.length;
      push(line.slice(i, stop), 'str');
      i = stop;
      state.multiline = null;
      continue;
    }
    if (state.block) {
      const end = line.indexOf('*/', i);
      const stop = end === -1 ? line.length : end + 2;
      push(line.slice(i, stop), 'cmt');
      i = stop;
      if (end !== -1) state.block = false;
      continue;
    }
    if (state.tpl) {
      const m = line.slice(i).match(PATTERN.jsTemplateTail);
      const text = m ? m[0] : line.slice(i);
      push(text, 'str');
      if (text.charAt(text.length - 1) === '`') {
        state.tpl = false;
        i += text.length;
      } else {
        i = line.length;
      }
      continue;
    }

    const rest = line.slice(i);

    const lc = rest.match(lang.lineComment);
    if (lc && lc.index === 0) {
      push(rest, 'cmt');
      i = line.length;
      continue;
    }

    if (lang.template && rest.charAt(0) === '`') {
      const m = rest.match(PATTERN.jsTemplate);
      push(m[0], 'str');
      if (m[0].length > 1 && m[0].charAt(m[0].length - 1) === '`') {
        i += m[0].length;
      } else {
        state.tpl = true;
        i = line.length;
      }
      continue;
    }
    if (lang.template && rest.startsWith('${')) {
      push('${', 'op');
      state.tplDepth += 1;
      i += 2;
      continue;
    }
    if (lang.template && state.tplDepth > 0 && rest.charAt(0) === '}') {
      push('}', 'op');
      state.tplDepth -= 1;
      i += 1;
      continue;
    }

    let opener = null;
    if (rest.startsWith('"""') && (lang.multiline || lang.textBlock)) opener = '"""';
    else if (rest.startsWith("'''") && lang.multiline) opener = "'''";
    else if (rest.charAt(0) === '`' && lang.rawString) opener = '`';
    if (opener) {
      const text = opener === '`' ? rest : rest.match(PATTERN.pyTriple)[0];
      push(text, 'str');
      if (text.length > opener.length && text.endsWith(opener)) {
        i += text.length;
      } else {
        state.multiline = { closer: opener };
        i = line.length;
      }
      continue;
    }

    let text;
    let cls;
    if (lang.groupRule) {
      lang.regex.lastIndex = 0;
      const m = lang.regex.exec(rest);
      if (!m) {
        push(rest, null);
        break;
      }
      if (m[0] === '') {
        push(line.charAt(i), null);
        i += 1;
        continue;
      }
      if (m.index > 0) {
        push(rest.slice(0, m.index), null);
        i += m.index;
        continue;
      }
      const hit = matchToken(lang, rest, m);
      text = hit.text;
      cls = hit.cls;
    } else {
      const hit = matchToken(lang, rest, null);
      if (!hit) {
        push(rest, null);
        break;
      }
      if (hit.index > 0) {
        push(rest.slice(0, hit.index), null);
        i += hit.index;
        continue;
      }
      text = hit.text;
      cls = hit.cls;
    }

    i += text.length;

    if (cls === 'ws') {
      push(text, null);
      continue;
    }

    const prev = i - text.length > 0 ? line.charAt(i - text.length - 1) : '';
    const midWord = isWordChar(prev) && isWordChar(text.charAt(0));

    if (cls === 'blockComment' || cls === 'string' || cls === 'pyTriple') {
      push(text, cls === 'blockComment' ? 'cmt' : 'str');
      if (cls === 'blockComment' && !text.endsWith('*/')) state.block = true;
      continue;
    }

    if (midWord) {
      push(text, null);
      continue;
    }

    if (lang.keywords.has(text)) {
      push(text, 'kw');
      continue;
    }
    if (lang.literals.has(text)) {
      push(text, 'lit');
      continue;
    }
    push(text, CLASS_OF[cls] || null);
  }

  return out;
}

export function tokenize(code, language) {
  const lang = LANGUAGES[language] || LANGUAGES.python;
  const state = { block: false, multiline: null, tpl: false, tplDepth: 0 };
  return tokenizeLines(code, lang, state);
}

// 与 tokenize 相同，但从给定 lang/state 直接开始，供编辑器高亮使用
function tokenizeLines(code, lang, state) {
  const lines = String(code == null ? '' : code).replace(/\r\n?/g, '\n').split('\n');
  return lines.map((line) => tokenizeLine(line, lang, state));
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function highlight(code, language) {
  const rows = tokenize(code, language);
  return rows
    .map((tokens) =>
      tokens
        .map((tk) => {
          const cls = CLASS_OF[tk.c] || tk.c;
          return cls ? `<span class="tk-${cls}">${esc(tk.t)}</span>` : esc(tk.t);
        })
        .join('')
    )
    .join('\n');
}

export function languages() {
  return Object.keys(LANGUAGES);
}

export function label(name) {
  return LANGUAGES[name] ? LANGUAGES[name].label : name;
}

export function commentToken(name) {
  return LANGUAGES[name] ? LANGUAGES[name].comment : '//';
}