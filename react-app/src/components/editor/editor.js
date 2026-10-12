// 零依赖代码编辑器（ES Module 版），从 public/js/editor.js 移植。
// 三层结构：行号层(.ced-gutter) + 高亮层(.ced-code) + 透明输入层(texarea)。
import { highlight } from './editor-lexer.js';

const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const CLOSERS = new Set(Object.keys(PAIRS).map((k) => PAIRS[k]));
const UNIT_SIZE = 4;

const COMMENT_STYLE = {
  python: { line: '#' },
  java: { line: '//', block: true },
  go: { line: '//', block: true },
  javascript: { line: '//', block: true },
};

const OPENERS = /[{([:]$/;

export function createCodeEditor(host, options) {
  const opts = options || {};
  const state = {
    language: opts.language || 'python',
    indentUnit: opts.indentUnit || UNIT_SIZE,
    wrap: !!opts.wrap,
    value: opts.value || '',
    onChange: opts.onChange || null,
    disabled: !!opts.disabled,
  };

  host.classList.add('ced');
  host.innerHTML = `
    <div class="ced-gutter"><div class="ced-gutter-inner"></div></div>
    <div class="ced-view">
      <div class="ced-scroll">
        <div class="ced-code" aria-hidden="true"></div>
        <textarea class="ced-input" spellcheck="false" autocomplete="off" autocapitalize="off"
          autocorrect="off" wrap="off" aria-label="代码编辑器"></textarea>
      </div>
    </div>`;

  const gutter = host.querySelector('.ced-gutter-inner');
    const view = host.querySelector('.ced-view');
    const code = host.querySelector('.ced-code');
    const ta = host.querySelector('.ced-input');

    let charWidth = 8;
    let lineHeight = 20;

  function measure() {
    const cs = getComputedStyle(ta);
    charWidth = parseFloat(cs.getPropertyValue('--ch')) || charWidth;
    lineHeight = parseFloat(cs.lineHeight) || lineHeight;
  }

  function calibrate() {
    const cs = getComputedStyle(ta);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
      const w = ctx.measureText('0'.repeat(64)).width / 64;
      if (w > 0) ta.style.setProperty('--ch', `${w}px`);
    }
    measure();
    syncWidth();
  }

  function padV() {
    const cs = getComputedStyle(ta);
    return (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  }

  function padH() {
    const cs = getComputedStyle(ta);
    return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  }

  function lineCount() {
    return state.value.split('\n').length;
  }

  function wrapEnabled() {
    return state.wrap;
  }

  function syncWidth() {
    const width = Math.max(120, view.clientWidth);
    if (wrapEnabled()) {
      ta.style.width = `${width}px`;
      code.style.width = `${width}px`;
      return;
    }
    const longest = state.value.split('\n').reduce((a, l) => Math.max(a, l.length), 0);
    const pad = padH();
    const natural = Math.ceil((longest + 2) * charWidth) + pad;
    if (natural > width) {
      ta.style.width = `${natural}px`;
      code.style.width = `${natural}px`;
    } else {
      ta.style.width = `${width}px`;
      code.style.width = `${width}px`;
    }
  }

  function contentHeight() {
    const measured = ta.scrollHeight;
    if (measured && measured > 0) return measured;
    return lineCount() * lineHeight + padV();
  }

  function syncHeight() {
    const viewH = Math.max(view.clientHeight, 1);
    const h = Math.max(viewH, contentHeight());
    code.style.height = `${h}px`;
    gutter.style.height = `${h}px`;
    ta.style.height = `${viewH}px`;
  }

  function relayout() {
    syncWidth();
    syncHeight();
    syncScroll();
  }

  function renderNumbers() {
      const lines = lineCount();
      const digits = String(lines).length;
      const wanted = Math.max(44, Math.ceil(digits * charWidth) + 22);
      gutter.style.width = `${wanted}px`;
      view.style.left = `${wanted}px`;
    let out = '';
    for (let i = 1; i <= lines; i++) out += `${i}\n`;
    gutter.textContent = out.slice(0, -1);
  }

  function renderCode() {
    const html = highlight(state.value, state.language);
    code.innerHTML = `${html}\n`;
  }

  function syncScroll() {
    code.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
    gutter.style.transform = `translateY(${-ta.scrollTop}px)`;
  }

  function render() {
    renderNumbers();
    renderCode();
    relayout();
    emitCursor();
  }

  function setValue(value, silent) {
    state.value = String(value == null ? '' : value).replace(/\r\n?/g, '\n');
    ta.value = state.value;
    render();
    if (!silent) fireChange();
  }

  function fireChange() {
    if (state.onChange) state.onChange(state.value);
  }

  function getValue() {
    return state.value;
  }

  function readInput() {
    if (ta.value !== state.value) state.value = ta.value;
    return state.value;
  }

  function afterEdit(suppress) {
    readInput();
    render();
      if (!suppress) fireChange();
  }

  function replaceRange(start, end, text, selStart, selEnd) {
    ta.setRangeText(text, start, end, 'end');
    const caret = selStart != null ? selStart : start + text.length;
    const caretEnd = selEnd != null ? selEnd : caret;
    ta.selectionStart = caret;
    ta.selectionEnd = caretEnd;
  }

  function currentLine() {
    const pos = ta.selectionStart;
    const start = state.value.lastIndexOf('\n', pos - 1) + 1;
    let end = state.value.indexOf('\n', pos);
    if (end === -1) end = state.value.length;
    return { start, end, text: state.value.slice(start, end), pos };
  }

  function indentOf(line) {
    const m = line.match(/^[ \t]*/);
    return m ? m[0] : '';
  }

  function unit() {
    return ' '.repeat(state.indentUnit);
  }

  function handleEnter(e) {
    const line = currentLine();
    const beforeCaret = state.value.slice(line.start, line.pos);
    const afterCaret = state.value.slice(line.pos, line.end);
    const indent = indentOf(line.text);
    const trimmed = beforeCaret.replace(/[ \t]+$/, '');
    let extra = '';
    if (OPENERS.test(trimmed)) {
      const last = trimmed.charAt(trimmed.length - 1);
      if (!(last === ':' && /(^|\s)(else|elif|except|finally|try|do)\b/.test(trimmed))) extra = unit();
    }
    const closing = /^[)\]}]/.test(afterCaret.replace(/[ \t]/g, '')) && afterCaret.trim().length > 0;
    if (closing) {
      const text = `\n${indent}${extra}\n${indent}`;
      const caret = line.pos + 1 + indent.length + extra.length;
      e.preventDefault();
      replaceRange(line.pos, line.pos, text, caret);
      afterEdit();
      return;
    }
    e.preventDefault();
    const text = `\n${indent}${extra}`;
    replaceRange(line.pos, line.pos, text);
    afterEdit();
  }

  function handleTab(e) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const multi = state.value.slice(start, end).indexOf('\n') !== -1;
    e.preventDefault();

    if (multi || (e.shiftKey && !multi && indentOf(currentLine().text).length > 0 && start === end && start - currentLine().start <= indentOf(currentLine().text).length)) {
      indentSelection(e.shiftKey ? -1 : 1);
      return;
    }
    if (e.shiftKey) {
      const line = currentLine();
      const ind = indentOf(line.text);
      if (ind.length > 0) {
        const remove = Math.min(state.indentUnit, ind.length);
        replaceRange(line.start, line.start + remove, '');
        afterEdit();
      }
      return;
    }
    replaceRange(start, end, unit());
    afterEdit();
  }

  function indentSelection(dir) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const firstStart = state.value.lastIndexOf('\n', start - 1) + 1;
    let lastEnd = state.value.indexOf('\n', end);
    if (lastEnd === -1) lastEnd = state.value.length;
    const block = state.value.slice(firstStart, lastEnd);
    const lines = block.split('\n');
    let deltaFirst = 0;
    let deltaTotal = 0;
    const out = lines
      .map((l, idx) => {
        if (dir > 0) {
          deltaTotal += state.indentUnit;
          if (idx === 0) deltaFirst = state.indentUnit;
          return unit() + l;
        }
        const ind = indentOf(l);
        if (!ind.length) return l;
        const remove = Math.min(state.indentUnit, ind.length);
        deltaTotal -= remove;
        if (idx === 0) deltaFirst = -remove;
        return l.slice(remove);
      })
      .join('\n');

    replaceRange(firstStart, lastEnd, out, start + deltaFirst, end + deltaTotal);
    afterEdit();
  }

  function toggleComment() {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const firstStart = state.value.lastIndexOf('\n', start - 1) + 1;
    let lastEnd = state.value.indexOf('\n', end);
    if (lastEnd === -1) lastEnd = state.value.length;
    const block = state.value.slice(firstStart, lastEnd);
    const lines = block.split('\n');
    const style = COMMENT_STYLE[state.language] || COMMENT_STYLE.javascript;
    const token = `${style.line} `;
    const blank = (l) => l.trim().length === 0;
    const meaningful = lines.filter((l) => !blank(l));
    const allCommented = meaningful.length > 0 && meaningful.every((l) => l.trim().startsWith(style.line));

    let deltaFirst = 0;
    let deltaTotal = 0;
    const out = lines
      .map((l, idx) => {
        if (blank(l)) return l;
        if (allCommented) {
          const lead = indentOf(l);
          const rest = l.slice(lead.length);
          const cut = rest.startsWith(token) ? token.length : style.line.length;
          deltaTotal -= cut;
          if (idx === 0) deltaFirst = -cut;
          return lead + rest.slice(cut);
        }
        const lead = indentOf(l);
        deltaTotal += token.length;
        if (idx === 0) deltaFirst = token.length;
        return lead + token + l.slice(lead.length);
      })
      .join('\n');

    replaceRange(firstStart, lastEnd, out, start + deltaFirst, end + deltaTotal);
    afterEdit();
  }

  function handlePair(e) {
    const ch = e.key;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = state.value.slice(start, end);
    const next = state.value.charAt(end);
    const prev = state.value.charAt(start - 1);

    if (PAIRS[ch] !== undefined) {
      if (ch === '"' || ch === "'" || ch === '`') {
        if (start === end && next === ch) {
          e.preventDefault();
          ta.selectionStart = ta.selectionEnd = start + 1;
          emitCursor();
          return;
        }
        if (start === end && /[0-9A-Za-z_$\u4e00-\u9fa5]/.test(prev)) return;
      }
      e.preventDefault();
      const close = PAIRS[ch];
      if (selected) {
        replaceRange(start, end, ch + selected + close, start + 1, start + 1 + selected.length);
      } else {
        replaceRange(start, end, ch + close, start + 1);
      }
      afterEdit();
      return;
    }

    if (CLOSERS.has(ch) && start === end && next === ch) {
      e.preventDefault();
      ta.selectionStart = ta.selectionEnd = start + 1;
      emitCursor();
    }
  }

  function onKeyDown(e) {
    if (state.disabled) return;

    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'z' || k === 'y') {
        setTimeout(() => afterEdit(false), 0);
        return;
      }
      if (k === '/') {
        e.preventDefault();
        toggleComment();
        return;
      }
    }
    if (e.altKey && e.key === '/') {
      e.preventDefault();
      toggleComment();
      return;
    }

    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) return handleEnter(e);
    if (e.key === 'Tab') return handleTab(e);
    if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd) {
      const start = ta.selectionStart;
      const before = state.value.slice(0, start);
      const after = state.value.slice(start);
      if (PAIRS[before.charAt(before.length - 1)] === after.charAt(0) && before.length > 0) {
        e.preventDefault();
        replaceRange(start - 1, start + 1, '');
        afterEdit();
        return;
      }
      const line = currentLine();
      const ind = indentOf(line.text);
      if (line.pos - line.start > 0 && line.pos - line.start <= ind.length) {
        const back = (line.pos - line.start - 1) % state.indentUnit + 1;
        e.preventDefault();
        replaceRange(line.pos - back, line.pos, '');
        afterEdit();
        return;
      }
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) handlePair(e);
  }

  function emitCursor() {
    if (!opts.onCursor) return;
    const pos = ta.selectionStart;
    const before = state.value.slice(0, pos);
    const line = before.split('\n').length;
    const col = pos - (before.lastIndexOf('\n') + 1) + 1;
    opts.onCursor({ line, col, selected: ta.selectionEnd - ta.selectionStart, lines: lineCount() });
  }

  ta.addEventListener('keydown', onKeyDown);
  ta.addEventListener('input', () => afterEdit());
  ta.addEventListener('scroll', syncScroll);
  ta.addEventListener('click', emitCursor);
  ta.addEventListener('keyup', emitCursor);
  ta.addEventListener('select', emitCursor);

    let roRef = null;
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        syncWidth();
        syncHeight();
      });
      ro.observe(view);
      roRef = ro;
    }
    globalThis.addEventListener('resize', relayout);

  ta.value = state.value;
  requestAnimationFrame(() => {
    calibrate();
    render();
  });

  const api = {
    setLanguage(lang) {
      state.language = lang;
      renderCode();
    },
    setValue,
    getValue,
    focus: () => ta.focus(),
    getInput: () => ta,
    setWrap(on) {
      state.wrap = !!on;
      ta.setAttribute('wrap', state.wrap ? 'soft' : 'off');
      host.classList.toggle('ced-wrap', state.wrap);
      render();
    },
    isWrapped: () => state.wrap,
    setDisabled(on) {
      state.disabled = !!on;
      ta.disabled = !!on;
      host.classList.toggle('ced-disabled', !!on);
    },
    indentSelection,
    toggleComment,
    refresh: render,
    insertText(text) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      replaceRange(start, end, text);
      afterEdit();
    },
    getCommentToken: () => (COMMENT_STYLE[state.language] || COMMENT_STYLE.javascript).line,
        destroy() {
          if (roRef) roRef.disconnect();
          globalThis.removeEventListener('resize', relayout);
        },
      };

      return api;
    }

export { highlight };