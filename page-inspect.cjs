/**
 * page-inspect.cjs —— 打开真实题目页，打印关键 DOM 状态（诊断用）
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.argv[2] || 3123);
const URL = `http://127.0.0.1:${PORT}/problem.html?id=1`;
const DEBUG_PORT = 9700 + Math.floor(Math.random() * 100);
const BROWSER = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-insp-'));
const server = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + profile, '--remote-debugging-port=' + DEBUG_PORT, 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let ws;
  try {
    let target = null;
    for (let i = 0; i < 60 && !target; i++) {
      await sleep(250);
      try {
        const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
        target = list.find((t) => t.type === 'page');
      } catch (e) { /* 等待 */ }
    }
    if (!target) throw new Error('调试端口未就绪');

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res);
      ws.addEventListener('error', rej);
    });
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        events.push('异常: ' + JSON.stringify(msg.params.exceptionDetails.exception && msg.params.exceptionDetails.exception.description || msg.params.exceptionDetails.text));
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        events.push('console.' + msg.params.type + ': ' + msg.params.args.map((a) => a.value || a.description).join(' '));
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve } = pending.get(msg.id);
        pending.delete(msg.id);
        resolve(msg.result);
      }
    });
    const send = (method, params) => new Promise((res) => {
      const mid = ++id;
      pending.set(mid, { resolve: res });
      ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: URL });
    await sleep(4000);

    const expr = `JSON.stringify({
      descHtml: (document.getElementById('description')||{}).innerHTML ? document.getElementById('description').innerHTML.slice(0,200) : null,
      descText: (document.getElementById('description')||{}).textContent ? document.getElementById('description').textContent.slice(0,120) : null,
      hasEditorHost: !!document.getElementById('code-editor'),
      hasCedInput: !!document.querySelector('#code-editor .ced-input'),
      cedCodeLen: (document.querySelector('#code-editor .ced-code')||{}).textContent ? document.querySelector('#code-editor .ced-code').textContent.length : -1,
      cedCodeHead: (document.querySelector('#code-editor .ced-code')||{}).textContent ? document.querySelector('#code-editor .ced-code').textContent.slice(0,60) : null,
      taValueLen: (document.querySelector('#code-editor .ced-input')||{}).value ? document.querySelector('#code-editor .ced-input').value.length : -1,
      saveStatus: (document.getElementById('save-status')||{}).textContent,
      solveBadge: (document.getElementById('solve-badge')||{}).textContent,
      lang: (document.getElementById('language')||{}).value,
      bgBlock: !!document.querySelector('#description .desc-block.background')
    })`;
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    console.log('页面状态:', JSON.stringify(JSON.parse(r.result.value), null, 2));
    console.log('\n运行时事件:');
    events.forEach((e) => console.log('  ' + e));
    if (!events.length) console.log('  (无异常)');
  } catch (e) {
    console.error('失败:', e.message);
  } finally {
    if (ws) try { ws.close(); } catch (e) { /* ignore */ }
    try { server.kill('SIGKILL'); } catch (e) { /* ignore */ }
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
  process.exit(0);
})();
