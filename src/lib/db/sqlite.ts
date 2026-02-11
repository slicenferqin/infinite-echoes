import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const DEFAULT_DB_PATH = process.cwd().startsWith('/root/apps/infinite-echoes/app')
  ? '/root/apps/infinite-echoes/data/main.sqlite'
  : path.resolve(process.cwd(), 'data/dev.sqlite');

export const appDbPath = process.env.APP_DB_PATH?.trim() || DEFAULT_DB_PATH;

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT PRIMARY KEY,
      unlocked_json TEXT NOT NULL,
      passed_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      episode_id TEXT NOT NULL,
      state_json TEXT NOT NULL,
      phase TEXT NOT NULL,
      round INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_expires_at ON game_sessions(expires_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_game_sessions_active_user
      ON game_sessions(user_id)
      WHERE is_active = 1;

    CREATE TABLE IF NOT EXISTS episode_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      episode_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      route_type TEXT NOT NULL,
      grade TEXT,
      truth_score INTEGER,
      settled_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_episode_outcomes_user_episode
      ON episode_outcomes(user_id, episode_id);
  `);
}

const globalDbHolder = globalThis as unknown as {
  __infiniteEchoesDb?: Database.Database;
};

function createDb(): Database.Database {
  ensureParentDir(appDbPath);
  const database = new Database(appDbPath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  initSchema(database);
  return database;
}

export const db = globalDbHolder.__infiniteEchoesDb ?? (globalDbHolder.__infiniteEchoesDb = createDb());
