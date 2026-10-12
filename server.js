const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const runner = require('./src/runner');
const store = require('./src/store');
const patterns = require('./src/data');
const paths = require('./src/paths');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const REACT_DIR = path.join(__dirname, 'react-app', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

function listPatterns() {
  return patterns.map((p) => ({
    id: p.id,
    index: p.index,
    title: p.title,
    pattern: p.pattern,
    patternEn: p.patternEn,
    category: p.category,
    difficulty: p.difficulty,
    summary: p.summary,
  }));
}

function problemDetail(id) {
  const p = patterns.find((x) => x.id === id);
  if (!p) return null;
  return {
    id: p.id,
    index: p.index,
    title: p.title,
    pattern: p.pattern,
    patternEn: p.patternEn,
    category: p.category,
    difficulty: p.difficulty,
    background: p.background || '',
    summary: p.summary,
    concept: p.concept,
    structure: p.structure,
    scenario: p.scenario,
    ioSchema: p.ioSchema,
    samples: p.samples,
    templates: p.templates,
    drafts: store.getDraftsForProblem(p.id),
    progress: store.getProblemProgress(p.id),
    hasSolution: Object.keys(p.solutions || {}),
    languages: Object.keys(p.templates || {}),
  };
}

async function handleApi(req, res, pathname, method) {
  try {
    if (pathname === '/api/meta' && method === 'GET') {
      const storage = paths.describe();
      return sendJson(res, 200, {
        languages: runner.availableLanguages(),
        storage: { dir: storage.dir, persistent: storage.persistent, note: storage.note },
      });
    }
    if (pathname === '/api/patterns' && method === 'GET') {
      return sendJson(res, 200, { categories: categoryGroups(), patterns: listPatterns(), progress: store.getProgress() });
    }
    if (pathname === '/api/progress' && method === 'GET') {
      return sendJson(res, 200, { progress: store.getProgress(), total: patterns.length });
    }
    if (pathname === '/api/progress' && method === 'DELETE') {
      store.resetProgress();
      return sendJson(res, 200, { ok: true });
    }

    const problemMatch = pathname.match(/^\/api\/problem\/([^/]+)$/);
    if (problemMatch && method === 'GET') {
      const detail = problemDetail(problemMatch[1]);
      if (!detail) return sendJson(res, 404, { error: '题目不存在' });
      return sendJson(res, 200, detail);
    }

    const draftMatch = pathname.match(/^\/api\/draft\/([^/]+)\/([^/]+)$/);
    if (draftMatch) {
      const problemId = draftMatch[1];
      const lang = draftMatch[2];
      const p = patterns.find((x) => x.id === problemId);
      if (!p) return sendJson(res, 404, { error: '题目不存在' });
      if (!runner.LANG_DEFS[lang]) return sendJson(res, 400, { error: '不支持的语言' });

      if (method === 'GET') {
        const draft = store.getDraft(problemId, lang);
        return sendJson(res, 200, { problemId, language: lang, draft });
      }
      if (method === 'PUT' || method === 'POST') {
        const body = await readBody(req);
        if (typeof body.code !== 'string') {
          return sendJson(res, 400, { error: '缺少 code' });
        }
        const entry = store.saveDraft(problemId, lang, body.code, body.input);
        return sendJson(res, 200, { ok: true, problemId, language: lang, draft: entry });
      }
      if (method === 'DELETE') {
        const removed = store.deleteDraft(problemId, lang);
        return sendJson(res, 200, { ok: true, removed });
      }
    }

    const draftsResetMatch = pathname.match(/^\/api\/drafts$/);
    if (draftsResetMatch && method === 'DELETE') {
      store.resetDrafts();
      return sendJson(res, 200, { ok: true });
    }

    const solutionMatch = pathname.match(/^\/api\/problem\/([^/]+)\/solution$/);
    if (solutionMatch && method === 'GET') {
      const p = patterns.find((x) => x.id === solutionMatch[1]);
      if (!p) return sendJson(res, 404, { error: '题目不存在' });
      const lang = (req.url.split('lang=')[1] || 'python').split('&')[0];
      const code = p.solutions && p.solutions[lang];
      if (!code) {
        return sendJson(res, 200, { language: lang, code: null, message: '该语言暂无参考答案，可切换到 Python 或 Java 查看。' });
      }
      return sendJson(res, 200, { language: lang, code });
    }

    if (pathname === '/api/run' && method === 'POST') {
      const body = await readBody(req);
      if (typeof body.code !== 'string' || !body.language) {
        return sendJson(res, 400, { error: '缺少 code 或 language' });
      }
      const result = await runner.runCode(body.language, body.code, body.input || '');
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/submit' && method === 'POST') {
      const body = await readBody(req);
      if (!body.id || typeof body.code !== 'string' || !body.language) {
        return sendJson(res, 400, { error: '缺少 id、code 或 language' });
      }
      const p = patterns.find((x) => x.id === body.id);
      if (!p) return sendJson(res, 404, { error: '题目不存在' });
      const results = await runner.judge(body.language, body.code, p.testCases);
      const allPassed = results.length > 0 && results.every((r) => r.passed);
      let entry;
      let submission = null;
      if (allPassed) {
        entry = store.markSolved(p.id, body.language);
        // 全部通过时，持久化一份提交记录（代码 + 测试结果），供用户在题目页翻阅
        const record = await store.addSubmission(p.id, body.language, body.code, body.input || '', results);
        submission = { id: record.id, language: record.language, createdAt: record.createdAt, passedCount: record.passedCount, total: record.total };
      } else {
        entry = store.recordAttempt(p.id, body.language);
      }
      return sendJson(res, 200, {
        solved: allPassed,
        passedCount: results.filter((r) => r.passed).length,
        total: results.length,
        results,
        progress: entry,
        submission,
      });
    }

    const submissionsMatch = pathname.match(/^\/api\/problem\/([^/]+)\/submissions$/);
    if (submissionsMatch && method === 'GET') {
      const p = patterns.find((x) => x.id === submissionsMatch[1]);
      if (!p) return sendJson(res, 404, { error: '题目不存在' });
      // 列表只返回概览（代码/结果在详情里），避免一次传输过大
      const submissions = await store.getSubmissionsForProblem(p.id);
      const list = submissions.map((s) => ({
        id: s.id,
        language: s.language,
        passedCount: s.passedCount,
        total: s.total,
        createdAt: s.createdAt,
      }));
      return sendJson(res, 200, { problemId: p.id, submissions: list });
    }

    const submissionDetailMatch = pathname.match(/^\/api\/problem\/([^/]+)\/submissions\/([^/]+)$/);
    if (submissionDetailMatch && method === 'GET') {
      const p = patterns.find((x) => x.id === submissionDetailMatch[1]);
      if (!p) return sendJson(res, 404, { error: '题目不存在' });
      const list = await store.getSubmissionsForProblem(p.id);
      const s = list.find((x) => x.id === submissionDetailMatch[2]);
      if (!s) return sendJson(res, 404, { error: '提交记录不存在' });
      return sendJson(res, 200, s);
    }

    const submissionDeleteMatch = pathname.match(/^\/api\/problem\/([^/]+)\/submissions\/([^/]+)$/);
    if (submissionDeleteMatch && method === 'DELETE') {
      const p = patterns.find((x) => x.id === submissionDeleteMatch[1]);
      if (!p) return sendJson(res, 404, { error: '题目不存在' });
      const ok = await store.deleteSubmission(p.id, submissionDeleteMatch[2]);
      return sendJson(res, 200, { ok, removed: ok });
    }

    return sendJson(res, 404, { error: 'not found' });
  } catch (e) {
    return sendJson(res, 500, { error: e.message || String(e) });
  }
}

function categoryGroups() {
  const order = ['创建型模式', '结构型模式', '行为型模式'];
  const cats = {};
  for (const o of order) cats[o] = [];
  for (const p of patterns) {
    if (cats[p.category]) cats[p.category].push({ id: p.id, index: p.index, title: p.title, pattern: p.pattern, difficulty: p.difficulty });
  }
  return order.map((name) => ({ name, items: cats[name] || [] }));
}

function serveStatic(req, res, pathname) {
  // 优先提供 React 构建产物（react-app/dist），作为 SPA 入口；
  // /browser-check /dom-probe 等自检页面仍走 public/。
  const isTestPage = /^\/?(browser-check|dom-probe)(\.html)?/.test(pathname);
  const roots = isTestPage ? [PUBLIC_DIR] : [REACT_DIR, PUBLIC_DIR];
  for (const root of roots) {
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.normalize(path.join(root, filePath));
    if (filePath.startsWith(root) && fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      return res.end(fs.readFileSync(filePath));
    }
  }
  // SPA 回退：非 /api 且不是真实文件时，返回 React 入口 index.html
  if (!isTestPage) {
    const appEntry = path.join(REACT_DIR, 'index.html');
    if (fs.existsSync(appEntry)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(appEntry));
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  return res.end('404 Not Found');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith('/api/')) {
    return handleApi(req, res, pathname, req.method);
  }
  return serveStatic(req, res, pathname);
});

(async () => {
  const langs = await runner.detectAll();
  const storage = paths.describe();
  console.log('可用语言运行时:', langs.length ? langs.map((l) => runner.LANG_DEFS[l].label).join(', ') : '（无，请安装 Python / Java / Go 之一）');
  console.log(`数据目录: ${storage.dir}`);
  if (!storage.persistent) console.log(`⚠ ${storage.note}`);
  server.listen(PORT, () => {
    const ui = fs.existsSync(path.join(REACT_DIR, 'index.html')) ? 'React (Brutalist)' : 'legacy';
    console.log(`设计模式刷题平台已启动: http://localhost:${PORT}  （UI: ${ui}）`);
  });
})();