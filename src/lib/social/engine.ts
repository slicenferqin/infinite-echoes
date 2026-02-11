import { EpisodeConfig, GameAction, GameState, NpcState } from '../types';
import {
  addIdentityRisk,
  addNpcRepairProgress,
  clearNpcRepairProgress,
  ensureSocialLedger,
  markNpcContact,
  recordIdentityAppliedFlag,
  refreshNonBeEligibility,
  setNpcConflictFlag,
} from './audit';
import {
  computeIdentityRiskDelta,
  getIdentityBiasForNpc,
  getIdentityLeadTrustBoost,
  resolveIdentityForState,
} from '../identity/system';

export interface SocialMutationResult {
  state: GameState;
  notifications: string[];
  unlockedLeadFlags: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stanceFromThreat(threat: number): NpcState['stance'] {
  if (threat >= 70) return 'hostile';
  if (threat >= 35) return 'guarded';
  return 'open';
}

function nextTimelineSlot(state: GameState): { day: number; slot: number } {
  const timeline = state.timeline;
  const slots = Math.max(1, timeline.slotLabels.length);

  if (timeline.currentSlotIndex < slots - 1) {
    return {
      day: timeline.currentDay,
      slot: timeline.currentSlotIndex + 1,
    };
  }

  return {
    day: Math.min(timeline.totalDays, timeline.currentDay + 1),
    slot: 0,
  };
}

function isAtOrAfterSlot(
  state: GameState,
  target: { day: number; slot: number }
): boolean {
  const now = state.timeline;

  if (now.currentDay > target.day) return true;
  if (now.currentDay < target.day) return false;
  return now.currentSlotIndex >= target.slot;
}

function keywordMatched(text: string, keywords: string[]): boolean {
  if (!text.trim()) return false;
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function setNpcState(
  state: GameState,
  npcId: string,
  updater: (npcState: NpcState) => NpcState
): GameState {
  const current = state.npcStates[npcId];
  if (!current) return state;

  return {
    ...state,
    npcStates: {
      ...state.npcStates,
      [npcId]: updater(current),
    },
  };
}

function adjustThreatByApproach(
  approach: GameAction['approach'],
  hasValidEvidence: boolean
): number {
  switch (approach) {
    case 'empathy':
      return -8;
    case 'pressure':
      return 18;
    case 'exchange':
      return 6;
    case 'present_evidence':
      return hasValidEvidence ? -6 : 10;
    default:
      return 0;
  }
}

function adjustTrustBonus(
  approach: GameAction['approach'],
  hasValidEvidence: boolean
): number {
  switch (approach) {
    case 'empathy':
      return 1;
    case 'pressure':
      return -2;
    case 'exchange':
      return 0;
    case 'present_evidence':
      return hasValidEvidence ? 1 : -1;
    default:
      return 0;
  }
}

export function recoverNpcCooldowns(
  state: GameState,
  episode: EpisodeConfig
): SocialMutationResult {
  let ensured = ensureSocialLedger(state);
  const notifications: string[] = [];

  for (const npc of episode.npcs) {
    const npcState = ensured.npcStates[npc.id];
    if (!npcState?.cooldownUntil) continue;

    if (!isAtOrAfterSlot(ensured, npcState.cooldownUntil)) continue;

    ensured = setNpcState(ensured, npc.id, (entry) => ({
      ...entry,
      isAvailable: true,
      cooldownUntil: undefined,
      mood: entry.stance === 'hostile' ? 'guarded' : entry.mood,
    }));

    notifications.push(`${npc.name}冷静了些，愿意重新和你说话了。`);
  }

  ensured = refreshNonBeEligibility(episode, ensured);

  return {
    state: ensured,
    notifications,
    unlockedLeadFlags: [],
  };
}

export function applyTalkSocialDynamics(
  state: GameState,
  episode: EpisodeConfig,
  npcId: string,
  action: GameAction
): SocialMutationResult {
  let ensured = markNpcContact(ensureSocialLedger(state), npcId);
  const notifications: string[] = [];
  const unlockedLeadFlags: string[] = [];

  const npc = episode.npcs.find((entry) => entry.id === npcId);
  const npcState = ensured.npcStates[npcId];
  if (!npc || !npcState) {
    return {
      state: refreshNonBeEligibility(episode, ensured),
      notifications,
      unlockedLeadFlags,
    };
  }

  const identity = resolveIdentityForState(episode, ensured);
  const identityBias = getIdentityBiasForNpc(identity, npcId);

  const approach = action.approach ?? 'neutral';
  const hasValidEvidence =
    approach === 'present_evidence' &&
    !!action.presentedClueId &&
    ensured.discoveredClues.includes(action.presentedClueId);

  const threatDelta =
    adjustThreatByApproach(approach, hasValidEvidence) + identityBias.threatDelta;
  const nextThreat = clamp(npcState.threat + threatDelta, 0, 100);
  const nextStance = stanceFromThreat(nextThreat);

  ensured = setNpcState(ensured, npcId, (entry) => ({
    ...entry,
    threat: nextThreat,
    stance: nextStance,
    mood:
      nextStance === 'hostile'
        ? 'hostile'
        : nextStance === 'guarded'
          ? 'guarded'
          : 'neutral',
  }));

  if (approach === 'pressure' && nextStance === 'hostile') {
    const cooldownUntil = nextTimelineSlot(ensured);
    ensured = setNpcState(ensured, npcId, (entry) => ({
      ...entry,
      isAvailable: false,
      cooldownUntil,
    }));
    ensured = setNpcConflictFlag(ensured, npcId, true);
    ensured = clearNpcRepairProgress(ensured, npcId);

    notifications.push(`${npc.name}明显被激怒，拒绝继续交谈。你需要换一种方式修复关系。`);
  }

  const hasConflict = !!ensured.socialLedger.npcConflictFlags[npcId];

  if (hasConflict && approach === 'empathy') {
    ensured = addNpcRepairProgress(ensured, npcId, 1);
    const progress = ensured.socialLedger.npcRepairProgress[npcId] ?? 0;
    notifications.push(`${npc.name}的态度略有缓和。你感觉关系正在修复（${progress}/2）。`);

    if (progress >= 2) {
      ensured = setNpcConflictFlag(ensured, npcId, false);
      ensured = clearNpcRepairProgress(ensured, npcId);
      ensured = setNpcState(ensured, npcId, (entry) => ({
        ...entry,
        isAvailable: true,
        cooldownUntil: undefined,
        threat: Math.min(entry.threat, 45),
        stance: 'guarded',
        mood: 'guarded',
      }));
      notifications.push(`${npc.name}终于愿意把话题拉回案件本身。`);
    }
  }

  if (hasConflict && approach === 'present_evidence' && hasValidEvidence) {
    ensured = addNpcRepairProgress(ensured, npcId, 2);
    ensured = setNpcConflictFlag(ensured, npcId, false);
    ensured = clearNpcRepairProgress(ensured, npcId);
    ensured = setNpcState(ensured, npcId, (entry) => ({
      ...entry,
      isAvailable: true,
      cooldownUntil: undefined,
      threat: Math.min(entry.threat, 40),
      stance: 'guarded',
      mood: 'guarded',
    }));
    notifications.push(`${npc.name}看完你递出的证据后沉默很久，终于重新开口。`);
  }

  const trustBonus =
    adjustTrustBonus(approach, hasValidEvidence) + identityBias.trustDelta;
  if (trustBonus !== 0) {
    ensured = setNpcState(ensured, npcId, (entry) => ({
      ...entry,
      trust: clamp(entry.trust + trustBonus, 0, 100),
    }));
  }

  const riskDelta = computeIdentityRiskDelta(
    identity,
    npcId,
    { approach },
    hasValidEvidence,
    identityBias
  );

  if (riskDelta > 0) {
    ensured = addIdentityRisk(ensured, riskDelta);
    notifications.push(
      `你以「${identity.name}」身份继续推进时，周围对你的警惕又加深了一层（风险 +${riskDelta}）。`
    );
  }

  const playerText = action.content?.trim() ?? '';
  const leadRules = episode.socialLeadRules ?? [];

  for (const rule of leadRules) {
    if (!rule.npcIds.includes(npcId)) continue;
    if (ensured.flags[rule.leadFlag]) continue;

    const trust = ensured.npcStates[npcId]?.trust ?? 0;
    const trustBoost = getIdentityLeadTrustBoost(identity, rule.leadFlag);
    const effectiveMinTrust = Math.max(0, rule.minTrust - trustBoost);
    if (trust < effectiveMinTrust) continue;

    if (
      rule.requiresClues?.some((clueId) => !ensured.discoveredClues.includes(clueId))
    ) {
      continue;
    }

    if (rule.requiresFlags?.some((flag) => !ensured.flags[flag])) {
      continue;
    }

    const hitByText = keywordMatched(playerText, rule.keywords);
    const hitByEvidence = approach === 'present_evidence' && hasValidEvidence;
    if (!hitByText && !hitByEvidence) continue;

    ensured = {
      ...ensured,
      flags: {
        ...ensured.flags,
        [rule.leadFlag]: true,
      },
    };

    unlockedLeadFlags.push(rule.leadFlag);
    notifications.push(rule.unlockedHint);

    if (trustBoost > 0) {
      const appliedFlag = `identity_lead_boost:${identity.id}:${rule.leadFlag}`;
      if (!ensured.socialLedger.identityAppliedFlags.includes(appliedFlag)) {
        ensured = recordIdentityAppliedFlag(ensured, appliedFlag);
        notifications.push('你的身份经验让这条线索更早浮出水面。');
      }
    }
  }

  ensured = refreshNonBeEligibility(episode, ensured);

  return {
    state: ensured,
    notifications,
    unlockedLeadFlags,
  };
}
