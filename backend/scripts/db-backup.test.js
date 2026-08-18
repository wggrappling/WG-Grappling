const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, writeFileSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { runBackup } = require('./db-backup');

const temporaryDirectories = [];
const fixedDate = new Date('2026-08-18T12:34:56.000Z');
const secret = 'do-not-print-this-password';

function directory() {
  const path = mkdtempSync(join(tmpdir(), 'wg-backup-test-'));
  temporaryDirectories.push(path);
  return join(path, 'nested', 'backups');
}

function environment(backupDirectory) {
  return {
    DATABASE_URL: `postgresql://backup_user:${secret}@localhost:5432/wg_test`,
    BACKUP_DIR: backupDirectory,
  };
}

function capture() {
  const output = [];
  return { output, log: (message) => output.push(message), error: (message) => output.push(message) };
}

afterEach(() => {
  for (const path of temporaryDirectories.splice(0)) rmSync(path, { recursive: true, force: true });
});

test('fails safely when required configuration is absent', () => {
  const messages = capture();
  assert.equal(runBackup({ environment: {}, ...messages }), 1);
  assert.match(messages.output.join(' '), /DATABASE_URL is required/);
});

test('rejects a backup directory inside the repository', () => {
  const messages = capture();
  const insideRepository = join(__dirname, '..', 'backups');
  assert.equal(runBackup({ environment: environment(insideRepository), ...messages }), 1);
  assert.match(messages.output.join(' '), /outside the repository/);
});

test('creates a missing backup directory and completes a simulated backup', () => {
  const backupDirectory = directory();
  const messages = capture();
  const spawn = (_command, args) => {
    writeFileSync(args.at(-1), 'simulated dump');
    return { status: 0 };
  };
  assert.equal(runBackup({ environment: environment(backupDirectory), now: fixedDate, spawn, ...messages }), 0);
  assert.equal(existsSync(join(backupDirectory, 'wg-grappling-20260818-123456.dump')), true);
});

test('removes an incomplete file and returns failure when pg_dump fails', () => {
  const backupDirectory = directory();
  const messages = capture();
  const spawn = (_command, args) => {
    writeFileSync(args.at(-1), 'incomplete');
    return { status: 1 };
  };
  assert.equal(runBackup({ environment: environment(backupDirectory), now: fixedDate, spawn, ...messages }), 1);
  assert.equal(existsSync(join(backupDirectory, 'wg-grappling-20260818-123456.dump')), false);
});

test('never overwrites a backup with the same timestamp', () => {
  const backupDirectory = directory();
  const messages = capture();
  const spawn = (_command, args) => {
    writeFileSync(args.at(-1), 'first');
    return { status: 0 };
  };
  assert.equal(runBackup({ environment: environment(backupDirectory), now: fixedDate, spawn, ...messages }), 0);
  assert.equal(runBackup({ environment: environment(backupDirectory), now: fixedDate, spawn, ...messages }), 1);
});

test('uses a timestamped unique name for different execution times', () => {
  const backupDirectory = directory();
  const messages = capture();
  const spawn = (_command, args) => {
    writeFileSync(args.at(-1), 'dump');
    return { status: 0 };
  };
  runBackup({ environment: environment(backupDirectory), now: fixedDate, spawn, ...messages });
  runBackup({ environment: environment(backupDirectory), now: new Date('2026-08-18T12:34:57.000Z'), spawn, ...messages });
  assert.equal(existsSync(join(backupDirectory, 'wg-grappling-20260818-123457.dump')), true);
});

test('does not expose the password in output or pg_dump arguments', () => {
  const backupDirectory = directory();
  const messages = capture();
  let argumentsUsed = [];
  const spawn = (_command, args) => {
    argumentsUsed = args;
    writeFileSync(args.at(-1), 'dump');
    return { status: 0 };
  };
  runBackup({ environment: environment(backupDirectory), now: fixedDate, spawn, ...messages });
  assert.doesNotMatch(messages.output.join(' '), new RegExp(secret));
  assert.doesNotMatch(argumentsUsed.join(' '), new RegExp(secret));
});
