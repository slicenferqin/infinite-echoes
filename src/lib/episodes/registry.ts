import { EpisodeConfig, EpisodeSummary } from '../types';
import { EpisodeRuntimeHooks } from '../engine/runtime';
import { episode01 } from './ep01';
import { ep01RuntimeHooks } from './ep01/runtime';
import { episode02 } from './ep02';
import { ep02RuntimeHooks } from './ep02/runtime';
import { episode03 } from './ep03';
import { ep03RuntimeHooks } from './ep03/runtime';

export interface EpisodeEntry {
  config: EpisodeConfig;
  runtimeHooks?: EpisodeRuntimeHooks;
}

const registry: Record<string, EpisodeEntry> = {
  [episode01.id]: {
    config: episode01,
    runtimeHooks: ep01RuntimeHooks,
  },
  [episode02.id]: {
    config: episode02,
    runtimeHooks: ep02RuntimeHooks,
  },
  [episode03.id]: {
    config: episode03,
    runtimeHooks: ep03RuntimeHooks,
  },
};

const defaultEpisodeId = episode01.id;

export function listEpisodes(): EpisodeSummary[] {
  return Object.values(registry).map(({ config }) => ({
    id: config.id,
    name: config.name,
    description: config.description,
    difficulty: config.difficulty,
    maxRounds: config.maxRounds,
    identityMode: config.identity?.mode ?? 'legacy_profession',
    identityPoolSize: config.identity?.pool.length ?? 0,
    identityAllowReroll: config.identity?.allowReroll ?? false,
  }));
}

export function getEpisodeEntry(episodeId: string): EpisodeEntry | null {
  return registry[episodeId] ?? null;
}

export function getEpisodeConfig(episodeId: string): EpisodeConfig | null {
  return getEpisodeEntry(episodeId)?.config ?? null;
}

export function getDefaultEpisodeId(): string {
  return defaultEpisodeId;
}

export function getDefaultEpisodeEntry(): EpisodeEntry {
  return registry[defaultEpisodeId];
}
