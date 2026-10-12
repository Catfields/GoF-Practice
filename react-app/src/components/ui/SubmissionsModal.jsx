import { useEffect, useState } from 'react';
import { Dialog } from './Dialog.jsx';
import { Badge } from './Badge.jsx';
import { api, LANG_LABELS, fmtFullTime, esc } from '../../lib/api.js';
import './submissions.css';

export function SubmissionsModal({ open, onClose, problemId }) {
  const [subs, setSubs] = useState([]);
  const [view, setView] = useState(null); // 当前查看的详情
  const [loading, setLoading] = useState(false);

  // 打开时加载列表
  useEffect(() => {
    if (!open || !problemId) return;
    setView(null);
    api(`/api/problem/${problemId}/submissions`)
      .then((r) => setSubs(r.submissions || []))
      .catch(() => setSubs([]));
  }, [open, problemId]);

  // 打开后 / 切换视图时滚动到顶部
  useEffect(() => {
    if (!open) return;
    const list = document.getElementById('subs-list-scroll');
    if (list) list.scrollTop = 0;
  }, [open, view]);

  async function openDetail(id) {
    setLoading(true);
    try {
      const s = await api(`/api/problem/${problemId}/submissions/${encodeURIComponent(id)}`);
      setView(s);
    } catch (e) {
      setView({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="已通过的提交记录" maxWidth={800}>
      {view ? (
        <div className="subs-detail">
          <div className="subs-detail-head">
            <button className="brx-btn brx-btn--sm" onClick={() => setView(null)}>‹ 返回列表</button>
            <span className="subs-detail-meta">
              {LANG_LABELS[view.language] || view.language} · {view.passedCount}/{view.total} 通过 · {fmtFullTime(view.createdAt)}
            </span>
          </div>
          <div className="subs-detail-code">
            <div className="subs-code-head">
              <span className="bold">{LANG_LABELS[view.language] || view.language}</span>
              <span className="mono">{fmtFullTime(view.createdAt)}</span>
            </div>
            <pre className="subs-code-pre">{view.code}</pre>
          </div>
          <div className="subs-detail-results">
            {view.error ? (
              <div className="subs-empty">加载失败：{view.error}</div>
            ) : !view.results || !view.results.length ? (
              <div className="subs-empty">无测试结果。</div>
            ) : (
              view.results.map((tc) => (
                <div key={tc.index} className={`subs-case ${tc.passed ? 'subs-case-pass' : 'subs-case-fail'}`}>
                  <div className="subs-case-title">
                    用例 {tc.index + 1}：{tc.passed ? '通过 ✓' : '未通过 ✗'}
                    {(tc.runtimeError || tc.compileError) ? <div className="subs-case-err">{esc(tc.runtimeError || tc.message || tc.compileError || '')}</div> : null}
                  </div>
                  {!tc.passed && (
                    <div className="subs-case-detail">
                      <div><span className="lbl">输入</span><code>{esc(tc.input)}</code></div>
                      <div><span className="lbl">期望</span><code>{esc(tc.expected)}</code></div>
                      <div><span className="lbl">实际</span><code>{esc(tc.actual != null ? String(tc.actual).trim() : '(空)')}</code></div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="subs-list" id="subs-list-scroll">
          {loading ? (
            <div className="subs-loading">加载中…</div>
          ) : subs.length === 0 ? (
            <div className="subs-empty">还没有通过的提交记录。</div>
          ) : (
            subs.map((s) => (
              <button key={s.id} className="subs-item" onClick={() => openDetail(s.id)}>
                <span className="subs-item-left">
                  <Badge variant="done">{LANG_LABELS[s.language] || s.language}</Badge>
                  <span className="subs-time mono">{fmtFullTime(s.createdAt)}</span>
                </span>
                <span className="subs-item-right">
                  <span className="subs-pass">{s.passedCount}/{s.total} 通过</span>
                  <span className="subs-arrow">›</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </Dialog>
  );
}