import { ActiveSessionMeta, GameState, SessionStore } from '../types';
import { db } from '../db/sqlite';

interface SessionRow {
  session_id: string;
  user_id: string;
  episode_id: string;
  state_json: string;
  phase: GameState['phase'];
  round: number;
  expires_at: number;
  updated_at: number;
  is_active: number;
}

function cloneState<T>(input: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(input);
  }
  return JSON.parse(JSON.stringify(input)) as T;
}

function safeParseState(raw: string): GameState | null {
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

function toActiveMeta(row: SessionRow): ActiveSessionMeta {
  return {
    sessionId: row.session_id,
    episodeId: row.episode_id,
    round: row.round,
    phase: row.phase,
    updatedAt: row.updated_at,
  };
}

export class SqliteSessionStore implements SessionStore {
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs = 2 * 60 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  create(state: GameState, ttlMs?: number): string {
    const sessionId = state.sessionId;
    this.set(sessionId, state, ttlMs);
    return sessionId;
  }

  get(sessionId: string): GameState | null {
    this.gc();

    const row = db
      .prepare(
        `
          SELECT session_id, user_id, episode_id, state_json, phase, round, expires_at, updated_at, is_active
          FROM game_sessions
          WHERE session_id = ?
          LIMIT 1
        `
      )
      .get(sessionId) as SessionRow | undefined;

    if (!row) return null;

    if (row.expires_at <= Date.now()) {
      db.prepare('UPDATE game_sessions SET is_active = 0 WHERE session_id = ?').run(sessionId);
      return null;
    }

    const state = safeParseState(row.state_json);
    if (!state) {
      db.prepare('DELETE FROM game_sessions WHERE session_id = ?').run(sessionId);
      return null;
    }

    return cloneState(state);
  }

  set(sessionId: string, state: GameState, ttlMs?: number): void {
    const now = Date.now();
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const expiresAt = now + effectiveTtl;
    const isActive = state.phase === 'settlement' ? 0 : 1;

    if (isActive === 1) {
      db.prepare(
        `
          UPDATE game_sessions
          SET is_active = 0
          WHERE user_id = ?
            AND session_id <> ?
            AND is_active = 1
        `
      ).run(state.ownerUserId, sessionId);
    }

    db.prepare(
      `
        INSERT INTO game_sessions (
          session_id,
          user_id,
          episode_id,
          state_json,
          phase,
          round,
          expires_at,
          updated_at,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id)
        DO UPDATE SET
          user_id = excluded.user_id,
          episode_id = excluded.episode_id,
          state_json = excluded.state_json,
          phase = excluded.phase,
          round = excluded.round,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at,
          is_active = excluded.is_active
      `
    ).run(
      sessionId,
      state.ownerUserId,
      state.episodeId,
      JSON.stringify(state),
      state.phase,
      state.round,
      expiresAt,
      now,
      isActive
    );
  }

  delete(sessionId: string): void {
    db.prepare('DELETE FROM game_sessions WHERE session_id = ?').run(sessionId);
  }

  listSessionIds(): string[] {
    this.gc();

    const rows = db
      .prepare(
        `
          SELECT session_id
          FROM game_sessions
          WHERE expires_at > ?
          ORDER BY updated_at DESC
        `
      )
      .all(Date.now()) as Array<{ session_id: string }>;

    return rows.map((row) => row.session_id);
  }

  getActiveSession(userId: string): GameState | null {
    this.gc();

    const row = db
      .prepare(
        `
          SELECT session_id, user_id, episode_id, state_json, phase, round, expires_at, updated_at, is_active
          FROM game_sessions
          WHERE user_id = ?
            AND is_active = 1
          ORDER BY updated_at DESC
          LIMIT 1
        `
      )
      .get(userId) as SessionRow | undefined;

    if (!row) return null;

    if (row.expires_at <= Date.now()) {
      db.prepare('UPDATE game_sessions SET is_active = 0 WHERE session_id = ?').run(row.session_id);
      return null;
    }

    const state = safeParseState(row.state_json);
    if (!state) {
      db.prepare('DELETE FROM game_sessions WHERE session_id = ?').run(row.session_id);
      return null;
    }

    if (state.phase === 'settlement') {
      db.prepare('UPDATE game_sessions SET is_active = 0 WHERE session_id = ?').run(row.session_id);
      return null;
    }

    return cloneState(state);
  }

  getActiveSessionMeta(userId: string): ActiveSessionMeta | null {
    this.gc();

    const row = db
      .prepare(
        `
          SELECT session_id, user_id, episode_id, state_json, phase, round, expires_at, updated_at, is_active
          FROM game_sessions
          WHERE user_id = ?
            AND is_active = 1
          ORDER BY updated_at DESC
          LIMIT 1
        `
      )
      .get(userId) as SessionRow | undefined;

    if (!row) return null;
    if (row.expires_at <= Date.now() || row.phase === 'settlement') {
      db.prepare('UPDATE game_sessions SET is_active = 0 WHERE session_id = ?').run(row.session_id);
      return null;
    }

    return toActiveMeta(row);
  }

  setSessionActive(sessionId: string, isActive: boolean): void {
    const row = db
      .prepare('SELECT user_id FROM game_sessions WHERE session_id = ? LIMIT 1')
      .get(sessionId) as { user_id: string } | undefined;

    if (!row) return;

    if (isActive) {
      db.prepare(
        `
          UPDATE game_sessions
          SET is_active = 0
          WHERE user_id = ?
            AND session_id <> ?
            AND is_active = 1
        `
      ).run(row.user_id, sessionId);
    }

    db.prepare('UPDATE game_sessions SET is_active = ? WHERE session_id = ?').run(isActive ? 1 : 0, sessionId);
  }

  getSessionDebug(sessionId: string): {
    state: GameState;
    expiresAt: number;
    updatedAt: number;
    ttlMs: number;
  } | null {
    this.gc();

    const row = db
      .prepare(
        `
          SELECT session_id, user_id, episode_id, state_json, phase, round, expires_at, updated_at, is_active
          FROM game_sessions
          WHERE session_id = ?
          LIMIT 1
        `
      )
      .get(sessionId) as SessionRow | undefined;

    if (!row) return null;

    const state = safeParseState(row.state_json);
    if (!state) return null;

    return {
      state: cloneState(state),
      expiresAt: row.expires_at,
      updatedAt: row.updated_at,
      ttlMs: Math.max(0, row.expires_at - Date.now()),
    };
  }

  private gc(): void {
    const now = Date.now();

    db.prepare('UPDATE game_sessions SET is_active = 0 WHERE expires_at <= ? AND is_active = 1').run(now);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    db.prepare('DELETE FROM game_sessions WHERE expires_at <= ?').run(now - sevenDaysMs);
  }
}

const globalStore = globalThis as unknown as {
  __infiniteEchoesSessionStore?: SqliteSessionStore;
};

export const sessionStore =
  globalStore.__infiniteEchoesSessionStore ??
  (globalStore.__infiniteEchoesSessionStore = new SqliteSessionStore());

export const ACTIVE_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
export const SETTLEMENT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
