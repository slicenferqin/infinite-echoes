import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const argv = process.argv.slice(2);
const args = new Set(argv);
const envIndex = argv.indexOf('--env');
const envFile = envIndex >= 0 ? argv[envIndex + 1] : '.env.local';

function parseEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex < 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    values[key] = value;
  }

  return values;
}

function valueFrom(envValues, key) {
  const shellValue = process.env[key];
  if (typeof shellValue === 'string' && shellValue.trim().length > 0) {
    return shellValue.trim();
  }
  return (envValues[key] ?? '').trim();
}

const envPath = path.resolve(cwd, envFile);
const envValues = parseEnvFile(envPath);
const dbValue = valueFrom(envValues, 'APP_DB_PATH') || './data/dev.sqlite';
const dbPath = path.resolve(cwd, dbValue);
const dbBase = path.basename(dbPath);
const allowReset =
  dbBase.includes('dev.sqlite') ||
  dbBase.includes('smoke.sqlite') ||
  dbPath.startsWith(path.resolve(cwd, 'data'));

if (!allowReset && !args.has('--force')) {
  console.error(`Refusing to reset non-local database without --force: ${dbPath}`);
  console.error('Use --force only when you are certain this is not a shared or production database.');
  process.exit(1);
}

let removed = 0;
for (const target of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { force: true });
    removed += 1;
    console.log(`removed ${target}`);
  }
}

if (removed === 0) {
  console.log(`no database files found for ${dbPath}`);
} else {
  console.log(`reset complete for ${dbPath}`);
}
