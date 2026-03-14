import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const targetEnvFile = process.argv[2] || '.env.local';
const envPath = path.resolve(cwd, targetEnvFile);

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { values: {}, exists: false };
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

  return { values, exists: true };
}

function valueFrom(envFileValues, key) {
  const shellValue = process.env[key];
  if (typeof shellValue === 'string' && shellValue.trim().length > 0) {
    return shellValue.trim();
  }
  return (envFileValues[key] ?? '').trim();
}

function resolveMode(values) {
  const explicit = valueFrom(values, 'LLM_MODE').toLowerCase();
  const baseURL = valueFrom(values, 'LLM_BASE_URL');
  const apiKey = valueFrom(values, 'LLM_API_KEY');
  const model = valueFrom(values, 'LLM_MODEL');
  const hasLiveHints = Boolean(baseURL || apiKey || model);

  if (explicit === 'live') return 'live';
  if (explicit === 'mock') return 'mock';
  return hasLiveHints ? 'live' : 'mock';
}

const { values, exists } = parseEnvFile(envPath);
const issues = [];
const warnings = [];
const notes = [];

if (!exists) {
  issues.push(`未找到环境文件：${targetEnvFile}`);
  notes.push('先执行：cp .env.local.example .env.local');
}

const llmMode = resolveMode(values);
const llmBaseUrl = valueFrom(values, 'LLM_BASE_URL');
const llmApiKey = valueFrom(values, 'LLM_API_KEY');
const llmModel = valueFrom(values, 'LLM_MODEL');
const dbPathValue = valueFrom(values, 'APP_DB_PATH') || './data/dev.sqlite';
const dbPath = path.resolve(cwd, dbPathValue);
const dbDir = path.dirname(dbPath);
const authCookieSecure = valueFrom(values, 'AUTH_COOKIE_SECURE') || 'false';

if (llmMode === 'live') {
  if (!llmBaseUrl) issues.push('LLM_MODE=live 但缺少 LLM_BASE_URL');
  if (!llmApiKey) issues.push('LLM_MODE=live 但缺少 LLM_API_KEY');
  if (!llmModel) issues.push('LLM_MODE=live 但缺少 LLM_MODEL');
} else {
  notes.push('当前使用 mock 模式：适合本地联调和贡献者上手，不适合正式体验评估。');
}

if (!fs.existsSync(dbDir)) {
  notes.push(`数据库目录不存在，但运行时会自动创建：${dbDir}`);
}

if (!['true', 'false'].includes(authCookieSecure)) {
  warnings.push(`AUTH_COOKIE_SECURE 建议显式设置为 true/false，当前值：${authCookieSecure}`);
}

console.log('Infinite Echoes contributor doctor');
console.log(`- env file: ${targetEnvFile}${exists ? '' : ' (missing)'}`);
console.log(`- llm mode: ${llmMode}`);
console.log(`- db path: ${dbPath}`);
console.log(`- auth cookie secure: ${authCookieSecure}`);

if (issues.length > 0) {
  console.log('\nIssues');
  for (const issue of issues) {
    console.log(`- ${issue}`);
  }
}

if (warnings.length > 0) {
  console.log('\nWarnings');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (notes.length > 0) {
  console.log('\nNotes');
  for (const note of notes) {
    console.log(`- ${note}`);
  }
}

if (issues.length === 0) {
  console.log('\nStatus: OK');
  process.exit(0);
}

console.log('\nStatus: BLOCKED');
process.exit(1);
