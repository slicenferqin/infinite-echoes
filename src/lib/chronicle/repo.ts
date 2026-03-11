import { db } from '../db/sqlite';
import { ChronicleEntry, ChronicleSummary } from './types';

interface ChronicleRow {
  entry_json: string;
}

export function insertChronicleEntry(entry: ChronicleEntry): void {
  db.prepare(
    `
      INSERT OR REPLACE INTO chronicle_entries (
        id, user_id, episode_id, route_id, route_type, entry_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    entry.id,
    entry.userId,
    entry.episodeId,
    entry.routeId,
    entry.routeType,
    JSON.stringify(entry),
    entry.createdAt
  );
}

export function listRecentChronicleSummaries(
  userId: string,
  limit = 5
): ChronicleSummary[] {
  const rows = db
    .prepare(
      `
        SELECT entry_json
        FROM chronicle_entries
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
    )
    .all(userId, limit) as ChronicleRow[];

  return rows.flatMap((row) => {
    try {
      const entry = JSON.parse(row.entry_json) as ChronicleEntry;
      return [
        {
          id: entry.id,
          episodeId: entry.episodeId,
          routeId: entry.routeId,
          routeType: entry.routeType,
          title: entry.title,
          createdAt: entry.createdAt,
        },
      ];
    } catch {
      return [];
    }
  });
}
