(async function () {
  const params = new URLSearchParams(location.search);
  const problemId = params.get('id');
  if (!problemId) {
    document.getElementById('description').textContent = '缺少题目 id';
    return;
  }

  const $ = (id) => document.getElementById(id);
  const elOutput = $('output');
  const elInput = $('input');
  const elLang = $('language');
  const elStatus = $('editor-status');
  const elSaveStatus = $('save-status');
  const elInputHint = $('input-hint');
  const btnRun = $('btn-run');
  const btnSubmit = $('btn-submit');
  const btnSubmissions = $('btn-submissions');
  const btnSolution = $('btn-solution');
  const btnRestore = $('btn-restore');
  const btnReset = $('btn-reset');
  const btnWrap = $('btn-wrap');
  const btnComment = $('btn-comment');

  // 提交记录弹窗
  const subsModal = $('submissions-modal');
  const subsList = $('subs-list');
  const subsDetail = $('subs-detail');
  const subsResults = $('subs-results');
  const subsCode = $('subs-code');
  const subsCodeLang = $('subs-code-lang');
  const subsCodeTime = $('subs-code-time');
  const subsDetailMeta = $('subs-detail-meta');
  let subsData = []; // 当前题目已通过的提交概览

  let problem = null;
  let patternsData = null;
  let availableLangs = [];
  let currentLang = 'python';
  let busy = false;

  // 语言 -> 已确认的（上一次加载/保存成功的）内容，用于判断草稿是否存在、是否需要保存
  const committed = {};
  const dirty = {};
  let editor = null;
  let saveTimer = null;
  let saveState = 'idle'; // idle | dirty | saving | saved | error
  // 查看答案前用户代码的快照，供「返回我的代码」恢复（含语言与自定义输入）
  let restoreSnapshot = null;

  const WRAP_KEY = 'dp-editor-wrap';
  const LANG_KEY = 'dp-editor-lang';

  /* --------------------------- 状态与持久化 --------------------------- */

  function setSaveState(next, note) {
    saveState = next;
    const text = {
      idle: '',
      dirty: '未保存的修改…',
      saving: '正在保存草稿…',
      saved: '草稿已保存',
      error: note || '草稿保存失败',
      restored: '已恢复上次的草稿',
    }[next] || '';
    elSaveStatus.textContent = note && next !== 'error' ? note : text;
    elSaveStatus.className = `save-status ${next === 'dirty' ? 'dirty' : next === 'saved' ? 'saved' : ''}`;
  }

  function templateFor(lang) {
    return (problem && problem.templates[lang]) || '';
  }

  function draftFor(lang) {
    return (problem && problem.drafts && problem.drafts[lang]) || null;
  }

  function updateStatus(cursor) {
    const value = editor ? editor.getValue() : '';
    const lines = value.split('\n').length;
    const parts = [`${LANG_LABELS[currentLang]}`, `${lines} 行`, `${value.length} 字符`];
    if (cursor) parts.push(`行 ${cursor.line}, 列 ${cursor.col}`);
    if (cursor && cursor.selected) parts.push(`选中 ${cursor.selected}`);
    parts.push('Tab 缩进 · Alt+/ 注释');
    elStatus.textContent = parts.join(' · ');
  }

  function updateInputHint() {
    const v = elInput.value;
    const base = problem && problem.samples[0] ? problem.samples[0].input : '';
    const custom = v && v !== base;
    elInputHint.textContent = custom ? '已使用自定义输入（随草稿保存）' : '默认使用示例 1';
  }

  async function persistDraft(force) {
    if (!editor || !problem) return;
    const code = editor.getValue();
    const input = elInput.value;
    if (!force && committed[currentLang] && committed[currentLang].code === code && committed[currentLang].input === input) {
      if (saveState === 'dirty') setSaveState('saved');
      return;
    }
    setSaveState('saving');
    try {
      const r = await api(`/api/draft/${encodeURIComponent(problemId)}/${encodeURIComponent(currentLang)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, input }),
      });
      const entry = (r && r.draft) || { code, input };
      committed[currentLang] = { code: entry.code, input: entry.input == null ? input : entry.input };
      dirty[currentLang] = false;
      setSaveState('saved');
    } catch (e) {
      setSaveState('error', `草稿保存失败：${e.message}`);
    }
  }

  function scheduleSave() {
    dirty[currentLang] = true;
    setSaveState('dirty');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persistDraft(false), 800);
  }

  function flushSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (dirty[currentLang]) persistDraft(false);
  }

  /* ------------------------------ 题干渲染 ------------------------------ */

  function renderDescription(p, progress) {
    const done = progress && progress[p.id] && progress[p.id].solved;
    const scenarioText = (p.scenario || '').replace(/^适用场景：\s*/, '');
    const background = (p.background || '').trim();
    const backgroundHtml = background
      ? `<div class="desc-block background"><h3>题目说明（背景）</h3><p>${esc(background)}</p></div>`
      : '';

    const html = `
      <div class="desc-head">
        <h1>${p.index}. ${esc(p.title)}</h1>
        ${diffTag(p.difficulty)}
      </div>
      <div class="desc-sub">${esc(p.pattern)} · ${esc(p.patternEn)} &nbsp;|&nbsp; ${esc(p.category)}</div>

      ${backgroundHtml}

      <div class="codebox">${esc(p.summary || '')}</div>

      <div class="desc-block"><h3>题目讲解</h3><p>${esc(p.concept)}</p></div>
      <div class="desc-block"><h3>模式结构</h3><p>${esc(p.structure)}</p></div>
      <div class="desc-block"><h3>适用场景</h3><p>${esc(scenarioText)}</p></div>
      <div class="desc-block"><h3>输入输出</h3><p>${esc(p.ioSchema)}</p></div>

      <div class="desc-block"><h3>示例</h3>
        ${p.samples.map((s) => `
          <div class="codebox"><span class="io-label">输入</span>${esc(s.input)}</div>
          <div class="codebox" style="margin-top:6px"><span class="io-label">输出</span>${esc(s.output)}</div>
          ${s.explain ? `<p style="margin-top:6px">${esc(s.explain)}</p>` : ''}
        `).join('')}
      </div>
    `;
    $('description').innerHTML = html;
    $('solve-badge').textContent = done ? '✓ 已通过' : '未通过';
  }

  /* ------------------------------ 语言切换 ------------------------------ */

  function loadLanguage(lang) {
    flushSave();
    currentLang = lang;
    // 语言切换后，之前记录的快照不再适用
    restoreSnapshot = null;
    btnRestore.hidden = true;
    const code = committed[lang] && committed[lang].code != null ? committed[lang].code : templateFor(lang);
    if (editor) editor.setLanguage(lang);
    editor.setValue(code, true);
    dirty[lang] = false;
    setSaveState('idle');
    btnSolution.disabled = !(problem && problem.hasSolution && problem.hasSolution.includes(lang));
    updateStatus();
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) { /* 隐私模式下忽略 */ }
  }

  function initEditor() {
    editor = createCodeEditor($('code-editor'), {
      language: currentLang,
      indentUnit: 4,
      onChange: () => {
        scheduleSave();
        updateStatus();
      },
      onCursor: (c) => updateStatus(c),
    });
    editor.setWrap(readWrapPref());
    applyWrapButton();
  }

  /* -------------------------------- 运行 -------------------------------- */

  function setOutput(lines, cls) {
    elOutput.innerHTML = lines.map((l) => `<span class="${cls || ''}">${esc(l)}</span>`).join('\n');
  }

  async function doRun() {
    if (busy) return;
    busy = true;
    btnRun.disabled = true;
    flushSave();
    setOutput(['正在运行…'], 'run-info');
    try {
      const r = await api('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: currentLang, code: editor.getValue(), input: elInput.value }),
      });
      const lines = [];
      if (r.error === 'unsupported-language' || r.error === 'runtime-missing') {
        lines.push(r.stderr);
        setOutput(lines, 'err');
        return;
      }
      if (r.stdout) lines.push(r.stdout.replace(/\n$/, ''));
      if (r.stderr) lines.push(r.stderr);
      if (r.timedOut) lines.push('[超时] 程序运行超过 8 秒被终止');
      if (!r.stdout && !r.stderr && r.exitCode === 0) lines.push('（无输出）');
      setOutput(lines, '');
    } catch (e) {
      setOutput([e.message], 'err');
    } finally {
      busy = false;
      btnRun.disabled = false;
    }
  }

  async function doSubmit() {
    if (busy) return;
    busy = true;
    btnSubmit.disabled = true;
    flushSave();
    setOutput(['正在判题…'], 'run-info');
    try {
      const r = await api('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: problemId, language: currentLang, code: editor.getValue(), input: elInput.value }),
      });
      const lines = [];
      if (r.results.length === 0) {
        lines.push('本题暂无可评测的测试用例');
      } else if (r.results.some((x) => x.runtimeError)) {
        const rr = r.results.find((x) => x.runtimeError);
        lines.push('运行错误：');
        lines.push(rr.runtimeError);
      } else if (r.results.some((x) => x.compileError)) {
        const rr = r.results.find((x) => x.compileError);
        lines.push('编译错误：');
        lines.push(rr.message);
      } else {
        r.results.forEach((tc) => {
          lines.push(
            `用例 ${tc.index + 1}: ${tc.passed ? '通过 ✓' : '未通过 ✗'}  ${tc.passed ? '' : '\n  输入: ' + tc.input + '\n  期望: ' + tc.expected + '\n  实际: ' + (tc.actual.trim() || '(空)')}`
          );
        });
        lines.push('');
        lines.push(`结果：${r.passedCount}/${r.total} 通过 ${r.solved ? '—— AC，已记录通过！' : '—— 未全部通过，继续加油'}`);
      }
      setOutput(lines, '');
      $('solve-badge').textContent = r.solved ? '✓ 已通过' : '未通过';
      // 有新通过时刷新提交记录按钮
      if (r.solved) refreshSubmissionsBtn();
      if (r.solved && patternsData) {
        if (!patternsData.progress) patternsData.progress = {};
        patternsData.progress[problemId] = r.progress;
      }
    } catch (e) {
      setOutput([e.message], 'err');
    } finally {
      busy = false;
      btnSubmit.disabled = false;
    }
  }

  async function doSolution() {
    if (busy) return;
    try {
      const r = await api(`/api/problem/${problemId}/solution?lang=${currentLang}`);
      if (!r.code) {
        setOutput([r.message || '该语言暂无参考答案'], 'run-info');
        return;
      }
      // 记录查看答案前的代码与输入快照，供「返回我的代码」恢复
      restoreSnapshot = { code: editor.getValue(), input: elInput.value };
      editor.setValue(r.code, true);
      scheduleSave();
      updateStatus();
      btnRestore.hidden = false;
      setOutput(['已加载参考答案，并作为草稿保存。点击「返回我的代码」可回到自己之前的代码。'], 'run-info');
    } catch (e) {
      setOutput([e.message], 'err');
    }
  }

  function doRestore() {
    if (!restoreSnapshot) return;
    if (busy) return;
    editor.setValue(restoreSnapshot.code, true);
    if (restoreSnapshot.input != null) elInput.value = restoreSnapshot.input;
    scheduleSave();
    updateStatus();
    btnRestore.hidden = true;
    restoreSnapshot = null;
    setOutput(['已恢复到查看答案前你编辑的代码。'], 'run-info');
  }

  async function doReset() {
    if (!problem || !editor) return;
    const current = editor.getValue();
    const pristine = templateFor(currentLang);
    if (current.trim() && current !== pristine && !confirm('重置会丢弃当前语言已保存的草稿，恢复初始模板。确定继续？')) {
      return;
    }
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    dirty[currentLang] = false;
    restoreSnapshot = null;
    btnRestore.hidden = true;
    try {
      await api(`/api/draft/${encodeURIComponent(problemId)}/${encodeURIComponent(currentLang)}`, { method: 'DELETE' });
      delete committed[currentLang];
    } catch (e) { /* 即使删除失败也让本地回到模板 */ }
    editor.setValue(pristine, true);
    setSaveState('idle');
    updateStatus();
    setOutput(['已重置为初始模板，该语言的草稿已清除。'], 'run-info');
  }

  /* ------------------------------ 提交记录 ------------------------------ */

  async function refreshSubmissionsBtn() {
    try {
      const r = await api(`/api/problem/${problemId}/submissions`);
      subsData = r.submissions || [];
    } catch (e) {
      subsData = [];
    }
    btnSubmissions.disabled = subsData.length === 0;
    btnSubmissions.textContent = subsData.length ? `提交记录 (${subsData.length})` : '提交记录';
    btnSubmissions.title = subsData.length ? `这道题你有 ${subsData.length} 次通过的提交可翻阅` : '暂无可查看的通过提交';
  }

  async function openSubmissions() {
    if (!subsModal) return;
    await refreshSubmissionsBtn();
    subsModal.classList.remove('hidden');
    renderSubsList();
    subsDetail.classList.add('hidden');
  }

  function closeSubmissions() {
    if (!subsModal) return;
    subsModal.classList.add('hidden');
  }

  function renderSubsList() {
    if (subsData.length === 0) {
      subsList.innerHTML = '<div class="subs-empty">还没有通过的提交记录。</div>';
      return;
    }
    subsList.innerHTML = subsData.map((s) => `
      <button class="subs-item" data-id="${esc(s.id)}">
        <span class="subs-item-left">
          <span class="subs-lang">${esc(LANG_LABELS[s.language] || s.language)}</span>
          <span class="subs-time">${esc(fmtFullTime(s.createdAt))}</span>
        </span>
        <span class="subs-item-right">
          <span class="subs-pass">${s.passedCount}/${s.total} 通过</span>
          <span class="subs-arrow">›</span>
        </span>
      </button>
    `).join('');
    Array.from(subsList.querySelectorAll('.subs-item')).forEach((el) => {
      el.addEventListener('click', () => viewSubmission(el.dataset.id));
    });
  }

  async function viewSubmission(id) {
    try {
      const s = await api(`/api/problem/${problemId}/submissions/${encodeURIComponent(id)}`);
      subsDetailMeta.textContent = `${LANG_LABELS[s.language] || s.language} · ${s.passedCount}/${s.total} 通过 · ${fmtFullTime(s.createdAt)}`;
      subsCodeLang.textContent = LANG_LABELS[s.language] || s.language;
      subsCodeTime.textContent = fmtFullTime(s.createdAt);
      subsCode.textContent = s.code;
      renderSubsResults(s);
      subsList.classList.add('hidden');
      subsDetail.classList.remove('hidden');
    } catch (e) {
      subsList.innerHTML = `<div class="subs-empty">加载失败：${esc(e.message)}</div>`;
    }
  }

  function backToSubsList() {
    subsDetail.classList.add('hidden');
    subsList.classList.remove('hidden');
  }

  function renderSubsResults(s) {
    if (!s.results || !s.results.length) {
      subsResults.innerHTML = '<div class="subs-empty">无测试结果。</div>';
      return;
    }
    const rows = s.results.map((tc) => {
      const cls = tc.passed ? 'subs-case-pass' : 'subs-case-fail';
      const mark = tc.passed ? '通过 ✓' : '未通过 ✗';
      const detail = tc.passed
        ? ''
        : `<div class="subs-case-detail">
             <div><span class="lbl">输入</span><code>${esc(tc.input)}</code></div>
             <div><span class="lbl">期望</span><code>${esc(tc.expected)}</code></div>
             <div><span class="lbl">实际</span><code>${esc(tc.actual != null ? String(tc.actual).trim() : '(空)')}</code></div>
           </div>`;
      const err = (tc.runtimeError || tc.compileError || '')
        ? `<div class="subs-case-err">${esc(tc.runtimeError || tc.message || tc.compileError || '')}</div>`
        : '';
      return `<div class="subs-case ${cls}">
        <div class="subs-case-title">用例 ${tc.index + 1}：${mark}${err}</div>
        ${detail}
      </div>`;
    }).join('');
    subsResults.innerHTML = rows;
  }

  /* ------------------------------ 编辑器选项 ------------------------------ */

  function readWrapPref() {
    try {
      return localStorage.getItem(WRAP_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function applyWrapButton() {
    const on = editor.isWrapped();
    btnWrap.textContent = `自动换行：${on ? '开' : '关'}`;
    btnWrap.classList.toggle('on', on);
  }

  function setupNav() {
    const list = patternsData ? patternsData.patterns : [];
    const idx = list.findIndex((p) => p.id === problemId);
    $('nav-prev').addEventListener('click', (e) => {
      e.preventDefault();
      flushSave();
      if (idx > 0) location.href = `/problem.html?id=${list[idx - 1].id}`;
    });
    $('nav-next').addEventListener('click', (e) => {
      e.preventDefault();
      flushSave();
      if (idx >= 0 && idx < list.length - 1) location.href = `/problem.html?id=${list[idx + 1].id}`;
    });
    if (idx <= 0) $('nav-prev').style.opacity = '.4';
    if (idx >= list.length - 1) $('nav-next').style.opacity = '.4';
  }

  function initLanguages() {
    Array.from(elLang.options).forEach((opt) => {
      if (!availableLangs.includes(opt.value)) {
        opt.textContent = opt.textContent + '（未安装）';
        opt.disabled = true;
      }
    });
  }

  /* -------------------------------- 事件 -------------------------------- */

  elLang.addEventListener('change', () => loadLanguage(elLang.value));

  elInput.addEventListener('input', () => {
    updateInputHint();
    scheduleSave();
  });

  btnRun.addEventListener('click', doRun);
  btnSubmit.addEventListener('click', doSubmit);
  btnSubmissions.addEventListener('click', openSubmissions);
  btnSolution.addEventListener('click', doSolution);
  btnRestore.addEventListener('click', doRestore);
  btnReset.addEventListener('click', doReset);
  btnComment.addEventListener('click', () => editor.toggleComment());
  btnWrap.addEventListener('click', () => {
    editor.setWrap(!editor.isWrapped());
    applyWrapButton();
    try {
      localStorage.setItem(WRAP_KEY, editor.isWrapped() ? '1' : '0');
    } catch (e) { /* ignore */ }
  });

  // 提交记录弹窗控件
  if (subsModal) {
    const closeBtn = $('subs-close');
    const backBtn = $('subs-back');
    if (closeBtn) closeBtn.addEventListener('click', closeSubmissions);
    if (backBtn) backBtn.addEventListener('click', backToSubsList);
    subsModal.addEventListener('click', (e) => {
      if (e.target === subsModal) closeSubmissions();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !subsModal.classList.contains('hidden')) closeSubmissions();
    });
  }

  window.addEventListener('beforeunload', flushSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });
  // Ctrl/Cmd + S：立即保存草稿
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      persistDraft(true);
    }
  });

  /* -------------------------------- 启动 -------------------------------- */

  try {
    const [detail, list, meta] = await Promise.all([
      api(`/api/problem/${problemId}`),
      api('/api/patterns').catch(() => null),
      api('/api/meta').catch(() => ({ languages: [] })),
    ]);
    problem = detail;
    patternsData = list;
    availableLangs = meta && meta.languages ? meta.languages : [];

    // 用服务端草稿回填到内存映射
    const drafts = problem.drafts || {};
    const restored = [];
    Object.keys(drafts).forEach((lang) => {
      committed[lang] = { code: drafts[lang].code, input: drafts[lang].input || '' };
      if (drafts[lang].code && drafts[lang].code !== (problem.templates[lang] || '')) restored.push(lang);
    });
    // 有草稿但还没进过 drafts 的语言，以模板作为初始状态
    problem.languages.forEach((lang) => {
      if (!committed[lang]) committed[lang] = { code: problem.templates[lang] || '', input: '' };
    });

    renderDescription(problem, list ? list.progress : {});

    // 决定初始语言：本地记忆 > 进度里的 lastLang > 有草稿的语言 > python
    let preferred = null;
    try {
      preferred = localStorage.getItem(LANG_KEY);
    } catch (e) { preferred = null; }
    const candidates = [preferred, problem.progress && problem.progress.lastLang, ...restored, 'python'];
    const defaultLang = candidates.find((l) => l && problem.languages.includes(l) && availableLangs.includes(l))
      || problem.languages.find((l) => availableLangs.includes(l))
      || problem.languages[0];

    elLang.value = defaultLang;
    initLanguages();
    initEditor();
    loadLanguage(defaultLang);

    // 恢复自定义输入；没有则用示例 1
    const draftInput = committed[defaultLang] && committed[defaultLang].input;
    elInput.value = draftInput || (problem.samples[0] ? problem.samples[0].input : '');
    updateInputHint();

    if (restored.length) {
      setSaveState('restored', `已恢复 《${LANG_LABELS[defaultLang] || defaultLang}》 的草稿`);
    }

    btnRun.disabled = false;
    btnSubmit.disabled = false;
    btnReset.disabled = false;
    setupNav();
    refreshSubmissionsBtn();
    updateStatus();
  } catch (e) {
    $('description').textContent = '加载失败：' + e.message;
  }
})();
