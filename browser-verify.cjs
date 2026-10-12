/**
 * browser-verify.cjs —— 用无头 Chrome + DevTools 协议跑编辑器浏览器自检
 * 不依赖任何 npm 包：浏览器启动调试端口，本脚本用 Node 内置 WebSocket 驱动。
 * 用法: node browser-verify.cjs [port] [problemId]
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.argv[2] || process.env.PORT || 3123);
const PID = process.argv[3] || '1';
const PAGE = `http://127.0.0.1:${PORT}/browser-check.html?id=${PID}`;
const DEBUG_PORT = 9333 + Math.floor(Math.random() * 200);

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const browser = CANDIDATES.find((p) => p && fs.existsSync(p));
if (!browser) {
  console.error('找不到 Chrome/Edge');
  process.exit(2);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-chrome-'));
const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  '--user-data-dir=' + profile,
  '--remote-debugging-port=' + DEBUG_PORT,
  'about:blank',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function waitForEndpoint(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const list = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const page = list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page;
    } catch (e) {
      /* 还没起来 */
    }
    await sleep(250);
  }
  throw new Error('等待调试端口超时');
}

function cdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    });
    ws.addEventListener('error', (e) => reject(new Error('WebSocket 错误: ' + (e.message || ''))));
    ws.addEventListener('open', () =>
      resolve({
        send(method, params) {
          const mid = ++id;
          return new Promise((res, rej) => {
            pending.set(mid, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
          });
        },
        close() {
          try {
            ws.close();
          } catch (e) {
            /* ignore */
          }
        },
      })
    );
  });
}

(async () => {
  console.log(`使用浏览器: ${browser}`);
  console.log(`测试地址: ${PAGE}`);
  console.log(`调试端口: ${DEBUG_PORT}\n`);

  const child = spawn(browser, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let browserErr = '';
  child.stderr.on('data', (d) => (browserErr += d.toString()));

  let exitCode = 1;
  let client = null;
  try {
    const target = await waitForEndpoint(25000);
    client = await cdp(target.webSocketDebuggerUrl);
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Log.enable');
    await client.send('Page.navigate', { url: PAGE });

    const consoleErrors = [];
    // 收集控制台错误，便于定位前端异常
    const origSend = client.send;
    client.send = origSend;

    const readReport = `(function(){var el=document.getElementById('test-report');return el?el.textContent:null;})()`;
    let text = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 90000) {
      await sleep(600);
      try {
        const r = await client.send('Runtime.evaluate', { expression: readReport, returnByValue: true });
        const v = r && r.result && r.result.value;
        if (v && /合计:/.test(v)) {
          text = v;
          break;
        }
        if (v) text = v;
      } catch (e) {
        /* 页面可能还在导航 */
      }
    }

    // 顺带把页面里未捕获的异常捞出来
    let pageErrors = [];
    try {
      const r = await client.send('Runtime.evaluate', {
        expression: `JSON.stringify(window.__dshErrors || [])`,
        returnByValue: true,
      });
      pageErrors = JSON.parse((r && r.result && r.result.value) || '[]');
    } catch (e) {
      /* ignore */
    }

    if (!text) {
      console.error('未能读取测试报告（页面可能未加载完成）');
      if (browserErr) console.error(browserErr.slice(0, 1200));
      exitCode = 3;
    } else {
      console.log(text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
      if (pageErrors.length) console.log('\n页面异常: ' + pageErrors.join(' | '));
      const m = text.match(/合计:\s*(\d+)\s*通过,\s*(\d+)\s*失败/);
      if (!m) {
        console.error('\n无法解析统计行');
        exitCode = 4;
      } else {
        exitCode = Number(m[2]) === 0 ? 0 : 1;
        console.log(exitCode === 0 ? '\n浏览器端自检全部通过' : `\n浏览器端有 ${m[2]} 项失败`);
      }
    }
  } catch (e) {
    console.error('执行失败:', e.message);
    if (browserErr) console.error(browserErr.slice(0, 1200));
    exitCode = 5;
  } finally {
    if (client) client.close();
    try {
      child.kill('SIGKILL');
    } catch (e) {
      /* ignore */
    }
    await sleep(400);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch (e) {
      /* ignore */
    }
  }
  process.exit(exitCode);
})();
