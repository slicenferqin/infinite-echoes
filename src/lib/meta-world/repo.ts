import { db } from '../db/sqlite';
import {
  MetaWorldState,
  MetaWorldNpcDetail,
  MetaWorldAnomalyDetail,
  MetaWorldCognitionDetail,
  MetaWorldArchiveDetail,
  MetaWorldSummary,
  MetaWorldSummaryItem,
} from '../types';
import { createDefaultMetaWorldState } from './defaults';

interface MetaWorldRow {
  state_json: string;
  updated_at: number;
}

const NPC_LABELS: Record<string, string> = {
  aji: '阿寂',
  linlu: '林鹿',
  laozhao: '老赵',
  hooded_figure: '兜帽人',
};

const ANOMALY_LABELS: Record<string, string> = {
  pillar_emotion_resonance: '回响柱情绪共鸣',
  record_rewrite_noise: '记录改写异响',
  public_private_record_split: '公开版与隐藏版分裂',
  silent_seventh_pillar: '第七柱沉默异常',
  vanished_returnees: '离开者失踪异常',
};

const COGNITION_LABELS: Record<string, string> = {
  understands_pillars_feed_on_emotion: '意识到情绪会被回响柱响应',
  doubts_revival_promise: '开始怀疑复活承诺',
  recognizes_records_are_rewritten: '注意到记录可能被改写',
  understands_public_vs_hidden_versions: '理解公开版与隐藏版并存',
  suspects_maintainer_layer_exists: '怀疑存在回响维护层',
};

function cloneState<T>(input: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(input);
  }
  return JSON.parse(JSON.stringify(input)) as T;
}

function parseState(raw: string): MetaWorldState | null {
  try {
    return JSON.parse(raw) as MetaWorldState;
  } catch {
    return null;
  }
}

function normalizeMetaWorldState(state: MetaWorldState, userId: string): MetaWorldState {
  const fallback = createDefaultMetaWorldState(userId);

  return {
    ...fallback,
    ...state,
    userId,
    worldFlags: state.worldFlags ?? fallback.worldFlags,
    unlockedHubAreas:
      Array.isArray(state.unlockedHubAreas) && state.unlockedHubAreas.length > 0
        ? state.unlockedHubAreas
        : fallback.unlockedHubAreas,
    persistentNpcStates: {
      ...fallback.persistentNpcStates,
      ...(state.persistentNpcStates ?? {}),
    },
    archive: {
      entries: Array.isArray(state.archive?.entries) ? state.archive.entries : [],
      unlockedEpisodeIds: Array.isArray(state.archive?.unlockedEpisodeIds)
        ? state.archive.unlockedEpisodeIds
        : [],
    },
    anomalies: {
      tracks: state.anomalies?.tracks ?? {},
    },
    cognition: {
      nodes: {
        ...fallback.cognition.nodes,
        ...(state.cognition?.nodes ?? {}),
      },
    },
  };
}

export function getMetaWorldState(userId: string): MetaWorldState {
  const row = db
    .prepare('SELECT state_json, updated_at FROM meta_world_states WHERE user_id = ?')
    .get(userId) as MetaWorldRow | undefined;

  if (!row) {
    const initial = createDefaultMetaWorldState(userId);
    upsertMetaWorldState(initial);
    return initial;
  }

  const parsed = parseState(row.state_json);
  if (!parsed) {
    const fallback = createDefaultMetaWorldState(userId);
    upsertMetaWorldState(fallback);
    return fallback;
  }

  return normalizeMetaWorldState(parsed, userId);
}

export function upsertMetaWorldState(state: MetaWorldState): MetaWorldState {
  const normalized = normalizeMetaWorldState(state, state.userId);
  const updatedAt = Date.now();
  const nextState: MetaWorldState = {
    ...normalized,
    updatedAt,
  };

  db.prepare(
    `
      INSERT INTO meta_world_states (user_id, state_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id)
      DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = excluded.updated_at
    `
  ).run(nextState.userId, JSON.stringify(nextState), updatedAt);

  return nextState;
}

function topItems<T extends MetaWorldSummaryItem>(
  items: T[],
  limit = 3
): T[] {
  return items.slice(0, limit);
}

export function buildMetaWorldSummary(state: MetaWorldState): MetaWorldSummary {
  const npcRelations = topItems(
    Object.values(state.persistentNpcStates)
      .map((entry) => ({
        id: entry.npcId,
        label: NPC_LABELS[entry.npcId] ?? entry.npcId,
        trust: entry.trust,
        suspicion: entry.suspicion,
      }))
      .sort((left, right) => right.trust - left.trust || left.suspicion - right.suspicion)
  );

  const anomalyHighlights = topItems(
    Object.values(state.anomalies.tracks)
      .filter((track) => track.level > 0)
      .map((track) => ({
        id: track.id,
        label: ANOMALY_LABELS[track.id] ?? track.id,
        level: track.level,
        confirmed: track.confirmed,
      }))
      .sort((left, right) => (right.level ?? 0) - (left.level ?? 0))
  );

  const cognitionHighlights = topItems(
    Object.values(state.cognition.nodes)
      .filter((node) => node.level > 0)
      .map((node) => ({
        id: node.id,
        label: COGNITION_LABELS[node.id] ?? node.id,
        level: node.level,
      }))
      .sort((left, right) => (right.level ?? 0) - (left.level ?? 0))
  );

  const recentArchives = topItems(
    [...state.archive.entries]
      .sort((left, right) => right.unlockedAt - left.unlockedAt)
      .map((entry) => ({
        id: entry.id,
        label: entry.title,
        episodeId: entry.episodeId,
        routeType: entry.routeType,
      }))
  );

  return cloneState({
    unlockedHubAreas: [...state.unlockedHubAreas],
    npcRelations,
    anomalyHighlights,
    cognitionHighlights,
    recentArchives,
  });
}

export function buildMetaWorldNpcDetails(state: MetaWorldState): MetaWorldNpcDetail[] {
  return cloneState(
    Object.values(state.persistentNpcStates)
      .map((entry) => ({
        id: entry.npcId,
        label: NPC_LABELS[entry.npcId] ?? entry.npcId,
        trust: entry.trust,
        suspicion: entry.suspicion,
        affinityTags: [...entry.affinityTags],
        revealedTopics: [...entry.revealedTopics],
        memorySummary: entry.memorySummary,
        lastEpisodeId: entry.lastEpisodeId,
        lastUpdatedAt: entry.lastUpdatedAt,
      }))
      .sort((left, right) => right.trust - left.trust || left.suspicion - right.suspicion)
  );
}

export function buildMetaWorldAnomalyDetails(state: MetaWorldState): MetaWorldAnomalyDetail[] {
  return cloneState(
    Object.values(state.anomalies.tracks)
      .map((track) => ({
        id: track.id,
        label: ANOMALY_LABELS[track.id] ?? track.id,
        level: track.level,
        firstSeenEpisodeId: track.firstSeenEpisodeId,
        lastSeenEpisodeId: track.lastSeenEpisodeId,
        notes: [...track.notes],
        confirmed: track.confirmed,
      }))
      .sort((left, right) => right.level - left.level || right.lastSeenEpisodeId.localeCompare(left.lastSeenEpisodeId))
  );
}

export function buildMetaWorldCognitionDetails(state: MetaWorldState): MetaWorldCognitionDetail[] {
  return cloneState(
    Object.values(state.cognition.nodes)
      .map((node) => ({
        id: node.id,
        label: COGNITION_LABELS[node.id] ?? node.id,
        level: node.level,
        sourceEpisodeIds: [...node.sourceEpisodeIds],
        lastUpdatedAt: node.lastUpdatedAt,
      }))
      .sort((left, right) => right.level - left.level || right.lastUpdatedAt - left.lastUpdatedAt)
  );
}

export function buildMetaWorldArchiveDetails(state: MetaWorldState): MetaWorldArchiveDetail[] {
  return cloneState(
    [...state.archive.entries].sort((left, right) => right.unlockedAt - left.unlockedAt)
  );
}
