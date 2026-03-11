import { db } from '../db/sqlite';
import { WorldEventLog } from './types';

interface WorldEventRow {
  event_json: string;
}

function ensureWorldEventLogSchema(): void {
  const columns = db
    .prepare('PRAGMA table_info(world_event_logs)')
    .all() as Array<{ name: string }>;

  const hasSessionId = columns.some((column) => column.name === 'session_id');
  if (!hasSessionId) {
    db.exec(`ALTER TABLE world_event_logs ADD COLUMN session_id TEXT NOT NULL DEFAULT ''`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_world_event_logs_session ON world_event_logs(session_id, created_at DESC)`);
  }
}

export function insertWorldEvents(events: WorldEventLog[]): void {
  if (events.length === 0) return;
  ensureWorldEventLogSchema();

  const statement = db.prepare(
    `
      INSERT OR REPLACE INTO world_event_logs (id, user_id, session_id, episode_id, event_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
  );

  const transaction = db.transaction((items: WorldEventLog[]) => {
    for (const event of items) {
      statement.run(
        event.id,
        event.userId,
        event.sessionId,
        event.episodeId,
        JSON.stringify(event),
        event.createdAt
      );
    }
  });

  transaction(events);
}

export function listRecentWorldEvents(
  userId: string,
  sessionId: string,
  episodeId: string,
  limit = 10
): WorldEventLog[] {
  ensureWorldEventLogSchema();

  const rows = db
    .prepare(
      `
        SELECT event_json
        FROM world_event_logs
        WHERE user_id = ?
          AND session_id = ?
          AND episode_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
    )
    .all(userId, sessionId, episodeId, limit) as WorldEventRow[];

  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.event_json) as WorldEventLog];
    } catch {
      return [];
    }
  });
}
