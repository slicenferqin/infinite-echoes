import { db } from '../db/sqlite';
import { createDefaultNpcMemoryState, MAX_NPC_MEMORY_ENTRIES } from './defaults';
import {
  AppendNpcMemoryEntryInput,
  NpcMemoryEntry,
  NpcMemoryState,
} from './types';

interface NpcMemoryRow {
  id: string;
  state_json: string;
  updated_at: number;
}

function cloneState<T>(input: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(input);
  }
  return JSON.parse(JSON.stringify(input)) as T;
}

function makeScopeId(userId: string, episodeId: string, ownerNpcId: string): string {
  return `${userId}:${episodeId}:${ownerNpcId}`;
}

function parseState(raw: string): NpcMemoryState | null {
  try {
    return JSON.parse(raw) as NpcMemoryState;
  } catch {
    return null;
  }
}

function normalizeEntry(ownerNpcId: string, episodeId: string, entry: NpcMemoryEntry): NpcMemoryEntry {
  return {
    ...entry,
    ownerNpcId,
    episodeId,
    topicTags: Array.isArray(entry.topicTags) ? Array.from(new Set(entry.topicTags.filter(Boolean))) : [],
    weight: Number.isFinite(entry.weight) ? Math.max(1, Math.min(10, Math.round(entry.weight))) : 5,
    confidence: Number.isFinite(entry.confidence) ? Math.max(0.1, Math.min(1, entry.confidence)) : 0.7,
    createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now(),
  };
}

function summarizeEntries(entries: NpcMemoryEntry[]): string {
  if (entries.length === 0) return '';

  return entries
    .slice()
    .sort((left, right) => {
      if (right.weight !== left.weight) return right.weight - left.weight;
      return right.createdAt - left.createdAt;
    })
    .slice(0, 5)
    .map((entry) => entry.summary)
    .join('；');
}

function normalizeState(ownerNpcId: string, state?: NpcMemoryState | null): NpcMemoryState {
  const fallback = createDefaultNpcMemoryState(ownerNpcId);
  if (!state) return fallback;

  const entries = Array.isArray(state.entries)
    ? state.entries
        .map((entry) => normalizeEntry(ownerNpcId, entry.episodeId, entry))
        .sort((left, right) => left.createdAt - right.createdAt)
    : [];

  return {
    ownerNpcId,
    entries,
    summary: typeof state.summary === 'string' ? state.summary : summarizeEntries(entries),
    lastUpdatedAt: Number.isFinite(state.lastUpdatedAt) ? state.lastUpdatedAt : Date.now(),
  };
}

export function getNpcMemoryState(
  userId: string,
  episodeId: string,
  ownerNpcId: string
): NpcMemoryState {
  const row = db
    .prepare(
      `
        SELECT id, state_json, updated_at
        FROM npc_memories
        WHERE user_id = ?
          AND episode_id = ?
          AND owner_npc_id = ?
        LIMIT 1
      `
    )
    .get(userId, episodeId, ownerNpcId) as NpcMemoryRow | undefined;

  if (!row) {
    const initial = createDefaultNpcMemoryState(ownerNpcId);
    upsertNpcMemoryState(userId, episodeId, ownerNpcId, initial);
    return initial;
  }

  const parsed = parseState(row.state_json);
  const normalized = normalizeState(ownerNpcId, parsed);

  if (!parsed) {
    upsertNpcMemoryState(userId, episodeId, ownerNpcId, normalized);
  }

  return normalized;
}

export function upsertNpcMemoryState(
  userId: string,
  episodeId: string,
  ownerNpcId: string,
  state: NpcMemoryState
): NpcMemoryState {
  const normalized = normalizeState(ownerNpcId, state);
  const updatedAt = Date.now();
  const nextState: NpcMemoryState = {
    ...normalized,
    summary: summarizeEntries(normalized.entries),
    lastUpdatedAt: updatedAt,
  };

  db.prepare(
    `
      INSERT INTO npc_memories (id, user_id, episode_id, owner_npc_id, state_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id)
      DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = excluded.updated_at
    `
  ).run(
    makeScopeId(userId, episodeId, ownerNpcId),
    userId,
    episodeId,
    ownerNpcId,
    JSON.stringify(nextState),
    updatedAt
  );

  return cloneState(nextState);
}

export function appendNpcMemoryEntry(params: {
  userId: string;
  episodeId: string;
  ownerNpcId: string;
  entry: AppendNpcMemoryEntryInput;
}): NpcMemoryState {
  const current = getNpcMemoryState(params.userId, params.episodeId, params.ownerNpcId);
  const now = Date.now();

  const recentDuplicate = [...current.entries]
    .reverse()
    .find(
      (entry) =>
        entry.kind === params.entry.kind &&
        entry.summary === params.entry.summary &&
        now - entry.createdAt < 10 * 60 * 1000
    );

  if (recentDuplicate) {
    return current;
  }

  const nextEntry: NpcMemoryEntry = {
    id: crypto.randomUUID(),
    ownerNpcId: params.ownerNpcId,
    kind: params.entry.kind,
    aboutNpcId: params.entry.aboutNpcId,
    aboutPlayer: params.entry.aboutPlayer,
    episodeId: params.episodeId,
    locationId: params.entry.locationId,
    summary: params.entry.summary.trim(),
    emotionTag: params.entry.emotionTag.trim() || 'neutral',
    topicTags: Array.from(new Set((params.entry.topicTags ?? []).filter(Boolean))),
    weight: Math.max(1, Math.min(10, Math.round(params.entry.weight ?? 5))),
    confidence: Math.max(0.1, Math.min(1, params.entry.confidence ?? 0.7)),
    visibility: params.entry.visibility ?? 'private',
    createdAt: now,
  };

  const entries = [...current.entries, nextEntry]
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(-MAX_NPC_MEMORY_ENTRIES);

  return upsertNpcMemoryState(params.userId, params.episodeId, params.ownerNpcId, {
    ...current,
    entries,
    lastUpdatedAt: now,
  });
}
