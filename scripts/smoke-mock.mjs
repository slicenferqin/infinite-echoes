import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const port = Number(process.env.SMOKE_PORT || 3111);
const baseUrl = `http://127.0.0.1:${port}`;
const nextBin = path.resolve(cwd, 'node_modules/next/dist/bin/next');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'infinite-echoes-smoke-'));
const dbPath = path.join(tempDir, 'smoke.sqlite');

let serverProcess;
let cookieJar = '';
const recentLogs = [];

function rememberLog(prefix, chunk) {
  const text = chunk.toString();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    recentLogs.push(`${prefix}${line}`);
    if (recentLogs.length > 80) recentLogs.shift();
  }
}

function updateCookies(response) {
  const cookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];

  if (cookies.length === 0) return;

  const jar = new Map();
  for (const pair of cookieJar.split(/;\s*/).filter(Boolean)) {
    const [name, ...rest] = pair.split('=');
    jar.set(name, `${name}=${rest.join('=')}`);
  }

  for (const cookie of cookies) {
    const pair = cookie.split(';')[0];
    const [name, ...rest] = pair.split('=');
    jar.set(name, `${name}=${rest.join('=')}`);
  }

  cookieJar = Array.from(jar.values()).join('; ');
}

async function requestJson(url, init = {}) {
  const headers = new Headers(init.headers || {});
  if (cookieJar) headers.set('cookie', cookieJar);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });
  updateCookies(response);
  const text = await response.text();

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { response, text, json };
}

async function requestJsonWithThrottleRetry(url, init = {}, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await requestJson(url, init);
    if (result.response.status !== 429) {
      return result;
    }

    const retryAfterMs = Number(result.json?.retryAfterMs || 1000);
    await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
  }

  return requestJson(url, init);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer(timeoutMs = 120000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const { response } = await requestJson(`${baseUrl}/api/auth/session`);
      if (response.status === 200 || response.status === 401) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Server did not become ready in time.\n${recentLogs.join('\n')}`);
}

async function runScenario() {
  const username = `smoke_${Date.now().toString(36)}`;
  const password = 'smoke-pass-123';

  const unauth = await requestJson(`${baseUrl}/api/auth/session`);
  assert(unauth.response.status === 401, `Expected 401 before auth, got ${unauth.response.status}`);

  const register = await requestJson(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  assert(register.response.ok, `Register failed: ${register.response.status} ${register.text}`);
  assert(register.json?.user?.username === username, 'Register response missing user');

  const session = await requestJson(`${baseUrl}/api/auth/session`);
  assert(session.response.ok, `Session fetch failed: ${session.response.status}`);
  assert(session.json?.user?.username === username, 'Authenticated session missing user');

  const episodes = await requestJson(`${baseUrl}/api/episodes`);
  assert(episodes.response.ok, `Episodes fetch failed: ${episodes.response.status}`);
  assert(Array.isArray(episodes.json?.episodes), 'Episodes payload missing list');
  assert(episodes.json.episodes.some((episode) => episode.id === 'ep01'), 'ep01 not visible');

  const start = await requestJson(`${baseUrl}/api/start`, {
    method: 'POST',
    body: JSON.stringify({
      playerName: 'Smoke Runner',
      episodeId: 'ep01',
      mode: 'new',
    }),
  });
  assert(start.response.ok, `Start failed: ${start.response.status} ${start.text}`);
  const sessionId = start.json?.sessionId;
  assert(typeof sessionId === 'string' && sessionId.length > 0, 'Start response missing sessionId');

  const talk = await requestJsonWithThrottleRetry(`${baseUrl}/api/action`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      action: {
        type: 'talk',
        target: 'nora',
        content: '昨夜是谁把你父亲押走的？他在地窖里现在怎么样？',
        approach: 'empathy',
      },
    }),
  });
  assert(talk.response.ok, `Talk failed: ${talk.response.status} ${talk.text}`);

  const look = await requestJsonWithThrottleRetry(`${baseUrl}/api/action`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      action: { type: 'look' },
    }),
  });
  assert(look.response.ok, `Look failed: ${look.response.status} ${look.text}`);

  const submit = await requestJson(`${baseUrl}/api/submit`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      submission:
        '我现在只能确认，汉克还没有被真正审完，村里的口风和现有表证已经先一步把他推向了定罪。',
    }),
  });
  assert(submit.response.ok, `Submit failed: ${submit.response.status} ${submit.text}`);
  assert(submit.json?.settlement?.route?.id, 'Settlement response missing route');

  console.log('smoke:mock OK');
  console.log(`- username: ${username}`);
  console.log(`- route: ${submit.json.settlement.route.id}`);
}

async function main() {
  serverProcess = spawn(process.execPath, [nextBin, 'dev', '-p', String(port)], {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      LLM_MODE: 'mock',
      LLM_API_STYLE: 'openai',
      APP_DB_PATH: dbPath,
      AUTH_COOKIE_SECURE: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => rememberLog('[next] ', chunk));
  serverProcess.stderr.on('data', (chunk) => rememberLog('[next:err] ', chunk));

  try {
    await waitForServer();
    await runScenario();
  } finally {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (serverProcess.exitCode === null) {
        serverProcess.kill('SIGKILL');
      }
    }

    for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(file)) fs.rmSync(file, { force: true });
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  if (recentLogs.length > 0) {
    console.error('\nRecent server logs:\n' + recentLogs.join('\n'));
  }
  process.exit(1);
});
