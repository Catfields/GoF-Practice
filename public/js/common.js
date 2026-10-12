const LANG_LABELS = {
  python: 'Python',
  java: 'Java',
  go: 'Go',
  javascript: 'JavaScript',
};

const DIFF_LABELS = { 简单: 'easy', 中等: 'mid', 困难: 'hard' };

async function api(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok && data && data.error) {
    throw new Error(data.error);
  }
  return data;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function diffTag(d) {
  return `<span class="tag ${DIFF_LABELS[d] || 'easy'}">${esc(d)}</span>`;
}

function renderPatternList(categories, progress, activeId) {
  const html = categories
    .map((cat) => {
      const solvedCount = cat.items.filter((it) => progress[it.id] && progress[it.id].solved).length;
      const items = cat.items
        .map((it) => {
          const solved = progress[it.id] && progress[it.id].solved;
          const active = it.id === activeId ? ' active' : '';
          return `<a href="/problem.html?id=${encodeURIComponent(it.id)}" class="${active}">
            <span class="idx">${it.index}</span>
            <span class="dot ${solved ? 'solved' : ''}"></span>
            <span>${esc(it.pattern)}</span>
          </a>`;
        })
        .join('');
      return `<div class="cat-block">
        <div class="cat-title">${esc(cat.name)}<span class="cnt">${solvedCount}/${cat.items.length}</span></div>
        <div class="cat-items">${items}</div>
      </div>`;
    })
    .join('');
  return html;
}

function fmtLastTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) {
    return '';
  }
}

function fmtFullTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch (e) {
    return '';
  }
}