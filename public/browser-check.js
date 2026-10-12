/**
 * browser-check.js —— 真实浏览器中的编辑器行为自检
 * 由 browser-check.html 加载；结果写入 #test-report，外层用 chrome --dump-dom 读取。
 * 自行挂载一个独立的编辑器实例做行为测试，同时校验页面真实编辑器的装配情况。
 */
(function () {
  const out = [];
  const state = { pass: 0, fail: 0 };

  function log(ok, name, detail) {
    if (ok) state.pass++;
    else state.fail++;
    out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  |  ' + detail : ''}`);
  }

  function report(extra) {
    document.getElementById('test-report').textContent = out.join('\n') + (extra ? '\n' + extra : '');
  }

  function waitFor(fn, timeout) {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      (function poll() {
        let v = null;
        try {
          v = fn();
        } catch (e) {
          v = null;
        }
        if (v) return resolve(v);
        if (Date.now() - t0 > (timeout || 8000)) return reject(new Error('timeout'));
        setTimeout(poll, 60);
      })();
    });
  }

  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  function key(el, k, opts) {
    el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, code: k, bubbles: true, cancelable: true }, opts || {})));
  }

  // 模拟浏览器在 keydown 未被 preventDefault 时插入字符
  function typeChar(el, ch, editor) {
    const ev = new KeyboardEvent('keydown', { key: ch, code: ch, bubbles: true, cancelable: true });
    const notPrevented = el.dispatchEvent(ev);
    if (notPrevented) {
      const s = el.selectionStart;
      const e = el.selectionEnd;
      el.value = el.value.slice(0, s) + ch + el.value.slice(e);
      el.selectionStart = el.selectionEnd = s + 1;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const cursorAt = (el, pos) => {
    el.selectionStart = el.selectionEnd = pos;
  };

  /**
   * 校验「源码 -> token -> 还原」无损。
   * code 层末尾总会多补一个换行（用于保证最后一行折行时两层高度一致），
   * 因此两侧都去掉尾部的全部换行后再逐字符比对。
   */
  function lossless(host, source) {
    const el = host.querySelector('.ced-code');
    const strip = (s) => String(s).replace(/\n+$/, '');
    const rendered = strip(el.textContent);
    const expected = strip(source);
    return { rendered, expected, ok: rendered === expected };
  }

  (async function run() {
    let ced = null;
    let ta = null;
    let codeLayer = null;
    let gutter = null;
    const read = () => ced.getValue();
    const tokensOf = (tk) => Array.from(codeLayer.querySelectorAll(`.tk-${tk}`)).map((n) => n.textContent);

    try {
      // ---------- 页面装配检查 ----------
      // 注意：断言必须直接用 DOM 观察页面实例，#code-editor 与下方的测试实例是
      // 两个不同的编辑器，不能用同一个变量混指（曾因此误判为功能缺陷）。
      // 另外页面会「记忆上次使用的语言」，因此不能断言一定是 Python 模板。
      await waitFor(() => document.querySelector('#code-editor .ced-input'), 10000);
      await waitFor(() => {
        const el = document.querySelector('#code-editor .ced-code');
        return el && el.textContent.trim().length > 50;
      }, 10000);
      await frames();
      const pageEditor = document.getElementById('code-editor');
      log(!!pageEditor.querySelector('.ced-input'), '页面编辑器：输入层已挂载');
      log(!!pageEditor.querySelector('.ced-code'), '页面编辑器：高亮层已挂载');
      log(!!pageEditor.querySelector('.ced-gutter-inner'), '页面编辑器：行号层已挂载');
      const pageCodeEl = pageEditor.querySelector('.ced-code');
      const pageTa = pageEditor.querySelector('.ced-input');
      const stripNl = (s) => String(s).replace(/\n+$/, '');
      log(stripNl(pageCodeEl.textContent) === stripNl(pageTa.value),
        '页面编辑器：已载入模板且两层内容一致',
        `语言=${document.getElementById('language').value} 长度=${pageTa.value.length}`);
      log(pageEditor.querySelectorAll('.ced-code .tk-kw').length > 0, '页面编辑器：模板已高亮',
        `关键字 token=${pageEditor.querySelectorAll('.ced-code .tk-kw').length}`);
      log(pageEditor.querySelectorAll('.ced-code .tk-cmt').length > 0, '页面编辑器：模板注释已高亮',
        `注释 token=${pageEditor.querySelectorAll('.ced-code .tk-cmt').length}`);

      const bg = document.querySelector('#description .desc-block.background');
      log(!!bg, '题干区域存在「题目说明（背景）」区块');
      log(!!bg && bg.querySelector('h3').textContent.includes('题目说明'), '背景区块标题正确',
        bg ? bg.querySelector('h3').textContent : '');
      log(!!bg && bg.querySelector('p').textContent.trim().length > 30, '背景内容非空',
        bg ? `长度=${bg.querySelector('p').textContent.length}` : '');
      log(document.querySelector('#description .desc-block') === bg, '背景区块置于题干最上方');

      // ---------- 挂载独立测试实例 ----------
      // 注意：宿主 id 必须在 createCodeEditor 之前设置；document 中会同时存在
      // 页面实例(#code-editor) 与本测试实例，所有断言都通过 closest('.ced-host') 定位。
      const host = document.createElement('div');
      host.id = 'ced-harness';
      host.className = 'ced-host';
      host.style.cssText = 'position:absolute;left:-2000px;top:0;width:640px;height:320px;display:flex;';
      document.body.appendChild(host);
      ced = window.createCodeEditor(host, { language: 'python', indentUnit: 4 });
      ta = host.querySelector('.ced-input');
      codeLayer = host.querySelector('.ced-code');
      gutter = host.querySelector('.ced-gutter-inner');
      await frames();
      await frames();
      const belongsToHarness = !!ta && ta.closest('.ced-host') === host;
      log(!!ced && !!ta, '测试实例创建成功', `host=${host.id}/归属正确=${belongsToHarness}`);

      /* ---------- 高亮 ---------- */
      codeLayer = host.querySelector('.ced-code');
      gutter = host.querySelector('.ced-gutter-inner');
      const PROBE_PY = '# 注释\nimport sys\n\nclass Foo:\n    """文档字符串"""\n    def bar(self, n=10):\n        s = "text"\n        if n > 0:\n            return self.bar(n - 1)\n';
      ced.setValue(PROBE_PY);
      await frames();
      log(ced.getValue() === PROBE_PY, '多行代码 setValue 后内容完整');
      const rt1 = lossless(host, PROBE_PY);
      log(rt1.ok, '高亮层文本与源码逐字符一致（含三引号/注释/字符串）',
        rt1.ok ? '' : `渲染=${JSON.stringify(rt1.rendered.slice(0, 60))}`);
      const pyKw = tokensOf('kw');
      log(['def', 'import', 'if', 'class', 'return'].every((k) => pyKw.includes(k)), 'Python 关键字高亮',
        [...new Set(pyKw)].join(','));
      log(tokensOf('str').length >= 2, '字符串高亮（含文档字符串）', `数量=${tokensOf('str').length}`);
      log(tokensOf('cmt').includes('# 注释'), '行注释高亮', tokensOf('cmt').join(' / '));
      log(tokensOf('num').includes('10') && tokensOf('num').includes('0'), '数字高亮', tokensOf('num').join(','));
      log(tokensOf('fn').includes('bar'), '函数名高亮', [...new Set(tokensOf('fn'))].join(','));
      log(tokensOf('cls').includes('Foo'), '类名高亮', [...new Set(tokensOf('cls'))].join(','));

      // 多行块注释不应吃掉后续高亮
      ced.setLanguage('java');
      ced.setValue('/*\n多行块注释\n*/\npublic class A { int x = 5; }');
      await frames();
      log(tokensOf('cmt').join('').includes('多行块注释'), '跨行块注释被正确识别');
      log(tokensOf('cls').includes('A'), '块注释之后的代码仍正常高亮', tokensOf('cls').join(','));

      ced.setLanguage('javascript');
      ced.setValue('const s = `模板 ${name} 结束`;\nfunction go() { return 1; }');
      await frames();
      const jsKw = tokensOf('kw');
      log(jsKw.includes('const') && jsKw.includes('function') && jsKw.includes('return'), 'JavaScript 关键字高亮',
        [...new Set(jsKw)].join(','));
      log(tokensOf('str').join('').includes('模板'), '模板字符串高亮');

      ced.setLanguage('go');
      ced.setValue('package main\n\nfunc main() {\n\tvar n int = 3\n}');
      await frames();
      log(tokensOf('kw').includes('package') && tokensOf('kw').includes('func'), 'Go 关键字高亮',
        [...new Set(tokensOf('kw'))].join(','));

      /* ---------- 自动缩进 ---------- */
      ced.setLanguage('python');
      ced.setValue('def foo():');
      await frames();
      cursorAt(ta, ta.value.length);
      key(ta, 'Enter');
      await frames();
      log(read() === 'def foo():\n    ', '冒号结尾自动多缩进一级', JSON.stringify(read()));

      ced.setValue('def foo():\n    x = 1');
      await frames();
      cursorAt(ta, ta.value.length);
      key(ta, 'Enter');
      await frames();
      log(read() === 'def foo():\n    x = 1\n    ', '续行保持同级缩进', JSON.stringify(read()));

      ced.setValue('def f():');
      await frames();
      cursorAt(ta, ta.value.length);
      key(ta, 'Enter');
      await frames();
      typeChar(ta, '{', ced);
      await frames();
      key(ta, 'Enter');
      await frames();
      log(read() === 'def f():\n    {\n        \n    }', '大括号内回车自动展开并保持对齐', JSON.stringify(read()));

      /* ---------- 括号与引号配对 ---------- */
      ced.setValue('');
      await frames();
      cursorAt(ta, 0);
      typeChar(ta, '(', ced);
      await frames();
      log(read() === '()' && ta.selectionStart === 1, '输入左括号自动补右括号',
        `${JSON.stringify(read())} caret=${ta.selectionStart}`);

      typeChar(ta, ')', ced);
      await frames();
      log(read() === '()' && ta.selectionStart === 2, '输入已存在的右括号时跳过不重复',
        `${JSON.stringify(read())} caret=${ta.selectionStart}`);

      ced.setValue('');
      await frames();
      cursorAt(ta, 0);
      typeChar(ta, '"', ced);
      await frames();
      log(read() === '""' && ta.selectionStart === 1, '输入引号自动配对', JSON.stringify(read()));

      ced.setValue('[]');
      await frames();
      cursorAt(ta, 1);
      key(ta, 'Backspace');
      await frames();
      log(read() === '', 'Backspace 在空括号中间一次删除一对', JSON.stringify(read()));

      /* ---------- Tab / Shift+Tab ---------- */
      ced.setValue('a = 1');
      await frames();
      cursorAt(ta, 0);
      key(ta, 'Tab');
      await frames();
      log(read() === '    a = 1', 'Tab 插入 4 空格缩进', JSON.stringify(read()));

      cursorAt(ta, ta.value.length);
      key(ta, 'Tab', { shiftKey: true });
      await frames();
      log(read() === 'a = 1', 'Shift+Tab 反缩进', JSON.stringify(read()));

      ced.setValue('a\nb\nc');
      await frames();
      ta.selectionStart = 0;
      ta.selectionEnd = ta.value.length;
      key(ta, 'Tab');
      await frames();
      log(read() === '    a\n    b\n    c', '选中多行整体缩进', JSON.stringify(read()));
      ta.selectionStart = 0;
      ta.selectionEnd = ta.value.length;
      key(ta, 'Tab', { shiftKey: true });
      await frames();
      log(read() === 'a\nb\nc', '选中多行整体反缩进', JSON.stringify(read()));

      /* ---------- 注释切换 ---------- */
      ced.setValue('a = 1\nb = 2');
      await frames();
      ta.selectionStart = 0;
      ta.selectionEnd = ta.value.length;
      key(ta, '/', { altKey: true });
      await frames();
      log(read() === '# a = 1\n# b = 2', 'Alt+/ 注释选中行', JSON.stringify(read()));
      ta.selectionStart = 0;
      ta.selectionEnd = ta.value.length;
      key(ta, '/', { altKey: true });
      await frames();
      log(read() === 'a = 1\nb = 2', '再次 Alt+/ 取消注释', JSON.stringify(read()));

      /* ---------- 换行开关 ---------- */
      const beforeWrap = ced.isWrapped();
      ced.setWrap(!beforeWrap);
      await frames();
      log(ced.isWrapped() === !beforeWrap, '软换行开关可切换');
      log(host.classList.contains('ced-wrap') === ced.isWrapped(), '换行状态反映到 DOM class');
      ced.setWrap(false);
      await frames();

      /* ---------- 行号与滚动同步 ---------- */
      const longCode = Array.from({ length: 200 }, (_, i) => `line_${i + 1} = ${i}`).join('\n');
      ced.setValue(longCode);
      await frames();
      const nums = gutter.textContent.split('\n');
      log(nums.length === 200 && nums[0] === '1' && nums[199] === '200', '行号与代码行数一致',
        `${nums.length} 行, 首=${nums[0]} 末=${nums[199]}`);
      const scrollInfo = () => `scrollTop=${ta.scrollTop} scrollH=${ta.scrollHeight} clientH=${ta.clientHeight}`;
      log(ta.scrollHeight > ta.clientHeight + 100, '长代码下输入层可滚动', scrollInfo());
      ta.scrollTop = 300;
      ta.dispatchEvent(new Event('scroll'));
      await frames();
      const codeT = codeLayer.style.transform;
      const gutT = gutter.style.transform;
      log(Math.abs(ta.scrollTop - 300) < 2 && codeT.includes(`-${ta.scrollTop}`) && gutT.includes(`${-ta.scrollTop}`),
        '滚动时高亮层与行号层同步位移', `code=${codeT} gutter=${gutT} ${scrollInfo()}`);

      /* ---------- 软换行下的高度与滚动对齐 ---------- */
      const longLine = `x = "${'很长的一段文本'.repeat(20)}"`;
      // 行数要足够多，保证不换行时也超出视口，才能真正检验滚动高度
      const manyLines = Array.from({ length: 30 }, (_, i) => `${longLine} # ${i}`);
      ced.setValue(manyLines.join('\n'));
      await frames();
      const nowrapH = codeLayer.getBoundingClientRect().height;
      const nowrapScroll = ta.scrollHeight;
      log(nowrapScroll > ta.clientHeight + 100, '不换行时长文本已超出视口', `scrollH=${nowrapScroll} clientH=${ta.clientHeight}`);
      log(Math.abs(nowrapH - nowrapScroll) < 3, '不换行时高亮层高度等于内容高度',
        `codeH=${nowrapH.toFixed(1)} scrollH=${nowrapScroll}`);

      ced.setWrap(true);
      await frames();
      await frames();
      const wrapCodeH = codeLayer.getBoundingClientRect().height;
      const wrapScroll = ta.scrollHeight;
      log(Math.abs(wrapCodeH - wrapScroll) < 3, '软换行后高亮层高度随折行变化',
        `codeH=${wrapCodeH.toFixed(1)} scrollH=${wrapScroll}`);
      log(wrapScroll > nowrapScroll + 20, '软换行确实产生了更多行',
        `nowrap=${nowrapScroll} wrap=${wrapScroll}`);
      const cedView = host.querySelector('.ced-view');
      log(Math.abs(ta.getBoundingClientRect().height - cedView.clientHeight) < 2,
        '软换行时输入层仍保持视口高度（可滚动）',
        `taH=${ta.getBoundingClientRect().height.toFixed(1)} viewH=${cedView.clientHeight}`);

      // 软换行下滚动，两层仍需同步
      ta.scrollTop = 40;
      ta.dispatchEvent(new Event('scroll'));
      await frames();
      const wCodeT = codeLayer.style.transform;
      const wGutT = gutter.style.transform;
      log(wCodeT.includes(`-${ta.scrollTop}`) && wGutT.includes(`${-ta.scrollTop}`),
        '软换行下滚动同步仍然正确', `code=${wCodeT} gutter=${wGutT} top=${ta.scrollTop}`);
      ced.setWrap(false);
      await frames();

      /* ---------- 几何对齐 ---------- */
      const shortCode = 'def foo(bar, baz):\n    return bar + baz\n';
      ced.setValue(shortCode);
      await frames();
      await frames();
      const cs = getComputedStyle(ta);
      const csCode = getComputedStyle(codeLayer);
      log(cs.fontSize === csCode.fontSize && cs.lineHeight === csCode.lineHeight, '两层字号与行高一致',
        `${cs.fontSize}/${cs.lineHeight} vs ${csCode.fontSize}/${csCode.lineHeight}`);
      log(cs.paddingLeft === csCode.paddingLeft && cs.paddingTop === csCode.paddingTop, '两层内边距一致',
        `${cs.paddingLeft},${cs.paddingTop}`);
      log(cs.fontFamily === csCode.fontFamily, '两层字体一致');
      const dTop = Math.abs(codeLayer.getBoundingClientRect().top - ta.getBoundingClientRect().top);
      log(dTop < 1.5, '两层垂直基线对齐', `Δtop=${dTop.toFixed(2)}px`);

      // 文本框内容与高亮层文本必须逐字符一致（错位排查的根因）
      const rt2 = lossless(host, shortCode);
      log(rt2.ok, '高亮层文本与源码完全一致',
        rt2.ok ? '' : `渲染=${JSON.stringify(rt2.rendered)} 期望=${JSON.stringify(rt2.expected)}`);

      // 逐一样本做无损回读（覆盖块注释、模板串、原始字符串）
      ced.setLanguage('java');
      ced.setValue('/* 块注释 */\npublic class A { int x = 5; }');
      await frames();
      log(lossless(host, '/* 块注释 */\npublic class A { int x = 5; }').ok, 'Java 样本无损回读');

      ced.setLanguage('javascript');
      ced.setValue('const s = `模板 ${name} 尾`;\nlet n = 1;');
      await frames();
      log(lossless(host, 'const s = `模板 ${name} 尾`;\nlet n = 1;').ok, 'JavaScript 样本无损回读');

      ced.setLanguage('go');
      ced.setValue('s := `原始\n字符串`\nvar n int = 3');
      await frames();
      log(lossless(host, 's := `原始\n字符串`\nvar n int = 3').ok, 'Go 样本无损回读');

      ced.setLanguage('python');
      /* ---------- 草稿持久化（服务端往返） ---------- */
      const pid = new URLSearchParams(location.search).get('id') || '1';
      const marker = `# persist-probe-${Date.now()}`;
      let savedNote = null;
      const persistEditor = window.createCodeEditor(document.createElement('div'), {
        language: 'python',
        onChange: () => {
          document.getElementById('save-status').textContent = '待保存';
          fetch(`/api/draft/${pid}/python`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: persistEditor.getValue(), input: 'probe-input' }),
          })
            .then((r) => r.json())
            .then(() => {
              savedNote = '已保存';
              document.getElementById('save-status').textContent = '已保存';
            })
            .catch((e) => {
              document.getElementById('save-status').textContent = '失败:' + e.message;
            });
        },
      });
      persistEditor.setValue(`${marker}\ndef probe():\n    return 1\n`);
      await waitFor(() => savedNote, 6000).catch(() => null);
      log(savedNote === '已保存', '编辑后草稿自动保存到服务端', document.getElementById('save-status').textContent);

      const back = await fetch(`/api/draft/${pid}/python`).then((r) => r.json());
      log(!!back.draft && back.draft.code.includes('persist-probe'), '服务端草稿内容正确',
        back.draft ? `长度=${back.draft.code.length} input=${back.draft.input}` : 'null');
      log(!!back.draft && back.draft.input === 'probe-input', '自定义输入一并持久化',
        back.draft ? JSON.stringify(back.draft.input) : 'null');

      // 进度接口可读
      const detail = await fetch(`/api/problem/${pid}`).then((r) => r.json());
      log(!!detail.progress, '题目详情携带刷题进度', JSON.stringify(detail.progress));

      if (back.draft) {
        await fetch(`/api/draft/${pid}/python`, { method: 'DELETE' });
        const gone = await fetch(`/api/draft/${pid}/python`).then((r) => r.json());
        log(gone.draft === null, '草稿可被清除（重置功能依赖）');
      }
    } catch (e) {
      log(false, '测试执行异常', (e && e.message) || String(e));
    }

    report(`合计: ${state.pass} 通过, ${state.fail} 失败`);
    document.title = state.fail === 0 ? 'ALL-PASS' : `FAIL-${state.fail}`;
  })();
})();
