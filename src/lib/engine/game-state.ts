import {
  EpisodeConfig,
  GameState,
  IdentityDefinition,
  NarrativeEntry,
  NpcState,
  WorldPressureState,
} from '../types';
import {
  createLegacyIdentity,
  getLegacyProfessionTrait,
} from '../identity/system';
import {
  createInitialTimelineState,
  getEpisodePacing,
  isTimelineExpired,
} from '../timeline/pacing';

function createInitialWorldPressure(): WorldPressureState {
  return {
    publicHeat: 0,
    evidenceDecay: 0,
    rumorByNpc: {},
    locationPressure: {},
  };
}

export function ensureWorldPressure(state: GameState): GameState {
  if (state.worldPressure) {
    return state;
  }

  return {
    ...state,
    worldPressure: createInitialWorldPressure(),
  };
}

export function createInitialState(
  episode: EpisodeConfig,
  playerName: string,
  profession: string,
  ownerUserId: string,
  identity?: IdentityDefinition | null
): GameState {
  const selectedIdentity = identity ?? createLegacyIdentity(profession);

  const npcStates: Record<string, NpcState> = {};
  for (const npc of episode.npcs) {
    npcStates[npc.id] = {
      trust: npc.initialTrust,
      threat: 15,
      stance: 'open',
      mood: 'neutral',
      conversationHistory: [],
      revealedClues: [],
      isAvailable: true,
    };
  }

  const fallbackLocation = episode.locations[0]?.id ?? 'bridge';
  const startLocationId = episode.startLocationId ?? fallbackLocation;

  return {
    sessionId: crypto.randomUUID(),
    ownerUserId,
    episodeId: episode.id,
    round: 0,
    maxRounds: episode.maxRounds,
    phase: 'intro',
    timeline: createInitialTimelineState(episode),
    currentLocation: startLocationId,
    player: {
      name: playerName,
      identityId: selectedIdentity.id,
      identityName: selectedIdentity.name,
      identityBrief: selectedIdentity.brief,
      profession,
      professionTrait: getLegacyProfessionTrait(profession),
    },
    npcStates,
    discoveredClues: [],
    inventory: [],
    visitedLocations: [startLocationId],
    flags: {},
    narrativeLog: [],
    actionHistory: [],
    socialLedger: {
      npcContacted: [],
      npcConflictFlags: {},
      npcRepairProgress: {},
      npcLedClueIds: [],
      sociallyUnlockedSearchClueIds: [],
      nonBeEligible: false,
      identityRisk: 0,
      identityAppliedFlags: [],
    },
    governanceLedger: {
      order: 50,
      humanity: 50,
      survival: 50,
    },
    worldPressure: createInitialWorldPressure(),
  };
}

export function addNarrative(
  state: GameState,
  type: NarrativeEntry['type'],
  content: string,
  speaker?: string
): GameState {
  return {
    ...state,
    narrativeLog: [
      ...state.narrativeLog,
      {
        type,
        speaker,
        content,
        round: state.round,
        timestamp: Date.now(),
      },
    ],
  };
}

export function consumeRound(state: GameState): GameState {
  return {
    ...state,
    round: state.round + 1,
  };
}

export function discoverClue(
  state: GameState,
  episode: EpisodeConfig,
  clueId: string
): GameState {
  if (state.discoveredClues.includes(clueId)) return state;

  const clue = episode.clues.find((entry) => entry.id === clueId);
  if (!clue) return state;

  if (clue.requiredFlag && !state.flags[clue.requiredFlag]) return state;
  if (clue.forbiddenFlags?.some((flag) => state.flags[flag])) return state;

  const newState: GameState = {
    ...state,
    discoveredClues: [...state.discoveredClues, clueId],
  };

  if (clue.setsFlags && clue.setsFlags.length > 0) {
    const nextFlags = { ...newState.flags };
    for (const flag of clue.setsFlags) {
      if (!flag) continue;
      nextFlags[flag] = true;
    }
    newState.flags = nextFlags;
  }

  return newState;
}

export function addItem(state: GameState, itemId: string): GameState {
  if (state.inventory.includes(itemId)) return state;
  return { ...state, inventory: [...state.inventory, itemId] };
}

export function applyItemEffects(
  state: GameState,
  episode: EpisodeConfig,
  itemId: string
): GameState {
  const item = episode.items.find((it) => it.id === itemId);
  if (!item?.setsFlag) return state;
  if (state.flags[item.setsFlag]) return state;

  return {
    ...state,
    flags: { ...state.flags, [item.setsFlag]: true },
  };
}

export function moveToLocation(
  state: GameState,
  episode: EpisodeConfig,
  locationId: string
): { state: GameState; blocked?: string } | null {
  const currentLocation = episode.locations.find(
    (l) => l.id === state.currentLocation
  );
  if (!currentLocation?.connectedTo.includes(locationId)) return null;

  const targetLocation = episode.locations.find((l) => l.id === locationId);
  if (targetLocation?.requiresItem && !state.inventory.includes(targetLocation.requiresItem)) {
    const item = episode.items.find((i) => i.id === targetLocation.requiresItem);
    return {
      state,
      blocked: `这里上了锁。你需要${item?.name ?? '某样东西'}才能进入。`,
    };
  }

  return {
    state: {
      ...state,
      currentLocation: locationId,
      visitedLocations: state.visitedLocations.includes(locationId)
        ? state.visitedLocations
        : [...state.visitedLocations, locationId],
    },
  };
}

export function updateNpcTrust(
  state: GameState,
  npcId: string,
  delta: number
): GameState {
  const npcState = state.npcStates[npcId];
  if (!npcState) return state;

  const bonus =
    state.player.profession === 'teacher' && delta > 0
      ? Math.ceil(delta * 1.3)
      : delta;

  const newTrust = Math.max(0, Math.min(100, npcState.trust + bonus));

  return {
    ...state,
    npcStates: {
      ...state.npcStates,
      [npcId]: { ...npcState, trust: newTrust },
    },
  };
}

export function unlockNpcTrustClues(
  state: GameState,
  episode: EpisodeConfig,
  npcId: string
): { state: GameState; unlockedClues: string[] } {
  const npcState = state.npcStates[npcId];
  if (!npcState) return { state, unlockedClues: [] };

  let nextState = state;
  const unlockedClues: string[] = [];

  for (const clue of episode.clues) {
    if (!clue.requiredTrust || clue.requiredTrust.npcId !== npcId) continue;
    if (npcState.trust < clue.requiredTrust.level) continue;
    if (clue.requiredFlag && !nextState.flags[clue.requiredFlag]) continue;
    if (nextState.discoveredClues.includes(clue.id)) continue;

    const before = nextState.discoveredClues.length;
    nextState = discoverClue(nextState, episode, clue.id);
    if (nextState.discoveredClues.length > before) {
      unlockedClues.push(clue.id);
    }
  }

  return { state: nextState, unlockedClues };
}

export function isGameOver(state: GameState, episode?: EpisodeConfig): boolean {
  if (state.phase === 'settlement') return true;

  if (episode) {
    const pacing = getEpisodePacing(episode);
    if (pacing.mode === 'realtime_day') {
      return isTimelineExpired(state, episode);
    }

    return state.round >= state.maxRounds;
  }

  return state.round >= state.maxRounds;
}

function routeMatches(
  state: GameState,
  episode: EpisodeConfig,
  routeId: string,
  mergedFlags: Record<string, boolean>
): boolean {
  const route = episode.routes.find((item) => item.id === routeId);
  if (!route) return false;

  const conditions = route.conditions ?? {};

  if (conditions.requiredClues?.some((clueId) => !state.discoveredClues.includes(clueId))) {
    return false;
  }

  if (conditions.minClueCount?.length) {
    for (const rule of conditions.minClueCount) {
      const count = state.discoveredClues.filter((clueId) => {
        const clue = episode.clues.find((entry) => entry.id === clueId);
        return clue?.tier === rule.tier;
      }).length;

      if (count < rule.count) {
        return false;
      }
    }
  }

  if (conditions.requiredFlags?.some((flag) => !mergedFlags[flag])) {
    return false;
  }

  if (conditions.forbiddenFlags?.some((flag) => !!mergedFlags[flag])) {
    return false;
  }

  if (conditions.requiredNpcContacts?.length) {
    const contacted = new Set(state.socialLedger?.npcContacted ?? []);
    if (conditions.requiredNpcContacts.some((npcId) => !contacted.has(npcId))) {
      return false;
    }
  }

  if (typeof conditions.requiredNpcLeadCount === 'number') {
    const leadCount = Object.keys(mergedFlags).filter(
      (flag) => flag.startsWith('lead_') && !!mergedFlags[flag]
    ).length;

    if (leadCount < conditions.requiredNpcLeadCount) {
      return false;
    }
  }

  if (conditions.requiredGovernance) {
    const ledger = state.governanceLedger ?? {
      order: 50,
      humanity: 50,
      survival: 50,
    };

    if (
      typeof conditions.requiredGovernance.orderMin === 'number' &&
      ledger.order < conditions.requiredGovernance.orderMin
    ) {
      return false;
    }

    if (
      typeof conditions.requiredGovernance.humanityMin === 'number' &&
      ledger.humanity < conditions.requiredGovernance.humanityMin
    ) {
      return false;
    }

    if (
      typeof conditions.requiredGovernance.survivalMin === 'number' &&
      ledger.survival < conditions.requiredGovernance.survivalMin
    ) {
      return false;
    }
  }

  return true;
}

export function determineRoute(
  state: GameState,
  episode: EpisodeConfig,
  evaluationFlags: Record<string, boolean>
): string {
  const mergedFlags: Record<string, boolean> = {
    ...state.flags,
    ...evaluationFlags,
  };

  const sortedRoutes = [...episode.routes].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  );

  const matched = sortedRoutes.find((route) =>
    routeMatches(state, episode, route.id, mergedFlags)
  );

  if (matched) return matched.id;

  const fallback = sortedRoutes[sortedRoutes.length - 1] ?? episode.routes[0];
  return fallback?.id ?? '';
}
