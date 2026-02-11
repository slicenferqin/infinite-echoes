import { EpisodeConfig, GameState, NpcState } from '../../types';
import {
  EpisodeRuntimeHooks,
  RuntimeActionContext,
  RuntimeApplyResult,
  RuntimeTimeSlotContext,
  emptyRuntimeResult,
} from '../../engine/runtime';

function setFlag(state: GameState, flag: string): GameState {
  if (!flag || state.flags[flag]) return state;
  return {
    ...state,
    flags: {
      ...state.flags,
      [flag]: true,
    },
  };
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

function applySlotEvents(
  state: GameState,
  _episode: EpisodeConfig,
  context: RuntimeTimeSlotContext
): RuntimeApplyResult {
  let nextState = state;
  const notifications: string[] = [];

  if (context.toDay === 1 && context.toSlotIndex === 4 && !nextState.flags.weide_pressure_started) {
    nextState = setFlag(nextState, 'weide_pressure_started');
    nextState = setNpcState(nextState, 'weide', (weide) => ({
      ...weide,
      mood: 'guarded',
      threat: Math.min(100, weide.threat + 12),
      stance: weide.threat + 12 >= 35 ? 'guarded' : weide.stance,
    }));
    notifications.push(
      '【窗口收缩】Day1 傍晚开始，码头传出“统一口风”的消息。魏德明显更紧绷，若再拖延，他会优先自保。'
    );
  }

  if (context.toDay === 2 && context.toSlotIndex === 1 && !nextState.flags.weide_guarded_shift) {
    nextState = setFlag(nextState, 'weide_guarded_shift');

    if (!nextState.flags.met_weide) {
      nextState = setNpcState(nextState, 'weide', (weide) => ({
        ...weide,
        mood: 'guarded',
        trust: Math.max(0, weide.trust - 10),
        threat: Math.min(100, weide.threat + 14),
        stance: 'guarded',
      }));

      notifications.push(
        '【证人改口风险】进入 Day2 上午后，你仍未与魏德建立接触。他开始按“自保口径”说话，后续取证成本明显上升。'
      );
    }
  }

  if (context.toDay === 2 && context.toSlotIndex === 4 && !nextState.flags.notary_books_burned) {
    nextState = setFlag(nextState, 'notary_books_burned');
    nextState = setNpcState(nextState, 'noel', (noel) => ({
      ...noel,
      mood: 'shaken',
      threat: Math.min(100, noel.threat + 10),
      stance: 'guarded',
    }));
    notifications.push(
      '【不可逆损失】Day2 傍晚，公证所一批账页被焚毁。暗账与旧案的直接物证窗口开始关闭，必须立刻改走人证和时间线反证。'
    );
  }

  return { state: nextState, notifications };
}

function applyDynamicEvents(
  state: GameState,
  _episode: EpisodeConfig,
  context: RuntimeActionContext
): RuntimeApplyResult {
  let nextState = state;
  const notifications: string[] = [];

  if (
    context.action.type === 'move' &&
    nextState.currentLocation === 'old_warehouse' &&
    !nextState.flags.lead_warehouse_key
  ) {
    notifications.push(
      '【现场反馈】仓门口只有锈迹和封条痕，没有钥匙链线索时，你在这里很难拿到能入档的关键物证。'
    );
  }

  if (
    context.action.type === 'talk' &&
    context.action.target === 'matthew' &&
    nextState.npcStates.matthew?.trust >= 70 &&
    !nextState.flags.can_search_notary_archive
  ) {
    nextState = setFlag(nextState, 'can_search_notary_archive');
    notifications.push('马修把调档印章推给你：“去查，但每一页都要能复核。”');
  }

  if (
    context.action.type === 'talk' &&
    context.action.target === 'azhe' &&
    nextState.npcStates.azhe?.trust >= 70 &&
    !nextState.flags.protected_azhe_guardianship
  ) {
    nextState = setFlag(nextState, 'protected_azhe_guardianship');
    notifications.push('阿哲终于点头，同意由你代为提交监护保护申请。你已形成“先保孩子”的公开立场。');
  }

  if (
    context.action.type === 'talk' &&
    context.action.target === 'noel' &&
    nextState.npcStates.noel?.trust >= 72 &&
    nextState.flags.found_notary_ledger &&
    nextState.flags.found_pattern_cases &&
    !nextState.flags.exposed_notary_ring
  ) {
    nextState = setFlag(nextState, 'exposed_notary_ring');
    notifications.push('诺埃尔低声补上一句：费码与旧案重组来自同一条指令链。你拿到了“公证-代投勾连”闭环。');
  }

  return { state: nextState, notifications };
}

export const ep02RuntimeHooks: EpisodeRuntimeHooks = {
  onRoundAdvanced(state: GameState) {
    return emptyRuntimeResult(state);
  },
  onActionResolved(state: GameState, episode: EpisodeConfig, context: RuntimeActionContext) {
    return applyDynamicEvents(state, episode, context);
  },
  onTimeSlotAdvanced(state: GameState, episode: EpisodeConfig, context: RuntimeTimeSlotContext) {
    return applySlotEvents(state, episode, context);
  },
  onBeforeSettlement(state: GameState) {
    if (state.flags.found_duplicate_receipt && !state.flags.suspects_tampered_record) {
      return {
        state,
        notifications: ['你盯着那两份同编号回执，心里冒出一个念头：也许被改写的不只是案件，而是记录本身。'],
      };
    }

    return emptyRuntimeResult(state);
  },
};
