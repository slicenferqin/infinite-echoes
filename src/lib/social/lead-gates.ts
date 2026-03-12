import { EpisodeConfig, GameState, SearchableItem } from '../types';
import { applyIdentitySearchGateBypass } from '../identity/system';
import { ensureSocialLedger } from './audit';

export interface ResolvedSearchTarget {
  locationId: string;
  item: SearchableItem;
}

export interface SearchAccessResult {
  ok: boolean;
  blockedNarrative?: string;
  missingLeads: string[];
  missingNpcContacts: string[];
  bypassNotes: string[];
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function isVisibleItem(state: GameState, item: SearchableItem): boolean {
  if (item.hiddenUntilFlag && !state.flags[item.hiddenUntilFlag]) return false;
  return true;
}

function matchSearchTarget(item: SearchableItem, target: string): boolean {
  const normalizedTarget = normalize(target);
  if (!normalizedTarget) return false;

  if (normalize(item.id) === normalizedTarget) return true;
  if (normalize(item.description).includes(normalizedTarget)) return true;

  const compactItemId = normalize(item.id).replace(/_/g, '');
  const compactTarget = normalizedTarget.replace(/\s+/g, '');
  if (compactTarget.includes(compactItemId) || compactItemId.includes(compactTarget)) {
    return true;
  }

  return normalizedTarget
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .some((word) => normalize(item.description).includes(word));
}

export function resolveSearchTarget(
  episode: EpisodeConfig,
  state: GameState,
  target: string
): ResolvedSearchTarget | null {
  const location = episode.locations.find((entry) => entry.id === state.currentLocation);
  if (!location) return null;

  const available = location.searchableItems.filter((item) => isVisibleItem(state, item));

  const item = available.find((entry) => matchSearchTarget(entry, target));
  if (!item) return null;

  return {
    locationId: location.id,
    item,
  };
}

export function evaluateSearchAccess(
  episode: EpisodeConfig,
  state: GameState,
  item: SearchableItem
): SearchAccessResult {
  const ensured = ensureSocialLedger(state);
  const pressure = ensured.worldPressure ?? {
    publicHeat: 0,
    evidenceDecay: 0,
    rumorByNpc: {},
    locationPressure: {},
  };
  const currentLocationPressure = pressure.locationPressure[ensured.currentLocation] ?? 0;
  const clue = item.clueId ? episode.clues.find((entry) => entry.id === item.clueId) : null;

  if (
    clue &&
    !ensured.discoveredClues.includes(clue.id) &&
    clue.tier === 'C' &&
    pressure.evidenceDecay >= 55
  ) {
    return {
      ok: false,
      blockedNarrative:
        '你赶到时，关键痕迹已经被人先一步处理过了。现在留下来的，只够你确认这里曾经出过问题，却不再足以直接翻出核心实情。',
      missingLeads: [],
      missingNpcContacts: [],
      bypassNotes: [],
    };
  }

  if (
    (item.requiresLeads?.length || item.requiresNpcContact?.length) &&
    currentLocationPressure >= 3
  ) {
    return {
      ok: false,
      blockedNarrative:
        item.blockedNarrative ??
        '这一带的口风已经被搅得太紧。你刚靠近，周围就有人先一步收起了该留在这里的东西。',
      missingLeads: [],
      missingNpcContacts: [],
      bypassNotes: [],
    };
  }

  if (item.requiresFlag && !ensured.flags[item.requiresFlag]) {
    return {
      ok: false,
      blockedNarrative:
        item.blockedNarrative ?? '你看了看目标位置，但眼下还没有足够理由或权限继续深查。',
      missingLeads: [],
      missingNpcContacts: [],
      bypassNotes: [],
    };
  }

  if (item.requiresItem && !ensured.inventory.includes(item.requiresItem)) {
    return {
      ok: false,
      blockedNarrative:
        item.blockedNarrative ?? '你试了几次，都卡在关键步骤上。像是缺了某样东西。',
      missingLeads: [],
      missingNpcContacts: [],
      bypassNotes: [],
    };
  }

  const missingLeads = (item.requiresLeads ?? []).filter((lead) => !ensured.flags[lead]);
  const contacted = new Set(ensured.socialLedger.npcContacted);
  const missingNpcContacts = (item.requiresNpcContact ?? []).filter(
    (npcId) => !contacted.has(npcId)
  );

  const bypassed = applyIdentitySearchGateBypass(
    ensured,
    episode,
    item,
    missingLeads,
    missingNpcContacts
  );

  if (
    bypassed.missingLeads.length === 0 &&
    bypassed.missingNpcContacts.length === 0
  ) {
    return {
      ok: true,
      missingLeads: [],
      missingNpcContacts: [],
      bypassNotes: bypassed.bypassNotes,
    };
  }

  const leadHint =
    bypassed.missingLeads.length > 0
      ? '你总觉得缺了关键一环，像是还没问到真正懂内情的人。'
      : '';
  const contactHint =
    bypassed.missingNpcContacts.length > 0
      ? '你翻了半天，只摸到表面。也许该先和相关的人把话说透。'
      : '';

  return {
    ok: false,
    blockedNarrative:
      item.blockedNarrative ??
      ([leadHint, contactHint].filter(Boolean).join(' ') ||
        '你反复查看了现场，却仍然抓不住要害。'),
    missingLeads: bypassed.missingLeads,
    missingNpcContacts: bypassed.missingNpcContacts,
    bypassNotes: bypassed.bypassNotes,
  };
}

export function isSearchSociallyGated(item: SearchableItem): boolean {
  return Boolean(
    (item.requiresLeads && item.requiresLeads.length > 0) ||
      (item.requiresNpcContact && item.requiresNpcContact.length > 0)
  );
}
