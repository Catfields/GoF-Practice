import { esc } from '../../lib/api.js';

export function Console({ lines }) {
  // lines: Array<{ text, cls }>
  return (
    <div className="brx-console">
      {lines.length === 0 ? (
        <span className="brx-console-empty">在这里查看运行 / 提交结果。</span>
      ) : (
        lines.map((l, i) => (
          <div
            key={i}
            className={`brx-console-line ${l.cls || ''}`}
            dangerouslySetInnerHTML={{ __html: esc(l.text).replace(/\n/g, '<br/>') }}
          />
        ))
      )}
    </div>
  );
}