const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const paths = require('./paths');

const DATA_DIR = paths.dataDir();
const PROGRESS = paths.resolveDataFile('progress.json');
const DRAFTS = paths.resolveDataFile('drafts.json');
const SUBMISSIONS = paths.resolveDataFile('submissions.json');
const HISTORY_DB_PATH = path.join(DATA_DIR, 'history.sqlite');

const MAX_CODE_LENGTH = 256 * 1024;
const MAX_INPUT_LENGTH = 64 * 1024;

function ensureDir(file) {
  const dir = file ? path.dirname(file) : DATA_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function tryRead(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { value: parsed, mtime: fs.statSync(file).mtimeMs };
    }
  } catch (e) {
    /* 文件不存在或损坏 */
  }
  return null;
}

function readJsonFile(loc, fallback) {
  ensureDir(loc.write);
  const primary = tryRead(loc.read);
  // 读写位置分离时（项目目录不可写），合并两份副本，冲突处以较新的为准，
  // 这样「受限运行 → 正常运行 → 再受限」之间来回切换也不会丢记录。
  if (loc.separate) {
    const secondary = loc.fallback === loc.read ? null : tryRead(loc.fallback);
    if (primary && secondary) {
      const stale = secondary.mtime > primary.mtime ? primary.value : secondary.value;
      const fresh = secondary.mtime > primary.mtime ? secondary.value : primary.value;
      return Object.assign({}, stale, fresh);
    }
    if (primary) return primary.value;
    if (secondary) return secondary.value;
    return fallback;
  }
  return primary ? primary.value : fallback;
}

function writeJsonFile(loc, value) {
  const file = loc.write;
  const text = JSON.stringify(value, null, 2);
  ensureDir(file);
  // 先写临时文件再改名，避免中途崩溃留下半截 JSON
  const tmp = `${file}.tmp`;
  try {
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, file);
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch (e2) {
      /* ignore */
    }
    // 少数文件系统不允许改名覆盖，退回直接写入，仍失败则抛出
    fs.writeFileSync(file, text, 'utf8');
  }
  // 退回临时目录时，若项目目录又能写了，顺手同步一份回去，方便查看与备份
  if (loc.separate) {
    try {
      fs.writeFileSync(loc.preferred, text, 'utf8');
    } catch (e) {
      /* 项目目录仍不可写，忽略 */
    }
  }
}

let historyDbPromise;

function persistHistoryDb(db) {
  const tmp = `${HISTORY_DB_PATH}.tmp`;
  ensureDir(HISTORY_DB_PATH);
  fs.writeFileSync(tmp, Buffer.from(db.export()));
  try {
    fs.renameSync(tmp, HISTORY_DB_PATH);
  } catch (error) {
    try {
      fs.copyFileSync(tmp, HISTORY_DB_PATH);
      fs.unlinkSync(tmp);
    } catch (persistError) {
      try {
        fs.unlinkSync(tmp);
      } catch (cleanupError) {
        // Preserve the persistence error so callers see the actual failure.
      }
      throw persistError;
    }
  }
}

async function initializeHistoryDb() {
  ensureDir(HISTORY_DB_PATH);
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(path.dirname(require.resolve('sql.js')), file),
  });
  const db = fs.existsSync(HISTORY_DB_PATH)
    ? new SQL.Database(fs.readFileSync(HISTORY_DB_PATH))
    : new SQL.Database();
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      problem_id TEXT NOT NULL,
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      input TEXT NOT NULL,
      results TEXT NOT NULL,
      passed_count INTEGER NOT NULL,
      total INTEGER NOT NULL,
      solved INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS submissions_problem_created
      ON submissions(problem_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS store_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const migrated = db.exec("SELECT value FROM store_metadata WHERE key = 'submissions_json_migrated'");
  if (migrated.length === 0 || migrated[0].values.length === 0) {
    const legacySubmissions = readJsonFile(SUBMISSIONS, {});
    const insert = db.prepare(`
      INSERT OR IGNORE INTO submissions
        (id, problem_id, language, code, input, results, passed_count, total, solved, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    db.run('BEGIN');
    try {
      for (const [problemId, records] of Object.entries(legacySubmissions)) {
        if (!Array.isArray(records)) continue;
        for (const record of records) {
          if (!record || typeof record.id !== 'string' || typeof record.code !== 'string' ||
            typeof record.language !== 'string' || !Array.isArray(record.results)) continue;
          insert.run([
            record.id,
            problemId,
            record.language,
            record.code,
            typeof record.input === 'string' ? record.input : '',
            JSON.stringify(record.results),
            Number.isInteger(record.passedCount) ? record.passedCount : record.results.filter((r) => r.passed).length,
            Number.isInteger(record.total) ? record.total : record.results.length,
            record.solved ? 1 : 0,
            typeof record.createdAt === 'string' ? record.createdAt : new Date(0).toISOString(),
          ]);
        }
      }
      db.run("INSERT INTO store_metadata (key, value) VALUES ('submissions_json_migrated', '1')");
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    } finally {
      insert.free();
    }
  }
  persistHistoryDb(db);
  return db;
}

function getHistoryDb() {
  if (!historyDbPromise) historyDbPromise = initializeHistoryDb();
  return historyDbPromise;
}

function submissionFromRow(row) {
  return {
    id: row.id,
    language: row.language,
    code: row.code,
    input: row.input,
    results: JSON.parse(row.results),
    passedCount: row.passed_count,
    total: row.total,
    solved: Boolean(row.solved),
    createdAt: row.created_at,
  };
}

/* ------------------------------ 刷题进度 ------------------------------ */

function readProgress() {
  return readJsonFile(PROGRESS, {});
}

function writeProgress(progress) {
  writeJsonFile(PROGRESS, progress);
}

function getProgress() {
  return readProgress();
}

function getProblemProgress(id) {
  const progress = readProgress();
  return progress[id] || { solved: false, attempts: 0, lastLang: null, lastTime: null };
}

function recordAttempt(id, lang) {
  const progress = readProgress();
  const entry = progress[id] || { solved: false, attempts: 0, lastLang: null, lastTime: null, firstSolvedTime: null };
  entry.attempts += 1;
  entry.lastLang = lang;
  entry.lastTime = new Date().toISOString();
  progress[id] = entry;
  writeProgress(progress);
  return entry;
}

function markSolved(id, lang) {
  const progress = readProgress();
  const entry = progress[id] || { solved: false, attempts: 0, lastLang: null, lastTime: null, firstSolvedTime: null };
  const now = new Date().toISOString();
  if (!entry.solved) entry.firstSolvedTime = now;
  entry.solved = true;
  entry.attempts += 1;
  entry.lastLang = lang;
  entry.lastTime = now;
  progress[id] = entry;
  writeProgress(progress);
  return entry;
}

function resetProgress() {
  writeProgress({});
}

/* ------------------------------ 代码草稿 ------------------------------ */
// 结构：{ [problemId]: { [language]: { code, input, updatedAt } } }

function readDrafts() {
  return readJsonFile(DRAFTS, {});
}

function writeDrafts(drafts) {
  writeJsonFile(DRAFTS, drafts);
}

function getDraftsForProblem(id) {
  const drafts = readDrafts();
  return drafts[String(id)] || {};
}

function getAllDrafts() {
  return readDrafts();
}

function getDraft(id, lang) {
  const perProblem = getDraftsForProblem(id);
  return perProblem[String(lang)] || null;
}

function saveDraft(id, lang, code, input) {
  const problemId = String(id);
  const language = String(lang);
  if (typeof code !== 'string') throw new Error('code 必须是字符串');
  if (code.length > MAX_CODE_LENGTH) throw new Error('代码过长，未保存');
  if (typeof input === 'string' && input.length > MAX_INPUT_LENGTH) throw new Error('输入过长，未保存');

  const drafts = readDrafts();
  const perProblem = drafts[problemId] || {};
  const prev = perProblem[language] || {};
  const entry = {
    code,
    input: typeof input === 'string' ? input : (prev.input || ''),
    updatedAt: new Date().toISOString(),
  };
  perProblem[language] = entry;
  drafts[problemId] = perProblem;
  writeDrafts(drafts);
  return entry;
}

function deleteDraft(id, lang) {
  const problemId = String(id);
  const drafts = readDrafts();
  const perProblem = drafts[problemId];
  if (!perProblem) return false;

  let removed = false;
  if (lang) {
    const language = String(lang);
    if (perProblem[language]) {
      delete perProblem[language];
      removed = true;
    }
    if (Object.keys(perProblem).length === 0) delete drafts[problemId];
  } else {
    delete drafts[problemId];
    removed = true;
  }

  if (removed) writeDrafts(drafts);
  return removed;
}

function resetDrafts() {
  writeDrafts({});
}

/* -------------------------- 通过提交记录 -------------------------- */
// 只记录「全部测试用例通过」的提交，按提交时间倒序排列，供用户在题目页翻阅。

async function getSubmissionsForProblem(id) {
  const db = await getHistoryDb();
  const query = db.prepare(`
    SELECT id, language, code, input, results, passed_count, total, solved, created_at
    FROM submissions
    WHERE problem_id = ?
    ORDER BY created_at DESC, rowid DESC
  `);
  try {
    query.bind([String(id)]);
    const rows = [];
    while (query.step()) rows.push(submissionFromRow(query.getAsObject()));
    return rows;
  } finally {
    query.free();
  }
}

async function addSubmission(id, language, code, input, results) {
  const problemId = String(id);
  const passedCount = results.filter((r) => r.passed).length;
  const total = results.length;
  const record = {
    id: `${problemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    language: String(language),
    code,
    input: typeof input === 'string' ? input : '',
    results,
    passedCount,
    total,
    solved: total > 0 && passedCount === total,
    createdAt: new Date().toISOString(),
  };
  const db = await getHistoryDb();
  db.run(`
    INSERT INTO submissions
      (id, problem_id, language, code, input, results, passed_count, total, solved, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    record.id,
    problemId,
    record.language,
    record.code,
    record.input,
    JSON.stringify(record.results),
    record.passedCount,
    record.total,
    record.solved ? 1 : 0,
    record.createdAt,
  ]);
  persistHistoryDb(db);
  return record;
}

async function deleteSubmission(id, submissionId) {
  const db = await getHistoryDb();
  db.run('DELETE FROM submissions WHERE problem_id = ? AND id = ?', [String(id), String(submissionId)]);
  const removed = db.getRowsModified() > 0;
  if (removed) persistHistoryDb(db);
  return removed;
}

async function resetSubmissions() {
  const db = await getHistoryDb();
  db.run('DELETE FROM submissions');
  persistHistoryDb(db);
}

module.exports = {
  // 进度
  getProgress,
  getProblemProgress,
  recordAttempt,
  markSolved,
  resetProgress,
  // 草稿
  getAllDrafts,
  getDraftsForProblem,
  getDraft,
  saveDraft,
  deleteDraft,
  resetDrafts,
  // 通过提交记录
  getSubmissionsForProblem,
  addSubmission,
  deleteSubmission,
  resetSubmissions,
};
