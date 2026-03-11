import { db } from '../db/sqlite';
import { ArtifactDocument, ArtifactSummary } from './types';

interface ArtifactRow {
  id: string;
  episode_id: string;
  route_id: string;
  kind: string;
  title: string;
  body: string;
  meta_json: string;
  created_at: number;
}

export function insertArtifacts(documents: ArtifactDocument[]): void {
  if (documents.length === 0) return;

  const statement = db.prepare(
    `
      INSERT OR REPLACE INTO artifact_documents (
        id, user_id, episode_id, route_id, kind, title, body, meta_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  );

  const transaction = db.transaction((items: ArtifactDocument[]) => {
    for (const document of items) {
      statement.run(
        document.id,
        document.userId,
        document.episodeId,
        document.routeId,
        document.kind,
        document.title,
        document.body,
        JSON.stringify(document.meta),
        document.createdAt
      );
    }
  });

  transaction(documents);
}

export function listRecentArtifactSummaries(userId: string, limit = 6): ArtifactSummary[] {
  const rows = db
    .prepare(
      `
        SELECT id, episode_id, route_id, kind, title, created_at
        FROM artifact_documents
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
    )
    .all(userId, limit) as Array<{
      id: string;
      episode_id: string;
      route_id: string;
      kind: string;
      title: string;
      created_at: number;
    }>;

  return rows.map((row) => ({
    id: row.id,
    episodeId: row.episode_id,
    routeId: row.route_id,
    kind: row.kind as ArtifactSummary['kind'],
    title: row.title,
    createdAt: row.created_at,
  }));
}

export function listArtifactsByRoute(
  userId: string,
  episodeId: string,
  routeId: string
): ArtifactDocument[] {
  const rows = db
    .prepare(
      `
        SELECT id, episode_id, route_id, kind, title, body, meta_json, created_at
        FROM artifact_documents
        WHERE user_id = ?
          AND episode_id = ?
          AND route_id = ?
        ORDER BY created_at ASC
      `
    )
    .all(userId, episodeId, routeId) as ArtifactRow[];

  return rows.map((row) => ({
    id: row.id,
    userId,
    episodeId: row.episode_id,
    routeId: row.route_id,
    kind: row.kind as ArtifactDocument['kind'],
    title: row.title,
    body: row.body,
    meta: (() => {
      try {
        return JSON.parse(row.meta_json) as Record<string, unknown>;
      } catch {
        return {};
      }
    })(),
    createdAt: row.created_at,
  }));
}
