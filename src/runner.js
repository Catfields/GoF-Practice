const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const paths = require('./paths');

const TIMEOUT_MS = 8000;
const MAX_OUTPUT = 256 * 1024;

const LANG_DEFS = {
  python: { label: 'Python', ext: 'py' },
  javascript: { label: 'JavaScript', ext: 'js' },
  java: { label: 'Java', ext: 'java' },
  go: { label: 'Go', ext: 'go' },
};

function ensureTmpDir() {
  const dir = paths.tmpDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 探测某个命令是否可用。
 * 这里刻意用 spawn + 管道而不是 execFile：execFile 基于命名管道，在受限沙箱中
 * 会直接 EPERM，导致明明装了运行时却全部探测为「未安装」。
 */
function probe(cmd, args) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(ok);
    };
    let child;
    try {
      child = spawn(cmd, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'ignore'], shell: false });
    } catch (e) {
      return finish(false);
    }
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch (e) {
        /* ignore */
      }
      finish(false);
    }, 5000);
    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
  });
}

const detected = {};

async function detectAll() {
  detected.python = (await probe('python', ['--version'])) ? 'python'
    : (await probe('python3', ['--version'])) ? 'python3'
    : (await probe('py', ['-3', '--version'])) ? 'py -3' : null;
  detected.javascript = 'node'; // backend runs on node, always available
  const javac = await probe('javac', ['-version']);
  const java = await probe('java', ['-version']);
  detected.java = javac && java ? 'java' : null;
  detected.go = (await probe('go', ['version'])) ? 'go' : null;
  return availableLanguages();
}

function availableLanguages() {
  return Object.keys(LANG_DEFS).filter((l) => detected[l]);
}

function isAvailable(language) {
  return !!detected[language];
}

function runProcess(exe, args, input, cwd) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let finished = false;

    const child = spawn(exe, args, {
      cwd: cwd || ensureTmpDir(),
      // 强制子进程按 UTF-8 输出，避免 Windows 控制台默认的 GBK/CP936 导致中文乱码
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch (e) {
        /* ignore */
      }
    }, TIMEOUT_MS);

    child.stdout.on('data', (d) => {
      if (stdout.length < MAX_OUTPUT) {
        stdout += d.toString();
      }
    });
    child.stderr.on('data', (d) => {
      if (stderr.length < MAX_OUTPUT) {
        stderr += d.toString();
      }
    });

    child.on('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr + String(err.message || err), exitCode: -1, timedOut });
    });

    child.on('close', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code, timedOut });
    });

    if (input != null) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

function buildSourceFile(language, code, dir) {
  let filename;
  if (language === 'java') {
    filename = 'Main.java';
  } else if (language === 'go') {
    filename = 'main.go';
  } else if (language === 'python') {
    filename = 'main.py';
  } else {
    filename = 'main.js';
  }
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, code, 'utf8');
  return filePath;
}

async function runCode(language, code, input) {
  if (!LANG_DEFS[language]) {
    return { stdout: '', stderr: `不支持的语言: ${language}`, exitCode: -1, timedOut: false, error: 'unsupported-language' };
  }
  if (!isAvailable(language)) {
    return { stdout: '', stderr: `当前机器未安装该语言运行环境 (${LANG_DEFS[language].label})`, exitCode: -1, timedOut: false, error: 'runtime-missing' };
  }

  ensureTmpDir();
  const dir = fs.mkdtempSync(path.join(ensureTmpDir(), 'run-'));
  try {
    if (language === 'java') {
      const filePath = buildSourceFile(language, code, dir);
      const comp = await runProcess('javac', ['-encoding', 'UTF-8', filePath], '', dir);
      if (comp.exitCode !== 0) {
        return { stdout: '', stderr: '编译错误 (javac):\n' + comp.stderr, exitCode: comp.exitCode, timedOut: false, error: 'compile-error' };
      }
      return await runProcess('java', ['-Dfile.encoding=UTF-8', 'Main'], input, dir);
    }

    if (language === 'go') {
      const filePath = buildSourceFile(language, code, dir);
      const exeName = os.platform() === 'win32' ? 'main.exe' : 'main';
      const comp = await runProcess('go', ['build', '-o', exeName, filePath], '', dir);
      if (comp.exitCode !== 0) {
        return { stdout: '', stderr: '编译错误 (go build):\n' + comp.stderr, exitCode: comp.exitCode, timedOut: false, error: 'compile-error' };
      }
      return await runProcess(path.join(dir, exeName), [], input, dir);
    }

    if (language === 'python') {
      const filePath = buildSourceFile(language, code, dir);
      return await runProcess(detected.python.split(' ')[0], [...detected.python.split(' ').slice(1), filePath], input, dir);
    }

    // javascript
    const filePath = buildSourceFile(language, code, dir);
    return await runProcess('node', [filePath], input, dir);
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      /* ignore */
    }
  }
}

async function judge(language, code, testCases) {
  const results = [];
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const run = await runCode(language, code, tc.input);
    let actual = '';
    let passed = false;
    if (run.error === 'runtime-missing') {
      results.push({ index: i, passed: false, runtimeError: run.stderr, input: tc.input, expected: tc.output, actual: '' });
      continue;
    }
    if (run.error === 'compile-error' || (run.exitCode !== 0 && run.stderr)) {
      results.push({ index: i, passed: false, compileError: true, message: run.stderr, input: tc.input, expected: tc.output, actual: (run.stdout || '').trim() });
      continue;
    }
    actual = (run.stdout || '').replace(/\r\n/g, '\n').trim();
    const expected = (tc.output || '').replace(/\r\n/g, '\n').trim();
    passed = actual === expected;
    results.push({ index: i, passed, input: tc.input, expected: tc.output, actual: run.stdout || '', runtimeError: run.exitCode !== 0 ? run.stderr : undefined, timedOut: run.timedOut });
  }
  return results;
}

module.exports = {
  detectAll,
  availableLanguages,
  isAvailable,
  runCode,
  judge,
  LANG_DEFS,
};