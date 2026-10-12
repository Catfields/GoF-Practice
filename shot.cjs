/**
 * shot.cjs —— 给题目页截图（用于人工确认外观）
 * 用法: node shot.cjs [port] [problemId] [outFile]
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.argv[2] || 3123);
const PID = process.argv[3] || '1';
const OUT = path.resolve(process.argv[4] || 'shot.png');
const URL = `http://127.0.0.1:${PORT}/problem.html?id=${PID}`;
const DEBUG_PORT = 9800 + Math.floor(Math.random() * 150);
const BROWSER = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-shot-'));
const child = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  '--window-size=1440,900',
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
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
    const send = (method, params) => new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { resolve: res, reject: rej });
      ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await send('Page.navigate', { url: URL });
    await sleep(4500);

    // 往编辑器里写一段有代表性的代码，便于观察高亮效果
    await send('Runtime.evaluate', {
      expression: `(function(){
        const host = document.getElementById('code-editor');
        const ta = host.querySelector('.ced-input');
        const code = [
          '// 单例模式（Singleton）演示',
          'public class Main {',
          '    /* 唯一实例：懒加载 + 双重检查 */',
          '    private static volatile ShoppingCart instance;',
          '',
          '    public static ShoppingCart getInstance() {',
          '        if (instance == null) {',
          '            synchronized (ShoppingCart.class) {',
          '                if (instance == null) instance = new ShoppingCart();',
          '            }',
          '        }',
          '        return instance;',
          '    }',
          '',
          '    public static void main(String[] args) {',
          '        String name = "小明";',
          '        int total = 42;',
          '        System.out.println(name + total);',
          '    }',
          '}',
        ].join('\\n');
        ta.value = code;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        host.querySelector('.ced-input').scrollTop = 0;
        return code.length;
      })()`,
      returnByValue: true,
    });
    await sleep(1200);

    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
    console.log('已保存截图:', OUT, `(${fs.statSync(OUT).size} 字节)`);
  } catch (e) {
    console.error('截图失败:', e.message);
  } finally {
    if (ws) try { ws.close(); } catch (e) { /* ignore */ }
    try { child.kill('SIGKILL'); } catch (e) { /* ignore */ }
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
  process.exit(0);
})();
