// 端到端接口验证脚本（临时文件，验证完可删）
const http = require('http');
const PORT = Number(process.env.PORT || 3123);

function req(method, p, obj) {
  return new Promise((resolve, reject) => {
    const d = obj ? JSON.stringify(obj) : null;
    const r = http.request(
      { host: '127.0.0.1', port: PORT, path: p, method,
        headers: d ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) } : {} },
      (x) => {
        let b = '';
        x.on('data', (c) => (b += c));
        x.on('end', () => resolve({ status: x.statusCode, body: b }));
      }
    );
    r.on('error', reject);
    if (d) r.write(d);
    r.end();
  });
}

const j = (r) => JSON.parse(r.body);

(async () => {
  let pass = 0;
  let fail = 0;
  const check = (name, ok, extra) => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
    ok ? pass++ : fail++;
  };

  const meta = j(await req('GET', '/api/meta'));
  check('运行时探测 >= 1 种语言', meta.languages.length >= 1, meta.languages.join(','));
  check('storage 元信息存在', !!meta.storage && typeof meta.storage.dir === 'string', meta.storage.dir);

  const code = '# 草稿测试\nprint("hi")\n';
  const put = await req('PUT', '/api/draft/1/python', { code, input: '5\nadd apple' });
  check('PUT 草稿返回 200', put.status === 200);

  const got = j(await req('GET', '/api/draft/1/python'));
  check('GET 草稿内容一致', got.draft && got.draft.code === code, JSON.stringify(got.draft && got.draft.input));

  const d2 = j(await req('GET', '/api/problem/1'));
  check('题目详情内嵌 drafts', !!d2.drafts.python && d2.drafts.python.code === code);
  check('题目详情含 background', typeof d2.background === 'string' && d2.background.length > 20,
    `len=${d2.background.length}`);
  check('题目详情含 progress', !!d2.progress);

  const run = j(await req('POST', '/api/run', { language: 'python', code: 'print(1+1)', input: '' }));
  if (run.error === 'spawn EPERM') {
    console.log('SKIP  Python 运行 —— 当前会话的沙箱禁止子进程管道（spawn EPERM），非代码缺陷');
  } else {
    check('Python 运行输出 2', (run.stdout || '').trim() === '2', JSON.stringify(run).slice(0, 120));
  }

  const patterns = require('./src/data');
  const p1 = patterns.find((x) => x.id === '1');
  const sub = j(await req('POST', '/api/submit', { id: '1', language: 'python', code: p1.solutions.python }));
  if (sub.error === 'spawn EPERM') {
    console.log('SKIP  提交判题 —— 同上，沙箱禁止子进程管道');
  } else {
    check('提交参考实现全部通过', sub.solved === true, `passed=${sub.passedCount}/${sub.total}`);
  }

  const d3 = j(await req('GET', '/api/problem/1'));
  check('题目详情返回 progress 结构', !!d3.progress && typeof d3.progress.attempts === 'number',
    `attempts=${d3.progress.attempts} solved=${d3.progress.solved}`);
  // 注：/api/submit 判题依赖子进程，在当前沙箱下必然 spawn EPERM，进度写入改由下方直接验证存储层


  const del = j(await req('DELETE', '/api/draft/1/python'));
  check('DELETE 草稿成功', del.removed === true);
  const after = j(await req('GET', '/api/draft/1/python'));
  check('删除后草稿为空', after.draft === null);

  // 多语言草稿互不覆盖
  await req('PUT', '/api/draft/2/java', { code: 'class Main {}', input: '' });
  await req('PUT', '/api/draft/2/go', { code: 'package main', input: 'x' });
  const d4 = j(await req('GET', '/api/problem/2'));
  check('同题多语言草稿隔离', !!d4.drafts.java && !!d4.drafts.go && d4.drafts.java.code !== d4.drafts.go.code,
    Object.keys(d4.drafts).join(','));

  // 非法输入
  check('非法语言被拒绝', (await req('PUT', '/api/draft/2/cobol', { code: 'x' })).status === 400);
  check('不存在的题目 404', (await req('PUT', '/api/draft/999/python', { code: 'x' })).status === 404);
  check('缺少 code 返回 400', (await req('PUT', '/api/draft/2/python', {})).status === 400);

  // 直接验证存储层（不依赖子进程执行）。
  // 用随机 id 保证可重复运行，并在结束时清理，避免污染真实进度数据。
  const store = require('./src/store');
  const paths = require('./src/paths');
  const fs = require('fs');
  const probeId = `__selftest_${Date.now().toString(36)}`;
  const desc = paths.describe();
  console.log(`      数据目录: ${desc.dir} (persistent=${desc.persistent})`);

  try {
    if (sub.submission && sub.submission.id) {
      const historyRecord = sub.submission;
      const historyList = j(await req('GET', '/api/problem/1/submissions'));
      check('SQLite 提交历史接口返回记录',
        historyList.submissions.some((s) => s.id === historyRecord.id));
      const historyDetail = j(await req(
        'GET',
        `/api/problem/1/submissions/${encodeURIComponent(historyRecord.id)}`,
      ));
      check('SQLite 提交历史详情完整', historyDetail.code === p1.solutions.python &&
        historyDetail.results.length === historyRecord.total);
      const historyDelete = j(await req(
        'DELETE',
        `/api/problem/1/submissions/${encodeURIComponent(historyRecord.id)}`,
      ));
      check('SQLite 提交历史可删除', historyDelete.removed === true);
    } else {
      console.log('SKIP  SQLite 提交历史接口 —— 当前运行环境无法执行判题子进程');
    }

    const before = store.getProgress()[probeId];
    const entry = store.markSolved(probeId, 'python');
    const reread = store.getProgress()[probeId];
    check('markSolved 落盘并可读回', !!reread && reread.solved === true && entry.solved === true,
      `solved=${reread && reread.solved} attempts=${reread && reread.attempts} 新建=${!before}`);

    const att = store.recordAttempt(probeId, 'go');
    check('recordAttempt 累加且记录语言',
      !!att && att.attempts === entry.attempts + 1 && att.lastLang === 'go' && att.solved === true,
      `attempts=${att && att.attempts} lastLang=${att && att.lastLang}`);

    const progressLoc = paths.resolveDataFile('progress.json');
    check('写入位置确实可写', (() => {
      try {
        fs.writeFileSync(progressLoc.write, fs.readFileSync(progressLoc.write));
        return true;
      } catch (e) {
        return false;
      }
    })(), `write=${progressLoc.write}`);

    const draftLoc = paths.resolveDataFile('drafts.json');
    const draftOnDisk = JSON.parse(fs.readFileSync(draftLoc.write, 'utf8'));
    check('drafts.json 已持久化', !!draftOnDisk['2'] && !!draftOnDisk['2'].java, draftLoc.write);
  } finally {
    // 清理本次探针记录，保证测试可重复运行且不污染进度
    try {
      const p = store.getProgress();
      if (p[probeId]) {
        delete p[probeId];
        fs.writeFileSync(paths.resolveDataFile('progress.json').write, JSON.stringify(p, null, 2), 'utf8');
        console.log('      已清理探针进度记录');
      }
    } catch (e) {
      console.log('      探针清理失败:', e.message);
    }
    ['2', '3'].forEach((pid) => {
      try {
        store.deleteDraft(pid, 'java');
        store.deleteDraft(pid, 'go');
        store.deleteDraft(pid, 'python');
      } catch (e) { /* ignore */ }
    });
  }

  console.log(`\n合计: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})();
