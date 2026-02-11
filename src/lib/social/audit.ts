import { EpisodeConfig, GameState, SocialEligibilityRule } from '../types';

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function ensureSocialLedger(state: GameState): GameState {
  const current = state.socialLedger;

  if (
    current &&
    Array.isArray(current.npcContacted) &&
    current.npcConflictFlags &&
    current.npcRepairProgress &&
    Array.isArray(current.npcLedClueIds) &&
    Array.isArray(current.sociallyUnlockedSearchClueIds) &&
    typeof current.nonBeEligible === 'boolean' &&
    typeof current.identityRisk === 'number' &&
    Array.isArray(current.identityAppliedFlags)
  ) {
    return state;
  }

  return {
    ...state,
    socialLedger: {
      npcContacted: Array.isArray(current?.npcContacted) ? current.npcContacted : [],
      npcConflictFlags: current?.npcConflictFlags ?? {},
      npcRepairProgress: current?.npcRepairProgress ?? {},
      npcLedClueIds: Array.isArray(current?.npcLedClueIds) ? current.npcLedClueIds : [],
      sociallyUnlockedSearchClueIds: Array.isArray(current?.sociallyUnlockedSearchClueIds)
        ? current.sociallyUnlockedSearchClueIds
        : [],
      nonBeEligible:
        typeof current?.nonBeEligible === 'boolean' ? current.nonBeEligible : false,
      identityRisk:
        typeof current?.identityRisk === 'number' ? current.identityRisk : 0,
      identityAppliedFlags: Array.isArray(current?.identityAppliedFlags)
        ? current.identityAppliedFlags
        : [],
    },
  };
}

export function markNpcContact(state: GameState, npcId: string): GameState {
  const ensured = ensureSocialLedger(state);
  if (ensured.socialLedger.npcContacted.includes(npcId)) return ensured;

  return {
    ...ensured,
    socialLedger: {
      ...ensured.socialLedger,
      npcContacted: [...ensured.socialLedger.npcContacted, npcId],
    },
  };
}

export function setNpcConflictFlag(
  state: GameState,
  npcId: string,
  active: boolean
): GameState {
  const ensured = ensureSocialLedger(state);
  const current = !!ensured.socialLedger.npcConflictFlags[npcId];
  if (current === active) return ensured;

  return {
    ...ensured,
    socialLedger: {
      ...ensured.socialLedger,
      npcConflictFlags: {
        ...ensured.socialLedger.npcConflictFlags,
        [npcId]: active,
      },
    },
  };
}

export function addNpcRepairProgress(
  state: GameState,
  npcId: string,
  delta: number
): GameState {
  const ensured = ensureSocialLedger(state);
  const current = ensured.socialLedger.npcRepairProgress[npcId] ?? 0;
  const next = Math.max(0, current + delta);
  if (next === current) return ensured;

  return {
    ...ensured,
    socialLedger: {
      ...ensured.socialLedger,
      npcRepairProgress: {
        ...ensured.socialLedger.npcRepairProgress,
        [npcId]: next,
      },
    },
  };
}

export function clearNpcRepairProgress(state: GameState, npcId: string): GameState {
  const ensured = ensureSocialLedger(state);
  if ((ensured.socialLedger.npcRepairProgress[npcId] ?? 0) === 0) {
    return ensured;
  }

  return {
    ...ensured,
    socialLedger: {
      ...ensured.socialLedger,
      npcRepairProgress: {
        ...ensured.socialLedger.npcRepairProgress,
        [npcId]: 0,
      },
    },
  };
}

export function recordNpcLedClue(state: GameState, clueId: string): GameState {
  const ensured = ensureSocialLedger(state);
  if (ensured.socialLedger.npcLedClueIds.includes(clueId)) return ensured;

  return {
    ...ensured,
    socialLedger: {
      ...ensured.socialLedger,
      npcLedClueIds: [...ensured.socialLedger.npcLedClueIds, clueId],
    },
  };
}

export function recordSociallyUnlockedSearchClue(
  state: GameState,
  clueId: string
): GameState {
  const ensured = ensureSocialLedger(state);
  if (ensured.socialLedger.sociallyUnlockedSearchClueIds.includes(clueId)) {
    return ensured;
  }

  return {
    ...ensured,
    socialLedger: {
      ...ensured.socialLedger,
      sociallyUnlockedSearchClueIds: [
        ...ensured.socialLedger.sociallyUnlockedSearchClueIds,
        clueId,
      ],
    },
  };
}

export function addIdentityRisk(state: GameState, delta: number): GameState {
  if (delta <= 0) return ensureSocialLedger(state);

  const ensured = ensureSocialLedger(state);
  const nextRisk = Math.max(0, ensured.socialLedger.identityRisk + delta);
  if (nextRisk === ensured.socialLedger.identityRisk) return ensured;

  return {
    ...ensured,
    socialLedger: {
      ...ensured.socialLedger,
      identityRisk: nextRisk,
    },
  };
}

export function recordIdentityAppliedFlag(
  state: GameState,
  flag: string
): GameState {
  const ensured = ensureSocialLedger(state);
  if (!flag || ensured.socialLedger.identityAppliedFlags.includes(flag)) {
    return ensured;
  }

  return {
    ...ensured,
    socialLedger: {
      ...ensured.socialLedger,
      identityAppliedFlags: [...ensured.socialLedger.identityAppliedFlags, flag],
    },
  };
}

export function countLeadFlags(flags: Record<string, boolean>): number {
  return Object.keys(flags).filter((flag) => flag.startsWith('lead_') && !!flags[flag])
    .length;
}

function evaluateNonBeEligibilityByRule(
  state: GameState,
  rule: SocialEligibilityRule
): boolean {
  const contacted = uniq(state.socialLedger.npcContacted);
  const leadCount = countLeadFlags(state.flags);

  if (
    typeof rule.minimumUniqueContacts === 'number' &&
    contacted.length < rule.minimumUniqueContacts
  ) {
    return false;
  }

  if (
    rule.mustIncludeNpcIds?.some((npcId) => !contacted.includes(npcId))
  ) {
    return false;
  }

  if (rule.oneOfNpcIds?.length && !rule.oneOfNpcIds.some((npcId) => contacted.includes(npcId))) {
    return false;
  }

  if (
    typeof rule.minimumNpcLeadCount === 'number' &&
    leadCount < rule.minimumNpcLeadCount
  ) {
    return false;
  }

  return true;
}

export function evaluateNonBeEligibility(
  episode: EpisodeConfig,
  state: GameState
): boolean {
  const ensured = ensureSocialLedger(state);
  const eligibility = episode.socialEligibility;
  if (!eligibility) return true;
  return evaluateNonBeEligibilityByRule(ensured, eligibility);
}

export function refreshNonBeEligibility(
  episode: EpisodeConfig,
  state: GameState
): GameState {
  const ensured = ensureSocialLedger(state);
  const eligible = evaluateNonBeEligibility(episode, ensured);

  if (ensured.socialLedger.nonBeEligible === eligible) {
    return ensured;
  }

  return {
    ...ensured,
    socialLedger: {
      ...ensured.socialLedger,
      nonBeEligible: eligible,
    },
  };
}
