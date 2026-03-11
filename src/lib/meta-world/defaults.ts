import {
  CognitionNodeState,
  MetaWorldState,
  PersistentNpcState,
} from '../types';

const META_WORLD_VERSION = 1;

const DEFAULT_HUB_AREAS = ['central_plaza', 'memory_shop'];

const DEFAULT_PERSISTENT_NPCS = ['aji', 'linlu', 'laozhao', 'hooded_figure'] as const;

const DEFAULT_COGNITION_NODE_IDS = [
  'understands_pillars_feed_on_emotion',
  'doubts_revival_promise',
  'recognizes_records_are_rewritten',
  'understands_public_vs_hidden_versions',
  'suspects_maintainer_layer_exists',
] as const;

function createPersistentNpcState(npcId: string, now: number): PersistentNpcState {
  return {
    npcId,
    trust: 0,
    suspicion: 0,
    affinityTags: [],
    revealedTopics: [],
    memorySummary: '',
    lastUpdatedAt: now,
  };
}

function createCognitionNode(id: string, now: number): CognitionNodeState {
  return {
    id,
    level: 0,
    sourceEpisodeIds: [],
    lastUpdatedAt: now,
  };
}

export function createDefaultMetaWorldState(userId: string): MetaWorldState {
  const now = Date.now();

  return {
    userId,
    version: META_WORLD_VERSION,
    updatedAt: now,
    worldFlags: {},
    unlockedHubAreas: [...DEFAULT_HUB_AREAS],
    persistentNpcStates: Object.fromEntries(
      DEFAULT_PERSISTENT_NPCS.map((npcId) => [npcId, createPersistentNpcState(npcId, now)])
    ),
    archive: {
      entries: [],
      unlockedEpisodeIds: [],
    },
    anomalies: {
      tracks: {},
    },
    cognition: {
      nodes: Object.fromEntries(
        DEFAULT_COGNITION_NODE_IDS.map((id) => [id, createCognitionNode(id, now)])
      ),
    },
  };
}
