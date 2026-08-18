const { existsSync, mkdirSync, rmSync } = require('node:fs');
const { resolve, sep } = require('node:path');
const { spawnSync } = require('node:child_process');

function timestamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
}

function postgresEnvironment(databaseUrl, environment) {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2) {
    throw new Error('DATABASE_URL must identify a PostgreSQL host, user and database.');
  }

  const { DATABASE_URL: _databaseUrl, ...childEnvironment } = environment;
  return {
    ...childEnvironment,
    PGHOST: decodeURIComponent(url.hostname),
    PGPORT: url.port || '5432',
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    ...(url.searchParams.get('sslmode') ? { PGSSLMODE: url.searchParams.get('sslmode') } : {}),
  };
}

function runBackup(options = {}) {
  const environment = options.environment ?? process.env;
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;
  const spawn = options.spawn ?? spawnSync;
  const now = options.now ?? new Date();

  if (!environment.DATABASE_URL) {
    error('Backup failed: DATABASE_URL is required.');
    return 1;
  }
  if (!environment.BACKUP_DIR) {
    error('Backup failed: BACKUP_DIR is required and should point outside the repository.');
    return 1;
  }

  let pgEnvironment;
  try {
    pgEnvironment = postgresEnvironment(environment.DATABASE_URL, environment);
  } catch (failure) {
    error(`Backup failed: ${failure.message}`);
    return 1;
  }

  const directory = resolve(environment.BACKUP_DIR);
  const repositoryRoot = resolve(__dirname, '..', '..');
  if (directory === repositoryRoot || directory.startsWith(`${repositoryRoot}${sep}`)) {
    error('Backup failed: BACKUP_DIR must be outside the repository.');
    return 1;
  }
  mkdirSync(directory, { recursive: true });
  const destination = resolve(directory, `wg-grappling-${timestamp(now)}.dump`);
  if (existsSync(destination)) {
    error('Backup failed: the timestamped destination already exists.');
    return 1;
  }

  const result = spawn('pg_dump', [
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--file',
    destination,
  ], { env: pgEnvironment, encoding: 'utf8', windowsHide: true });

  if (result.error || result.status !== 0) {
    if (existsSync(destination)) rmSync(destination, { force: true });
    error('Backup failed: pg_dump did not complete successfully.');
    return 1;
  }

  log(`Backup created: ${destination}`);
  return 0;
}

if (require.main === module) process.exitCode = runBackup();

module.exports = { postgresEnvironment, runBackup, timestamp };
