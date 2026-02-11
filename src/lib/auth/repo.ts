import { randomUUID } from 'node:crypto';
import { db } from '../db/sqlite';

export interface AuthUser {
  id: string;
  username: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
  lastSeenAt: number;
}

export interface AuthSessionWithUser {
  session: AuthSessionRecord;
  user: AuthUser;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
}

interface SessionRow {
  session_id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  created_at: number;
  last_seen_at: number;
  user_name: string;
  user_created_at: number;
  user_updated_at: number;
}

function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function findUserByUsername(username: string): (AuthUser & { passwordHash: string }) | null {
  const row = db
    .prepare('SELECT id, username, password_hash, created_at, updated_at FROM users WHERE username = ?')
    .get(username) as UserRow | undefined;

  if (!row) return null;

  return {
    ...mapUser(row),
    passwordHash: row.password_hash,
  };
}

export function findUserById(userId: string): AuthUser | null {
  const row = db
    .prepare('SELECT id, username, password_hash, created_at, updated_at FROM users WHERE id = ?')
    .get(userId) as UserRow | undefined;

  if (!row) return null;

  return mapUser(row);
}

export function createUser(username: string, passwordHash: string): AuthUser {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(
    `
      INSERT INTO users (id, username, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(id, username, passwordHash, now, now);

  return {
    id,
    username,
    createdAt: now,
    updatedAt: now,
  };
}

export function createAuthSession(userId: string, tokenHash: string, expiresAt: number): AuthSessionRecord {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(
    `
      INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(id, userId, tokenHash, expiresAt, now, now);

  return {
    id,
    userId,
    tokenHash,
    expiresAt,
    createdAt: now,
    lastSeenAt: now,
  };
}

export function findAuthSessionByTokenHash(tokenHash: string): AuthSessionWithUser | null {
  const now = Date.now();

  db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(now);

  const row = db
    .prepare(
      `
        SELECT
          s.id AS session_id,
          s.user_id,
          s.token_hash,
          s.expires_at,
          s.created_at,
          s.last_seen_at,
          u.username AS user_name,
          u.created_at AS user_created_at,
          u.updated_at AS user_updated_at
        FROM auth_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
          AND s.expires_at > ?
        LIMIT 1
      `
    )
    .get(tokenHash, now) as SessionRow | undefined;

  if (!row) return null;

  return {
    session: {
      id: row.session_id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
    },
    user: {
      id: row.user_id,
      username: row.user_name,
      createdAt: row.user_created_at,
      updatedAt: row.user_updated_at,
    },
  };
}

export function touchAuthSession(sessionId: string): void {
  db.prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?').run(Date.now(), sessionId);
}

export function deleteAuthSessionByTokenHash(tokenHash: string): void {
  db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(tokenHash);
}
