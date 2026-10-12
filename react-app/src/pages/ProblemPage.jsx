import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, LANG_LABELS, esc } from '../lib/api.js';
import { diffBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Console } from '../components/ui/Console.jsx';
import { SubmissionsModal } from '../components/ui/SubmissionsModal.jsx';
import { CodeEditor } from '../components/editor/CodeEditor.jsx';
import { TopBar } from '../components/layout/TopBar.jsx';
import { renderRunOutput, renderSubmitOutput } from '../lib/output.js';
import '../components/ui/brutal.css';
import '../components/layout/layout.css';
import '../components/editor/editor.css';
import './problem.css';

const WRAP_KEY = 'dp-editor-wrap';
const LANG_KEY = 'dp-editor-lang';

export default function ProblemPage() {
  const { id: problemId } = useParams();

    const [problem, setProblem] = useState(null);
      const [availableLangs, setAvailableLangs] = useState([]);
  const [currentLang, setCurrentLang] = useState('python');
    const [initialCode, setInitialCode] = useState('');
    const [consoleLines, setConsoleLines] = useState([]);
  const [saveState, setSaveState] = useState('idle');
  const [saveNote, setSaveNote] = useState('');
  const [editorStatus, setEditorStatus] = useState('');
  const [input, setInput] = useState('');
  const [inputHint, setInputHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const [subsCount, setSubsCount] = useState(0);
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState(null);
  const [wrap, setWrap] = useState(readWrapPref);
  const [showRestore, setShowRestore] = useState(false);

  // 编辑器受控状态：committed[draft] + draft[dirty] 参照原实现
  const committedRef = useRef({});
  const committedInputRef = useRef({});
  const restoreSnapshotRef = useRef(null);
  const saveTimerRef = useRef(null);
  const editorRef = useRef(null);
  const langRef = useRef(currentLang);
  langRef.current = currentLang;

  const problemRef = useRef(problem);
  problemRef.current = problem;

  // ---- 加载数据 ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [detail, list, meta] = await Promise.all([
          api(`/api/problem/${problemId}`),
          api('/api/patterns').catch(() => null),
          api('/api/meta').catch(() => ({ languages: [] })),
        ]);
        if (cancelled) return;
        setProblem(detail);
                setAvailableLangs(meta && meta.languages ? meta.languages : []);
        const done = list && list.progress && list.progress[problemId] && list.progress[problemId].solved;
        setSolved(!!done);

        // 回填 committed
        const drafts = detail.drafts || {};
        const committed = {};
        const committedInput = {};
                Object.keys(drafts).forEach((lang) => {
                  committed[lang] = drafts[lang].code;
          committedInput[lang] = drafts[lang].input || '';
        });
        detail.languages.forEach((lang) => {
          if (committed[lang] == null) {
            committed[lang] = detail.templates[lang] || '';
            committedInput[lang] = '';
          }
        });
        committedRef.current = committed;
        committedInputRef.current = committedInput;

        // 决定初始语言
        const restored = Object.keys(drafts).filter((l) => drafts[l].code && drafts[l].code !== (detail.templates[l] || ''));
        let preferred = null;
        try { preferred = localStorage.getItem(LANG_KEY); } catch (e) {}
        const candidates = [
          preferred,
          detail.progress && detail.progress.lastLang,
          ...restored,
          'python',
        ];
        const defaultLang =
          candidates.find((l) => l && detail.languages.includes(l) && meta.languages.includes(l)) ||
          detail.languages.find((l) => meta.languages.includes(l)) ||
          detail.languages[0];
        setCurrentLang(defaultLang);
                setInitialCode(committed[defaultLang] || detail.templates[defaultLang] || '');

                setInput(committedInput[defaultLang] || (detail.samples[0] ? detail.samples[0].input : ''));
        setSaveState(restored.length ? 'restored' : 'idle');
        if (restored.length) setSaveNote(`已恢复 《${LANG_LABELS[defaultLang] || defaultLang}》 的草稿`);
        refreshSubsCount(detail);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [problemId]);

  async function refreshSubsCount(p) {
    try {
      const r = await api(`/api/problem/${p ? p.id : problemId}/submissions`);
      setSubsCount((r.submissions || []).length);
    } catch (e) {
      setSubsCount(0);
    }
  }

  const persistDraft = useCallback(
    async (force) => {
      const lang = langRef.current;
      const ed = editorRef.current;
      if (!ed || !problemRef.current) return;
      const code = ed.value;
      const input = writtenInputRef.current != null ? writtenInputRef.current : '';
      const committed = committedRef.current[lang];
      if (!force && committed && committed === code && committedInputRef.current[lang] === input) {
        return;
      }
      setSaveState('saving');
      try {
        const r = await api(
          `/api/draft/${encodeURIComponent(problemId)}/${encodeURIComponent(lang)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, input }),
          }
        );
        const entry = (r && r.draft) || { code, input };
        committedRef.current[lang] = entry.code;
        committedInputRef.current[lang] = entry.input == null ? input : entry.input;
        setSaveState('saved');
      } catch (e) {
        setSaveNote(`草稿保存失败：${e.message}`);
        setSaveState('error');
      }
    },
    [problemId]
  );

  const writtenInputRef = useRef('');
  writtenInputRef.current = input;

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    persistDraft(false);
  }, [persistDraft]);

  // 编辑器变化 → 调度保存
    const scheduleSave = useCallback(() => {
      setSaveState('dirty');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => persistDraft(false), 800);
    }, [persistDraft]);

    const onEditorChange = useCallback(() => scheduleSave(), [scheduleSave]);

  // 卸载 / 页面隐藏时落盘
  useEffect(() => {
    const flush = () => flushSave();
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        persistDraft(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
      document.removeEventListener('keydown', onKey);
    };
  }, [flushSave, persistDraft]);

  // ---- 语言切换 ----
  function loadLanguage(lang) {
    flushSave();
    setCurrentLang(lang);
      langRef.current = lang; // 同步更新，避免 setValue→emitCursor 读到旧语言
      restoreSnapshotRef.current = null;
      setShowRestore(false);
    const committed = committedRef.current[lang];
    const code = committed != null ? committed : (problem.templates[lang] || '');
    if (editorRef.current) {
      editorRef.current.setLanguage(lang);
      editorRef.current.setValue(code, true);
    }
    setSaveState('idle');
    setInput(committedInputRef.current[lang] || (problem.samples[0] ? problem.samples[0].input : ''));
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  // ---- 运行 / 提交 ----
  async function doRun() {
    if (busy) return;
    setBusy(true);
    flushSave();
    setConsoleLines([{ text: '正在运行…', cls: 'run-info' }]);
    try {
      const r = await api('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: langRef.current,
          code: editorRef.current ? editorRef.current.value : '',
          input: writtenInputRef.current,
        }),
      });
      setConsoleLines(renderRunOutput(r));
    } catch (e) {
      setConsoleLines([{ text: e.message, cls: 'err' }]);
    } finally {
      setBusy(false);
    }
  }

  async function doSubmit() {
    if (busy) return;
    setBusy(true);
    flushSave();
    setConsoleLines([{ text: '正在判题…', cls: 'run-info' }]);
    try {
      const r = await api('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: problemId,
          language: langRef.current,
          code: editorRef.current ? editorRef.current.value : '',
          input: writtenInputRef.current,
        }),
      });
      setConsoleLines(renderSubmitOutput(r));
      setSolved(r.solved);
      if (r.solved) refreshSubsCount();
    } catch (e) {
      setConsoleLines([{ text: e.message, cls: 'err' }]);
    } finally {
      setBusy(false);
    }
  }

  async function doSolution() {
    if (busy) return;
    try {
      const r = await api(`/api/problem/${problemId}/solution?lang=${langRef.current}`);
      if (!r.code) {
        setConsoleLines([{ text: r.message || '该语言暂无参考答案', cls: 'run-info' }]);
        return;
      }
      restoreSnapshotRef.current = { code: editorRef.current.value, input: writtenInputRef.current };
      editorRef.current.setValue(r.code, true);
            scheduleSave();
      setShowRestore(true);
      setConsoleLines([{ text: '已加载参考答案，并作为草稿保存。点击「返回我的代码」可回到自己之前的代码。', cls: 'run-info' }]);
    } catch (e) {
      setConsoleLines([{ text: e.message, cls: 'err' }]);
    }
  }

  function doRestore() {
    const snap = restoreSnapshotRef.current;
    if (!snap || busy) return;
    editorRef.current.setValue(snap.code, true);
    setInput(snap.input != null ? snap.input : writtenInputRef.current);
        scheduleSave();
    setShowRestore(false);
    restoreSnapshotRef.current = null;
    setConsoleLines([{ text: '已恢复到查看答案前你编辑的代码。', cls: 'run-info' }]);
  }

  async function doReset() {
    if (!problem || !editorRef.current) return;
    const current = editorRef.current.value;
    const pristine = problem.templates[langRef.current] || '';
    if (current.trim() && current !== pristine && !confirm('重置会丢弃当前语言已保存的草稿，恢复初始模板。确定继续？')) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    restoreSnapshotRef.current = null;
    setShowRestore(false);
    try {
      await api(`/api/draft/${encodeURIComponent(problemId)}/${encodeURIComponent(langRef.current)}`, { method: 'DELETE' });
      delete committedRef.current[langRef.current];
      committedInputRef.current[langRef.current] = '';
    } catch (e) {}
    editorRef.current.setValue(pristine, true);
    setSaveState('idle');
    setConsoleLines([{ text: '已重置为初始模板，该语言的草稿已清除。', cls: '' }]);
  }

  // ---- 编辑器状态栏 ----
  const onCursor = useCallback((c) => {
    const lang = langRef.current;
    const value = editorRef.current ? editorRef.current.value : '';
    const lines = value.split('\n').length;
    const parts = [
      LANG_LABELS[lang],
      `${lines} 行`,
      `${value.length} 字符`,
    ];
    if (c) parts.push(`行 ${c.line}, 列 ${c.col}`);
    if (c && c.selected) parts.push(`选中 ${c.selected}`);
    parts.push('Tab 缩进 · Alt+/ 注释');
    setEditorStatus(parts.join(' · '));
  }, []);

  // 输入变化
  function onInputChange(v) {
    setInput(v);
      scheduleSave(); // 编辑器值不变，仅输入变
    const base = problem && problem.samples[0] ? problem.samples[0].input : '';
    setInputHint(v && v !== base ? '已使用自定义输入（随草稿保存）' : '默认使用示例 1');
  }

  function toggleWrap() {
    setWrap((w) => {
      const next = !w;
      try { localStorage.setItem(WRAP_KEY, next ? '1' : '0'); } catch (e) {}
      return next;
    });
  }

  if (error) {
    return (
      <div>
        <TopBar />
        <div className="index-error">加载失败：{error}</div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div>
        <TopBar />
        <div className="index-loading">加载中…</div>
      </div>
    );
  }

  const done = solved;

    return (
    <div>
      <TopBar />
      <div className="problem-layout">
        <section className="panel-left">
          <Description p={problem} />
        </section>

        <section className="panel-right">
          <div className="editor-toolbar">
            <select
              className="brx-field"
              value={currentLang}
              onChange={(e) => loadLanguage(e.target.value)}
              aria-label="选择语言"
            >
              {['python', 'java', 'go', 'javascript'].map((l) => (
                <option key={l} value={l} disabled={!availableLangs.includes(l)}>
                  {LANG_LABELS[l]}{!availableLangs.includes(l) ? '（未安装）' : ''}
                </option>
              ))}
            </select>
            <Button variant="primary" onClick={doRun} disabled={busy}>运行</Button>
            <Button variant="success" onClick={doSubmit} disabled={busy}>提交</Button>
            <Button variant="yellow" onClick={() => setSubsOpen(true)} disabled={subsCount === 0}>
              提交记录{subsCount ? ` (${subsCount})` : ''}
            </Button>
            <Button variant="ghost" onClick={doSolution}>查看答案</Button>
            {showRestore && <Button variant="ghost" onClick={doRestore}>返回我的代码</Button>}
            <Button variant="ghost" onClick={doReset}>重置</Button>
            <span className="spacer" />
            <Button size="sm" variant={wrap ? 'active' : 'default'} onClick={toggleWrap} title="切换软换行（长代码自动折行）">
              自动换行：{wrap ? '开' : '关'}
            </Button>
            <Button size="sm" onClick={() => editorRef.current && editorRef.current.toggleComment()} title="注释 / 取消注释选中行（Alt+/）">
              注释
            </Button>
            <span className={`run-info ${done ? 'solved' : 'unsolved'}`}>{done ? '✓ 已通过' : '未通过'}</span>
          </div>

          <div className="editor-wrap">
            <CodeEditor
              ref={editorRef}
                        value={initialCode}
              language={currentLang}
              onChange={onEditorChange}
              onCursor={onCursor}
              wrap={wrap}
            />
            <div className="editor-status">
              <span className={`save-status ${saveState === 'dirty' ? 'dirty' : saveState === 'saved' ? 'saved' : ''}`}>
                {saveText(saveState, saveNote)}
              </span>
              <span>{editorStatus}</span>
            </div>
          </div>

          <div className="io-panel">
            <div className="io-head">
              <label>输入</label>
              <textarea value={input} onChange={(e) => onInputChange(e.target.value)} placeholder="自定义输入（默认使用第一个示例）" spellCheck="false" />
              <span className="io-hint">{inputHint}</span>
            </div>
            <Console lines={consoleLines} />
          </div>
        </section>
      </div>

      <SubmissionsModal open={subsOpen} onClose={() => setSubsOpen(false)} problemId={problemId} />
    </div>
  );
}

function Description({ p }) {
  const scenarioText = (p.scenario || '').replace(/^适用场景：\s*/, '');
  const background = (p.background || '').trim();
  return (
    <>
      <div className="desc-head">
        <h1>{p.index}. {p.title}</h1>
        {diffBadge(p.difficulty)}
      </div>
      <div className="desc-sub">{p.pattern} · {p.patternEn} &nbsp;|&nbsp; {p.category}</div>

      {background && (
        <div className="desc-block"><h3>题目说明（背景）</h3><p>{background}</p></div>
      )}

      <div className="codebox">{p.summary || ''}</div>

      <div className="desc-block"><h3>题目讲解</h3><p>{p.concept}</p></div>
      <div className="desc-block"><h3>模式结构</h3><p>{p.structure}</p></div>
      <div className="desc-block"><h3>适用场景</h3><p>{scenarioText}</p></div>
      <div className="desc-block"><h3>输入输出</h3><p>{p.ioSchema}</p></div>

      <div className="desc-block"><h3>示例</h3>
        {p.samples.map((s, i) => (
          <div key={i}>
            <div className="codebox"><span className="io-label">输入</span>{esc(s.input)}</div>
            <div className="codebox" style={{ marginTop: 6 }}><span className="io-label">输出</span>{esc(s.output)}</div>
            {s.explain ? <p style={{ marginTop: 6, color: 'var(--ink-soft)' }}>{esc(s.explain)}</p> : null}
          </div>
        ))}
      </div>
    </>
  );
}

function saveText(state, note) {
  switch (state) {
    case 'dirty': return '未保存的修改…';
    case 'saving': return '正在保存草稿…';
    case 'saved': return '草稿已保存';
    case 'error': return note || '草稿保存失败';
    case 'restored': return note || '已恢复上次的草稿';
    default: return '';
  }
}

function readWrapPref() {
  try {
    return localStorage.getItem(WRAP_KEY) === '1';
  } catch (e) {
    return false;
  }
}