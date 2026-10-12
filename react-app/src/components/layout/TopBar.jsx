import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button.jsx';
import '../ui/brutal.css';
import './layout.css';

export function TopBar() {
  const nav = useNavigate();
  const location = useLocation();
  const onList = location.pathname === '/';

  async function resetProgress() {
    if (!confirm('确定要清空所有完成进度吗？')) return;
    try {
      const res = await fetch('/api/progress', { method: 'DELETE' });
      if (res.ok) nav(0);
    } catch (e) {
      alert('重置失败：' + e.message);
    }
  }

  return (
    <header className="brx-topbar">
      <Link to="/" className="brx-brand">
        <span className="brx-logo">✶</span>
        <span className="bold">设计模式刷题平台</span>
      </Link>
      <nav className="brx-topnav">
        <Link to="/" className={onList ? 'brx-navlink active' : 'brx-navlink'}>
          题目列表
        </Link>
        <Button size="sm" variant="yellow" onClick={resetProgress}>
          重置进度
        </Button>
      </nav>
    </header>
  );
}