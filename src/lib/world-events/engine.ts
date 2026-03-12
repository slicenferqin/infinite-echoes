import { EpisodeConfig, GameState, NpcState, WorldPressureState } from '../types';
import { RuntimeTimeSlotContext } from '../engine/runtime';
import { WorldEventLog, WorldEventSimulationResult, WorldEventType } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function setNpcState(
  state: GameState,
  npcId: string,
  updater: (current: NpcState) => NpcState
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

function ensureWorldPressure(state: GameState): WorldPressureState {
  return (
    state.worldPressure ?? {
      publicHeat: 0,
      evidenceDecay: 0,
      rumorByNpc: {},
      locationPressure: {},
    }
  );
}

function setWorldPressure(
  state: GameState,
  updater: (current: WorldPressureState) => WorldPressureState
): GameState {
  return {
    ...state,
    worldPressure: updater(ensureWorldPressure(state)),
  };
}

interface CandidateInteraction {
  participants: [string, string];
  heat: number;
  dependency: string;
  type: WorldEventType;
}

function collectCandidates(episode: EpisodeConfig, state: GameState): CandidateInteraction[] {
  const availableNpcIds = new Set(
    episode.npcs
      .filter((npc) => state.npcStates[npc.id]?.isAvailable)
      .map((npc) => npc.id)
  );

  const candidates = episode.npcs.flatMap((npc) =>
    (npc.relationshipEdges ?? [])
      .filter((edge) => availableNpcIds.has(npc.id) && availableNpcIds.has(edge.targetNpcId))
      .filter((edge) => edge.heat >= 50)
      .map((edge) => {
        const participants = [npc.id, edge.targetNpcId].sort() as [string, string];
        let type: WorldEventType = edge.heat >= 68 ? 'private_confrontation' : 'rumor_spread';
        if (/(账|文书|档案|回执|印章|补丁|记录|证)/.test(edge.dependency)) {
          type = 'evidence_hidden';
        } else if (/(舆论|口风|乡里|联名|广场|评价)/.test(edge.dependency)) {
          type = edge.heat >= 68 ? 'public_pressure_shift' : 'rumor_spread';
        } else if (/(秘密|遮掩|保护|监护|自保)/.test(edge.dependency)) {
          type = 'cover_up';
        }
        return {
          participants,
          heat: edge.heat,
          dependency: edge.dependency,
          type,
        };
      })
  );

  return uniqueByKey(candidates, (candidate) => candidate.participants.join(':')).sort(
    (left, right) => right.heat - left.heat
  );
}

function buildEventSummary(
  episode: EpisodeConfig,
  candidate: CandidateInteraction
): { summary: string; publicHint: string } {
  const [firstId, secondId] = candidate.participants;
  const first = episode.npcs.find((npc) => npc.id === firstId);
  const second = episode.npcs.find((npc) => npc.id === secondId);
  const pair = `${first?.name ?? firstId}和${second?.name ?? secondId}`;

  if (candidate.type === 'private_confrontation') {
    return {
      summary: `${pair}私下对过一轮口风，彼此都变得更谨慎了。`,
      publicHint: `【暗流变化】${pair}像是刚私下谈过什么，之后面对外人时明显收紧了口风。`,
    };
  }

  if (candidate.type === 'evidence_hidden') {
    return {
      summary: `${pair}在某份关键记录上先一步做了处理，留给外人的只剩更难辨认的痕迹。`,
      publicHint: `【痕迹被动过】${pair}像是先一步处理了某些记录或物证。你再去搜查时，得到的很可能只剩残片。`,
    };
  }

  if (candidate.type === 'cover_up') {
    return {
      summary: `${pair}之间临时形成了互护口径，短时间内更难从他们嘴里撬开缺口。`,
      publicHint: `【互护成形】${pair}像是达成了某种默契。接下来，他们对外会更一致，也更难松口。`,
    };
  }

  if (candidate.type === 'public_pressure_shift') {
    return {
      summary: `${pair}牵动的说法开始往公开场合蔓延，整个地区的定性压力都在抬升。`,
      publicHint: `【公开压力】围绕${pair}的说法已经开始影响更大的口风。再拖下去，很多人会先选最省事的答案。`,
    };
  }

  return {
    summary: `${pair}之间的说法开始互相传递，周围口风随之变得更保守。`,
    publicHint: `【口风变化】围绕${pair}的一段说法开始扩散，和他们再谈时，你会更难直接撬开关键句。`,
  };
}

function applyEventEffects(
  state: GameState,
  episode: EpisodeConfig,
  candidate: CandidateInteraction
): { state: GameState; effects: WorldEventLog['effects'] } {
  const threatDelta =
    candidate.type === 'private_confrontation'
      ? 5
      : candidate.type === 'cover_up'
        ? 4
        : 3;
  const mood =
    candidate.type === 'private_confrontation' || candidate.type === 'cover_up'
      ? 'guarded'
      : candidate.type === 'evidence_hidden'
        ? 'wary'
        : 'tense';

  let nextState = state;
  const npcThreatDeltas: Record<string, number> = {};
  const npcMoodChanges: Record<string, string> = {};
  const participantLocations = candidate.participants
    .map((npcId) => {
      const profile = episode.npcs.find((npc) => npc.id === npcId);
      const npcState = nextState.npcStates[npcId];
      return npcState?.locationOverride ?? profile?.locationId;
    })
    .filter((value): value is string => Boolean(value));
  const locationPressureDelta = candidate.type === 'public_pressure_shift' ? 2 : 1;
  const publicHeatDelta =
    candidate.type === 'public_pressure_shift'
      ? 8
      : candidate.type === 'rumor_spread'
        ? 5
        : candidate.type === 'cover_up'
          ? 4
          : 2;
  const evidenceDecayDelta = candidate.type === 'evidence_hidden' ? 10 : candidate.type === 'cover_up' ? 4 : 0;

  for (const npcId of candidate.participants) {
    nextState = setNpcState(nextState, npcId, (entry) => {
      const nextThreat = clamp(entry.threat + threatDelta, 0, 100);
      const nextStance =
        nextThreat >= 70 ? 'hostile' : nextThreat >= 35 ? 'guarded' : 'open';

      npcThreatDeltas[npcId] = threatDelta;
      npcMoodChanges[npcId] = mood;

      return {
        ...entry,
        threat: nextThreat,
        stance: nextStance,
        mood,
        isAvailable:
          candidate.type === 'private_confrontation' && nextThreat >= 45
            ? false
            : entry.isAvailable,
        cooldownUntil:
          candidate.type === 'private_confrontation' && nextThreat >= 45
            ? {
                day: Math.min(nextState.timeline.totalDays, nextState.timeline.currentDay),
                slot: Math.min(
                  nextState.timeline.slotLabels.length - 1,
                  nextState.timeline.currentSlotIndex + 1
                ),
              }
            : entry.cooldownUntil,
      };
    });
  }

  nextState = setWorldPressure(nextState, (current) => {
    const rumorByNpc = { ...current.rumorByNpc };
    const locationPressure = { ...current.locationPressure };

    for (const npcId of candidate.participants) {
      rumorByNpc[npcId] = clamp((rumorByNpc[npcId] ?? 0) + 1, 0, 6);
    }

    for (const locationId of participantLocations) {
      locationPressure[locationId] = clamp((locationPressure[locationId] ?? 0) + locationPressureDelta, 0, 6);
    }

    return {
      publicHeat: clamp(current.publicHeat + publicHeatDelta, 0, 100),
      evidenceDecay: clamp(current.evidenceDecay + evidenceDecayDelta, 0, 100),
      rumorByNpc,
      locationPressure,
    };
  });

  return {
    state: nextState,
    effects: {
      npcThreatDeltas,
      npcMoodChanges,
      publicHeatDelta,
      evidenceDecayDelta,
      rumorDeltas: Object.fromEntries(candidate.participants.map((npcId) => [npcId, 1])),
      locationPressureDeltas: Object.fromEntries(participantLocations.map((locationId) => [locationId, locationPressureDelta])),
      fragmentSeeds: [
        candidate.type === 'private_confrontation'
          ? '一次私下对口供后的沉默'
          : candidate.type === 'evidence_hidden'
            ? '某份关键记录已经被人先一步动过'
            : candidate.type === 'cover_up'
              ? '几个人开始互相替对方挡话'
              : candidate.type === 'public_pressure_shift'
                ? '更大的公开压力正在成形'
          : '一段正在扩散、但谁都不愿明说的传闻',
      ],
    },
  };
}

export function simulateWorldEvents(params: {
  userId: string;
  sessionId: string;
  episode: EpisodeConfig;
  state: GameState;
  context: RuntimeTimeSlotContext;
}): WorldEventSimulationResult {
  const { episode, context, userId, sessionId } = params;
  let state = params.state;
  const candidates = collectCandidates(episode, state);

  if (candidates.length === 0) {
    return { state, events: [], notifications: [] };
  }

  const rotate = (context.toDay * 7 + context.toSlotIndex) % candidates.length;
  const ordered = [...candidates.slice(rotate), ...candidates.slice(0, rotate)];
  const selected = ordered.slice(0, Math.min(2, ordered.length));

  const events: WorldEventLog[] = [];
  const notifications: string[] = [];

  for (const candidate of selected) {
    const built = buildEventSummary(episode, candidate);
    const applied = applyEventEffects(state, episode, candidate);
    state = applied.state;

    const event: WorldEventLog = {
      id: crypto.randomUUID(),
      userId,
      sessionId,
      episodeId: episode.id,
      day: context.toDay,
      slot: context.toSlotIndex,
      type: candidate.type,
      participants: candidate.participants,
      summary: built.summary,
      publicHint: built.publicHint,
      effects: applied.effects,
      createdAt: Date.now(),
    };

    events.push(event);
    notifications.push(event.publicHint);
  }

  return {
    state,
    events,
    notifications,
  };
}
