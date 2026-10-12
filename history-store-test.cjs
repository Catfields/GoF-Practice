const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

async function run() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'online-practice-sqlite-'));
  process.env.DP_DATA_DIR = dataDir;

  try {
    const legacyRecord = {
      id: 'legacy-submission',
      language: 'python',
      code: 'print(1)',
      input: '',
      results: [{ index: 0, passed: true }],
      passedCount: 1,
      total: 1,
      solved: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    fs.writeFileSync(
      path.join(dataDir, 'submissions.json'),
      JSON.stringify({ 'legacy-problem': [legacyRecord] }),
      'utf8',
    );

    const store = require('./src/store');
    const migrated = await store.getSubmissionsForProblem('legacy-problem');
    assert.deepStrictEqual(migrated, [legacyRecord], 'imports existing JSON submission history');

    const added = await store.addSubmission('legacy-problem', 'javascript', 'console.log(2)', '', [
      { index: 0, passed: true },
    ]);
    const submissions = await store.getSubmissionsForProblem('legacy-problem');
    assert.strictEqual(submissions.length, 2, 'stores new records in SQLite');
    assert.strictEqual(submissions[0].id, added.id, 'returns records newest first');
    assert.deepStrictEqual(submissions[0].results, [{ index: 0, passed: true }], 'persists test results');

    const databasePath = path.join(dataDir, 'history.sqlite');
    assert.strictEqual(fs.readFileSync(databasePath).subarray(0, 16).toString(), 'SQLite format 3\u0000');

    fs.writeFileSync(
      path.join(dataDir, 'submissions.json'),
      JSON.stringify({ 'late-problem': [{ ...legacyRecord, id: 'late-legacy-submission' }] }),
      'utf8',
    );
    const reopened = JSON.parse(execFileSync(process.execPath, ['-e', `
      const store = require('./src/store');
      store.getSubmissionsForProblem('legacy-problem').then((rows) => {
        process.stdout.write(JSON.stringify(rows.map((row) => row.id)));
      }).catch((error) => { console.error(error); process.exit(1); });
    `], {
      cwd: __dirname,
      env: { ...process.env, DP_DATA_DIR: dataDir },
      encoding: 'utf8',
    }));
    assert.strictEqual(reopened.length, 2, 'persists data across process restarts');
    assert.ok(!reopened.includes('late-legacy-submission'), 'does not re-import legacy JSON on later starts');

    assert.strictEqual(await store.deleteSubmission('legacy-problem', added.id), true);
    assert.strictEqual(await store.deleteSubmission('legacy-problem', added.id), false);
    assert.strictEqual((await store.getSubmissionsForProblem('legacy-problem')).length, 1);
    console.log('SQLite submission history tests passed');
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
