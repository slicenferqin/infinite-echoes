import { RouteDefinition } from './types';

export interface EpisodeProgress {
  unlockedEpisodes: string[];
  passedEpisodes: string[];
}

interface UnlockRule {
  episodeId: string;
  requiresEpisodeId: string;
}

const ALWAYS_UNLOCKED_EPISODES = ['ep01'];
const PASSING_ROUTE_TYPES = new Set<RouteDefinition['type']>(['HE', 'TE', 'SE']);
const unlockRules: UnlockRule[] = [
  {
    episodeId: 'ep02',
    requiresEpisodeId: 'ep01',
  },
  {
    episodeId: 'ep03',
    requiresEpisodeId: 'ep02',
  },
];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value && value.trim().length > 0)));
}

export function normalizeProgress(progress?: Partial<EpisodeProgress> | null): EpisodeProgress {
  const unlockedEpisodes = unique([
    ...ALWAYS_UNLOCKED_EPISODES,
    ...(progress?.unlockedEpisodes ?? []),
  ]);

  const passedEpisodes = unique(progress?.passedEpisodes ?? []);

  for (const rule of unlockRules) {
    if (passedEpisodes.includes(rule.requiresEpisodeId)) {
      unlockedEpisodes.push(rule.episodeId);
    }
  }

  return {
    unlockedEpisodes: unique(unlockedEpisodes),
    passedEpisodes,
  };
}

export function createDefaultProgress(): EpisodeProgress {
  return normalizeProgress();
}

export function isEpisodeUnlocked(progress: EpisodeProgress, episodeId: string): boolean {
  return normalizeProgress(progress).unlockedEpisodes.includes(episodeId);
}

export function filterUnlockedEpisodes<T extends { id: string }>(
  episodes: T[],
  progress: EpisodeProgress
): T[] {
  const unlocked = new Set(normalizeProgress(progress).unlockedEpisodes);
  return episodes.filter((episode) => unlocked.has(episode.id));
}

export function applySettlementProgress(
  progress: EpisodeProgress,
  episodeId: string,
  routeType: RouteDefinition['type']
): EpisodeProgress {
  const base = normalizeProgress(progress);
  const next: EpisodeProgress = {
    unlockedEpisodes: [...base.unlockedEpisodes],
    passedEpisodes: [...base.passedEpisodes],
  };

  if (PASSING_ROUTE_TYPES.has(routeType) && !next.passedEpisodes.includes(episodeId)) {
    next.passedEpisodes.push(episodeId);
  }

  return normalizeProgress(next);
}
