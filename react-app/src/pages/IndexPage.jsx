import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Card, Progress } from '../components/ui/Card.jsx';
import { Badge, diffBadge } from '../components/ui/Badge.jsx';
import { TopBar } from '../components/layout/TopBar.jsx';
import '../components/ui/brutal.css';
import '../components/layout/layout.css';
import './index.css';

export default function IndexPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/api/patterns')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div>
        <TopBar />
        <div className="index-error">加载失败：{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <TopBar />
        <div className="index-loading">加载中…</div>
      </div>
    );
  }

  const { categories, patterns, progress } = data;
  const total = patterns.length;
  const solved = patterns.filter((p) => progress[p.id] && progress[p.id].solved).length;

  return (
    <div>
      <TopBar />
      <div className="brx-layout">
        <Sidebar categories={categories} progress={progress} />
        <main className="index-content">
          <Hero solved={solved} total={total} />
          {categories.map((cat) => (
            <section key={cat.name} className="index-section">
              <div className="index-section-title">
                <h2 className="bold upper">{cat.name}</h2>
                <span className="index-section-count">{cat.items.length} 道题</span>
              </div>
              <div className="index-grid">
                {cat.items.map((it) => {
                  const p = patterns.find((x) => x.id === it.id);
                  if (!p) return null;
                  const done = progress[it.id] && progress[it.id].solved;
                  return (
                    <Link key={it.id} to={`/problem/${encodeURIComponent(it.id)}`}>
                      <Card hover className="index-card">
                        <div className="index-card-top">
                          <span className="mono index-no">{p.category.slice(0, 2)} · {it.index}</span>
                          {diffBadge(p.difficulty)}
                        </div>
                        <h3 className="index-card-title">{it.title}</h3>
                        <div className="index-card-en mono">{p.pattern} · {p.patternEn}</div>
                        <p className="index-card-summary">{p.summary}</p>
                        <div className="index-card-meta">
                          {done ? <Badge variant="done">已通过</Badge> : <Badge variant="todo">未开始</Badge>}
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ categories, progress }) {
  return (
    <aside className="brx-sidebar">
      <h3 className="bold">目录 · 23 种设计模式</h3>
      {categories.map((cat) => {
        const solvedCount = cat.items.filter((it) => progress[it.id] && progress[it.id].solved).length;
        return (
          <div key={cat.name} className="brx-cat-block">
            <div className="brx-cat-title">
              <span>{cat.name}</span>
              <span className="cnt mono">{solvedCount}/{cat.items.length}</span>
            </div>
            <div className="brx-cat-items">
              {cat.items.map((it) => {
                const solved = progress[it.id] && progress[it.id].solved;
                return (
                  <Link key={it.id} to={`/problem/${encodeURIComponent(it.id)}`}>
                    <span className="idx mono">{it.index}</span>
                    <span className={`dot ${solved ? 'solved' : ''}`} />
                    <span>{it.pattern}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function Hero({ solved, total }) {
  return (
    <div className="index-hero brx-card">
      <h1>通过刷题学会 <span className="hl">23</span> 种设计模式</h1>
      <p>左边看讲解，右边写代码，运行 / 提交 / 查看答案，边学边练。覆盖创建型、结构型、行为型三大类 GoF 设计模式。</p>
      <div className="index-progress-row">
        <Progress value={solved} total={total} />
        <div className="index-progress-stat bold">
          {solved}<small> / {total} 已通过</small>
        </div>
      </div>
    </div>
  );
}