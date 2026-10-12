// lexer 单元测试（临时文件，验证完删除）
// 现在词法分析器的权威实现是 react-app/src/components/editor/editor-lexer.js（ES Module）。
// 用 dynamic import 加载它做测试；public/js/editor-lexer.js 为历史遗留副本。
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
const LX = await import(pathToFileURL(path.join(process.cwd(), 'react-app', 'src', 'components', 'editor', 'editor-lexer.js')).href);

const CASES = [
  {
    name: 'Python 单行三引号后应恢复关键字高亮',
    lang: 'python',
    code: '# 注释\nimport sys\n\nclass Foo:\n    """文档字符串"""\n    def bar(self, n=10):\n        s = "text"\n        if n > 0:\n            return self.bar(n - 1)\n',
    expect: { kw: ['import', 'class', 'def', 'if', 'return'], str: ['"""文档字符串"""', '"text"'], cmt: ['# 注释'], num: ['10', '0', '1'] },
  },
  {
    name: 'Python 跨行三引号',
    lang: 'python',
    code: 'def f():\n    """\n    多行文档\n    """\n    return 1\n',
    expect: { kw: ['def', 'return'], num: ['1'], cmt: [] },
  },
  {
    name: 'Java 跨行块注释（按行切分为多个注释 token）',
    lang: 'java',
    code: '/*\n块注释\n*/\npublic class A { int x = 5; }',
    expect: {
      cmt: ['/*', '块注释', '*/'],
      kw: ['public', 'class', 'int'],
      cls: ['A'],
      num: ['5'],
    },
  },
  {
    name: 'Java 未闭合块注释：其后内容全部按注释处理',
    lang: 'java',
    code: 'int a = 1;\n/* 未闭合\nint b = 2;',
    expect: { kw: ['int'], num: ['1'], cmt: ['/* 未闭合'] },
    forbid: { num: ['2'] },
  },
  {
    name: 'JavaScript 模板字符串与插值',
    lang: 'javascript',
    code: 'const s = `模板 ${name} 结束`;\nfunction go() { return 1; }',
    expect: { kw: ['const', 'function', 'return'], num: ['1'] },
  },
  {
    name: 'Go 关键字（int 是预声明类型名而非关键字，归入字面量类）',
    lang: 'go',
    code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar n int = 3\n\tfmt.Println(n)\n}',
    expect: { kw: ['package', 'import', 'func', 'var'], num: ['3'], str: ['"fmt"'] },
  },
  {
    name: '关键字不应出现在标识符中间',
    lang: 'python',
    code: 'define = 1\nclassify = 2\nforall = 3',
    expect: { kw: [] },
  },
  {
    name: '字符串中的关键字不算关键字',
    lang: 'python',
    code: 's = "def class import"\n# def class\n',
    expect: { kw: [], str: ['"def class import"'], cmt: ['# def class'] },
  },
  {
    name: '未闭合字符串只影响到本行末尾（下一行恢复正常高亮）',
    lang: 'python',
    code: 's = "abc\ndef foo():\n    return 1',
    expect: { str: ['"abc'], kw: ['def', 'return'], num: ['1'] },
  },
  {
    name: 'Go 原始字符串（反引号）跨行',
    lang: 'go',
    code: 's := `第一行\n第二行`\nvar n int = 3',
    expect: { str: ['`第一行', '第二行`'], kw: ['var'], num: ['3'] },
  },
  {
    name: '中文正文不会误判关键字',
    lang: 'python',
    code: 'x = "小明def"\ny = "中文class"',
    expect: { kw: [] },
  },
];

function collect(tokens) {
  const map = {};
  const lines = [];
  for (const line of tokens) {
    lines.push(line.map((t) => {
      if (t.c) (map[t.c] = map[t.c] || []).push(t.t);
      return t.t;
    }).join(''));
  }
  map.__all = lines.join('\n');
  return map;
}

let pass = 0;
let fail = 0;
for (const c of CASES) {
  const map = collect(LX.tokenize(c.code, c.lang));
  const problems = [];
  for (const [cls, expected] of Object.entries(c.expect)) {
    const actual = map[cls] || [];
    for (const want of expected) {
      if (!actual.includes(want)) problems.push(`缺少 ${cls}:"${want}"（实际 ${JSON.stringify(actual.slice(0, 8))}）`);
    }
  }
  for (const [cls, forbidden] of Object.entries(c.forbid || {})) {
    const actual = map[cls] || [];
    for (const bad of forbidden) {
      if (actual.includes(bad)) problems.push(`不应出现 ${cls}:"${bad}"`);
    }
  }
  // 文本必须无损还原
  const src = c.code.replace(/\r\n?/g, '\n');
  if (map.__all !== src) {
    problems.push(`文本未能无损还原（长度 ${map.__all.length} vs ${src.length}）`);
  }
  if (problems.length === 0) {
    pass++;
    console.log(`PASS  ${c.name}`);
  } else {
    fail++;
    console.log(`FAIL  ${c.name}`);
    problems.forEach((p) => console.log(`        - ${p}`));
  }
}

console.log(`\n合计: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
})();
