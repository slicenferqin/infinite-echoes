import { EpisodeConfig, GameAction, GameState } from '../types';

export interface RuntimeApplyResult {
  state: GameState;
  notifications: string[];
}

export interface RuntimeActionContext {
  action: GameAction;
}

export interface RuntimeTimeSlotContext {
  fromDay: number;
  fromSlotIndex: number;
  toDay: number;
  toSlotIndex: number;
  crossDay: boolean;
}

export interface EpisodeRuntimeHooks {
  onRoundAdvanced?: (
    state: GameState,
    episode: EpisodeConfig
  ) => RuntimeApplyResult;
  onActionResolved?: (
    state: GameState,
    episode: EpisodeConfig,
    context: RuntimeActionContext
  ) => RuntimeApplyResult;
  onTimeSlotAdvanced?: (
    state: GameState,
    episode: EpisodeConfig,
    context: RuntimeTimeSlotContext
  ) => RuntimeApplyResult;
  onBeforeSettlement?: (
    state: GameState,
    episode: EpisodeConfig
  ) => RuntimeApplyResult;
}

export function emptyRuntimeResult(state: GameState): RuntimeApplyResult {
  return { state, notifications: [] };
}

export function mergeRuntimeResults(
  base: RuntimeApplyResult,
  incoming: RuntimeApplyResult
): RuntimeApplyResult {
  return {
    state: incoming.state,
    notifications: [...base.notifications, ...incoming.notifications],
  };
}
