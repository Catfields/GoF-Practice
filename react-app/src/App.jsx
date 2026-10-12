import { Routes, Route } from 'react-router-dom';
import IndexPage from './pages/IndexPage.jsx';
import ProblemPage from './pages/ProblemPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/problem/:id" element={<ProblemPage />} />
      <Route path="*" element={<IndexPage />} />
    </Routes>
  );
}