/**
 * paths.js —— 运行期可写目录探测
 *
 * 本项目定位是「本地直接 node server.js 就能用」，所以优先把数据写在项目内的
 * data/ 目录里，方便查看与备份。但在受限沙箱/只读目录中运行时，项目目录可能
 * 不可写（创建文件会 EPERM），此时自动退回到系统临时目录，保证功能不中断。
 *
 * 可用环境变量强制指定：
 *   DP_DATA_DIR  提交历史 / 草稿 / 进度 / 运行临时文件的存放目录
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_DIR = path.join(__dirname, '..');
const PREFERRED = process.env.DP_DATA_DIR
  ? path.resolve(process.env.DP_DATA_DIR)
  : path.join(PROJECT_DIR, 'data');

let checked = false;
let writable = false;
let fallbackDir = null;

function probe(dir) {
  const probeFile = path.join(dir, `.write-probe-${process.pid}`);
  try {
    fs.writeFileSync(probeFile, 'ok', 'utf8');
    fs.unlinkSync(probeFile);
    return true;
  } catch (e) {
    return false;
  }
}

function ensureCheck() {
  if (checked) return;
  checked = true;
  try {
    fs.mkdirSync(PREFERRED, { recursive: true });
  } catch (e) {
    /* 目录已存在或无权限，交给 probe 判断 */
  }
  writable = probe(PREFERRED);
  if (!writable) {
    fallbackDir = path.join(os.tmpdir(), 'design-pattern-practice');
    try {
      fs.mkdirSync(fallbackDir, { recursive: true });
    } catch (e) {
      /* 连临时目录都不可用就只能让上层报错了 */
    }
  }
}

/** 数据根目录：可写时是项目内的 data/，否则是临时目录 */
function dataDir() {
  ensureCheck();
  return writable ? PREFERRED : fallbackDir;
}

/** 运行代码时使用的临时目录 */
function tmpDir() {
  const dir = path.join(dataDir(), 'tmp');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    /* 交给调用方处理 */
  }
  return dir;
}

/** 是否成功写入了项目内的 data/ 目录 */
function isPersistent() {
  ensureCheck();
  return writable;
}

/** 给人看的说明，用于启动日志与前端提示 */
function describe() {
  ensureCheck();
  return writable
    ? { dir: PREFERRED, persistent: true, note: '' }
    : {
      dir: fallbackDir,
      persistent: false,
      note: `项目目录不可写，数据已临时存放到 ${fallbackDir}（重启后可能被系统清理）`,
    };
}

/**
 * 解析一个数据文件的位置。
 *  - read : 优先用项目内 data/ 里的既有文件（保留历史数据），否则用临时目录
 *  - write: 总是选真正可写的那个位置，避免"能读到但写不进去"
 *  - preferred: 项目内的理想落点，写成功时会顺带同步一份过去
 */
function resolveDataFile(filename) {
  ensureCheck();
  const preferred = path.join(PREFERRED, filename);
  const alt = path.join(fallbackDir || PREFERRED, filename);
  const writePath = writable ? preferred : alt;
  const readPath = fs.existsSync(preferred) ? preferred : writePath;
  return {
    name: filename,
    read: readPath,
    write: writePath,
    preferred,
    fallback: alt,
    separate: readPath !== writePath,
  };
}

module.exports = {
  PROJECT_DIR,
  PREFERRED_DIR: PREFERRED,
  dataDir,
  tmpDir,
  isPersistent,
  describe,
  resolveDataFile,
};
