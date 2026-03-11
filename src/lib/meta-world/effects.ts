import {
  EpisodeConfig,
  MetaWorldState,
  PersistentNpcState,
  RouteDefinition,
} from '../types';
import { createDefaultMetaWorldState } from './defaults';

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ensureMetaWorldState(state: MetaWorldState): MetaWorldState {
  const fallback = createDefaultMetaWorldState(state.userId);

  return {
    ...fallback,
    ...state,
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

function matchRule(
  route: RouteDefinition,
  rule: NonNullable<EpisodeConfig['metaStateEffects']>[number]
): boolean {
  if (!rule) return false;

  if (rule.whenRouteIds?.length && !rule.whenRouteIds.includes(route.id)) {
    return false;
  }

  if (rule.whenRouteTypes?.length && !rule.whenRouteTypes.includes(route.type)) {
    return false;
  }

  return true;
}

function mergeMemorySummary(current: string, appendText?: string): string {
  const next = [current?.trim(), appendText?.trim()].filter(Boolean).join(' ');
  return next.trim();
}

function ensurePersistentNpcState(
  state: MetaWorldState,
  npcId: string,
  now: number
): PersistentNpcState {
  return (
    state.persistentNpcStates[npcId] ?? {
      npcId,
      trust: 0,
      suspicion: 0,
      affinityTags: [],
      revealedTopics: [],
      memorySummary: '',
      lastUpdatedAt: now,
    }
  );
}

export function applyEpisodeMetaEffects(params: {
  metaWorld: MetaWorldState;
  episode: EpisodeConfig;
  route: RouteDefinition;
}): MetaWorldState {
  const { episode, route } = params;
  const state = ensureMetaWorldState(params.metaWorld);
  const now = Date.now();
  const rules = (episode.metaStateEffects ?? []).filter((rule) => matchRule(route, rule));

  if (rules.length === 0) {
    return {
      ...state,
      updatedAt: now,
    };
  }

  for (const rule of rules) {
    if (rule.setWorldFlags?.length) {
      for (const flag of rule.setWorldFlags) {
        state.worldFlags[flag] = true;
      }
    }

    if (rule.unlockHubAreas?.length) {
      state.unlockedHubAreas = uniq([...state.unlockedHubAreas, ...rule.unlockHubAreas]);
    }

    for (const delta of rule.anomalyDeltas ?? []) {
      const current = state.anomalies.tracks[delta.id];
      state.anomalies.tracks[delta.id] = {
        id: delta.id,
        level: clamp((current?.level ?? 0) + delta.delta, 0, 9),
        firstSeenEpisodeId: current?.firstSeenEpisodeId ?? episode.id,
        lastSeenEpisodeId: episode.id,
        notes: uniq([...(current?.notes ?? []), delta.note]),
        confirmed: Boolean(current?.confirmed || delta.confirm),
      };
    }

    for (const delta of rule.cognitionDeltas ?? []) {
      const current = state.cognition.nodes[delta.id] ?? {
        id: delta.id,
        level: 0 as const,
        sourceEpisodeIds: [],
        lastUpdatedAt: now,
      };

      state.cognition.nodes[delta.id] = {
        ...current,
        level: Math.max(current.level, delta.level) as 0 | 1 | 2 | 3,
        sourceEpisodeIds: uniq([...current.sourceEpisodeIds, episode.id]),
        lastUpdatedAt: now,
      };
    }

    for (const delta of rule.persistentNpcDeltas ?? []) {
      const current = ensurePersistentNpcState(state, delta.npcId, now);
      state.persistentNpcStates[delta.npcId] = {
        ...current,
        trust: clamp(current.trust + (delta.trustDelta ?? 0), 0, 100),
        suspicion: clamp(current.suspicion + (delta.suspicionDelta ?? 0), 0, 100),
        affinityTags: uniq([...current.affinityTags, ...(delta.addTags ?? [])]),
        revealedTopics: uniq([...current.revealedTopics, ...(delta.revealTopics ?? [])]),
        memorySummary: mergeMemorySummary(current.memorySummary, delta.memorySummaryAppend),
        lastEpisodeId: episode.id,
        lastUpdatedAt: now,
      };
    }

    if (rule.archiveEntry) {
      const entryId = `${episode.id}:${route.id}`;
      const existingIndex = state.archive.entries.findIndex((entry) => entry.id === entryId);
      const nextEntry = {
        id: entryId,
        episodeId: episode.id,
        routeId: route.id,
        routeType: route.type,
        title: rule.archiveEntry.title,
        summary: rule.archiveEntry.summary,
        learnedTruths: uniq(rule.archiveEntry.learnedTruths),
        unlockedAt: now,
      };

      if (existingIndex >= 0) {
        state.archive.entries[existingIndex] = nextEntry;
      } else {
        state.archive.entries.push(nextEntry);
      }

      state.archive.unlockedEpisodeIds = uniq([...state.archive.unlockedEpisodeIds, episode.id]);
    }
  }

  return {
    ...state,
    updatedAt: now,
  };
}
