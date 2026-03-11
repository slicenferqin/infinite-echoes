import { EpisodeConfig, GameState, NpcState } from '../types';
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
        const type: WorldEventType = edge.heat >= 68 ? 'private_confrontation' : 'rumor_spread';
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

  return {
    summary: `${pair}之间的说法开始互相传递，周围口风随之变得更保守。`,
    publicHint: `【口风变化】围绕${pair}的一段说法开始扩散，和他们再谈时，你会更难直接撬开关键句。`,
  };
}

function applyEventEffects(
  state: GameState,
  candidate: CandidateInteraction
): { state: GameState; effects: WorldEventLog['effects'] } {
  const threatDelta = candidate.type === 'private_confrontation' ? 5 : 3;
  const mood = candidate.type === 'private_confrontation' ? 'guarded' : 'wary';

  let nextState = state;
  const npcThreatDeltas: Record<string, number> = {};
  const npcMoodChanges: Record<string, string> = {};

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
      };
    });
  }

  return {
    state: nextState,
    effects: {
      npcThreatDeltas,
      npcMoodChanges,
      fragmentSeeds: [
        candidate.type === 'private_confrontation'
          ? '一次私下对口供后的沉默'
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
    const applied = applyEventEffects(state, candidate);
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
