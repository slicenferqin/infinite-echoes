import { db } from '../db/sqlite';
import { createDefaultProgress, EpisodeProgress, normalizeProgress } from '../progression';
import { RouteDefinition } from '../types';

interface UserProgressRow {
  unlocked_json: string;
  passed_json: string;
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
}

export function getUserProgress(userId: string): EpisodeProgress {
  const row = db
    .prepare('SELECT unlocked_json, passed_json FROM user_progress WHERE user_id = ?')
    .get(userId) as UserProgressRow | undefined;

  if (!row) {
    const initial = createDefaultProgress();
    upsertUserProgress(userId, initial);
    return initial;
  }

  return normalizeProgress({
    unlockedEpisodes: parseJsonArray(row.unlocked_json),
    passedEpisodes: parseJsonArray(row.passed_json),
  });
}

export function upsertUserProgress(userId: string, progress: EpisodeProgress): EpisodeProgress {
  const normalized = normalizeProgress(progress);
  const now = Date.now();

  db.prepare(
    `
      INSERT INTO user_progress (user_id, unlocked_json, passed_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id)
      DO UPDATE SET
        unlocked_json = excluded.unlocked_json,
        passed_json = excluded.passed_json,
        updated_at = excluded.updated_at
    `
  ).run(
    userId,
    JSON.stringify(normalized.unlockedEpisodes),
    JSON.stringify(normalized.passedEpisodes),
    now
  );

  return normalized;
}

export function ensureUserProgress(userId: string): EpisodeProgress {
  return getUserProgress(userId);
}

export function recordEpisodeOutcome(params: {
  userId: string;
  episodeId: string;
  routeId: string;
  routeType: RouteDefinition['type'];
  grade: string;
  truthScore: number;
}): void {
  db.prepare(
    `
      INSERT INTO episode_outcomes (
        user_id,
        episode_id,
        route_id,
        route_type,
        grade,
        truth_score,
        settled_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    params.userId,
    params.episodeId,
    params.routeId,
    params.routeType,
    params.grade,
    params.truthScore,
    Date.now()
  );
}
