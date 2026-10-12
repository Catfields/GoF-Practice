(async function () {
  let data;
  try {
    data = await api('/api/patterns');
  } catch (e) {
    document.getElementById('categories').innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`;
    return;
  }

  const { categories, patterns, progress } = data;

  const total = patterns.length;
  const solved = patterns.filter((p) => progress[p.id] && progress[p.id].solved).length;

  document.getElementById('progress-fill').style.width = (total ? (solved / total) * 100 : 0) + '%';
  document.getElementById('progress-stat').innerHTML = `${solved}<small>/ ${total} 已通过</small>`;

  document.getElementById('sidebar-tree').innerHTML = renderPatternList(categories, progress, null);

  const catsHtml = categories.map((cat) => {
    const cards = cat.items
      .map((it) => {
        const p = patterns.find((x) => x.id === it.id);
        if (!p) return '';
        const done = progress[it.id] && progress[it.id].solved;
        return `<a class="card" href="/problem.html?id=${encodeURIComponent(it.id)}">
          <div class="top"><span class="no">${p.category.slice(0, 2)} · ${it.index}</span>${diffTag(p.difficulty)}</div>
          <h3>${it.title}</h3>
          <div class="en">${esc(p.pattern)} · ${esc(p.patternEn)}</div>
          <p class="summary">${esc(p.summary)}</p>
          <div class="meta">
            ${done ? '<span class="tag state-done">已通过</span>' : '<span class="tag state-todo">未开始</span>'}
          </div>
        </a>`;
      })
      .join('');
    return `<div class="section-title"><h2>${esc(cat.name)}</h2><span>${cat.items.length} 道题</span></div>
      <div class="problem-grid">${cards}</div>`;
  }).join('');

  document.getElementById('categories').innerHTML = catsHtml;

  document.getElementById('reset-progress').addEventListener('click', async (e) => {
    e.preventDefault();
    if (!confirm('确定要清空所有完成进度吗？')) return;
    await api('/api/progress', { method: 'DELETE' });
    location.reload();
  });
})();