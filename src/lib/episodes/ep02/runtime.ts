import { EpisodeConfig, GameState, NpcState, WorldPressureState } from '../../types';
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

function bumpWorldPressure(
  state: GameState,
  params: {
    publicHeat?: number;
    evidenceDecay?: number;
    npcIds?: string[];
    rumorDelta?: number;
    locationIds?: string[];
    locationDelta?: number;
  }
): GameState {
  const {
    publicHeat = 0,
    evidenceDecay = 0,
    npcIds = [],
    rumorDelta = 0,
    locationIds = [],
    locationDelta = 0,
  } = params;

  return setWorldPressure(state, (current) => {
    const rumorByNpc = { ...current.rumorByNpc };
    const locationPressure = { ...current.locationPressure };

    for (const npcId of npcIds) {
      rumorByNpc[npcId] = clamp((rumorByNpc[npcId] ?? 0) + rumorDelta, 0, 6);
    }

    for (const locationId of locationIds) {
      locationPressure[locationId] = clamp((locationPressure[locationId] ?? 0) + locationDelta, 0, 6);
    }

    return {
      publicHeat: clamp(current.publicHeat + publicHeat, 0, 100),
      evidenceDecay: clamp(current.evidenceDecay + evidenceDecay, 0, 100),
      rumorByNpc,
      locationPressure,
    };
  });
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
    nextState = bumpWorldPressure(nextState, {
      publicHeat: 12,
      evidenceDecay: 4,
      npcIds: ['weide', 'matthew', 'lina'],
      rumorDelta: 1,
      locationIds: ['harbor_gate', 'court_square', 'wharf_office'],
      locationDelta: 1,
    });
    notifications.push(
      '【窗口收缩】Day1 傍晚开始，港口开始统一口风。镇上更急着先找一个能挂责的人，魏德也明显进入“先保自己”的状态。'
    );
  }

  if (context.toDay === 2 && context.toSlotIndex === 1 && !nextState.flags.weide_guarded_shift) {
    nextState = setFlag(nextState, 'weide_guarded_shift');
    nextState = bumpWorldPressure(nextState, {
      publicHeat: 8,
      evidenceDecay: 6,
      npcIds: ['weide', 'noel'],
      rumorDelta: 1,
      locationIds: ['wharf_office', 'notary_hall'],
      locationDelta: 1,
    });

    if (!nextState.flags.met_weide) {
      nextState = setNpcState(nextState, 'weide', (weide) => ({
        ...weide,
        mood: 'guarded',
        trust: Math.max(0, weide.trust - 10),
        threat: Math.min(100, weide.threat + 14),
        stance: 'guarded',
      }));

      notifications.push(
        '【证人改口风险】进入 Day2 上午后，你仍未与魏德建立接触。港口已经决定先保链条，魏德开始按“自保口径”说话，后续取证成本明显上升。'
      );
    } else {
      notifications.push(
        '【结构自保】进入 Day2 上午后，港口已经不再等你慢慢查。即便你接触过关键人，很多说法也会开始自动收紧。'
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
    nextState = bumpWorldPressure(nextState, {
      publicHeat: 10,
      evidenceDecay: 20,
      npcIds: ['noel', 'matthew'],
      rumorDelta: 1,
      locationIds: ['notary_hall', 'court_square'],
      locationDelta: 2,
    });
    notifications.push(
      '【不可逆损失】Day2 傍晚，公证所一批账页被焚毁。灰石港开始优先保护记录层体面，暗账与旧案的直接物证窗口迅速关闭，你必须改走人证和时间线反证。'
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
    context.action.target === 'lina' &&
    nextState.npcStates.lina?.trust >= 58 &&
    nextState.flags.lead_guardianship_chain &&
    !nextState.flags.proved_lina_non_profit
  ) {
    nextState = setFlag(nextState, 'proved_lina_non_profit');
    notifications.push('莉娜把话说死了：“我认违规，但不是为了钱。” 你正式坐实了她的行为动机并非个人牟利。');
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
    nextState.flags.lead_guardianship_chain &&
    !nextState.flags.protected_azhe_guardianship
  ) {
    nextState = setFlag(nextState, 'protected_azhe_guardianship');
    notifications.push('阿哲终于点头，同意由你代为提交监护保护申请。你已形成“先保孩子”的公开立场。');
  }

  if (
    context.action.type === 'talk' &&
    (context.action.target === 'noel' || context.action.target === 'matthew') &&
    nextState.flags.found_duplicate_receipt &&
    nextState.flags.can_search_notary_archive &&
    !nextState.flags.suspects_tampered_record
  ) {
    const trust =
      context.action.target === 'noel'
        ? nextState.npcStates.noel?.trust ?? 0
        : nextState.npcStates.matthew?.trust ?? 0;

    if (trust >= 64) {
      nextState = setFlag(nextState, 'suspects_tampered_record');
      notifications.push(
        '你把双回执和调档记录对到一起后，终于有人承认：问题可能不只是谁晚送了回执，而是谁一直在替结论写版本。'
      );
    }
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

  if (
    context.action.type === 'talk' &&
    context.action.target === 'matthew' &&
    nextState.npcStates.matthew?.trust >= 74 &&
    nextState.flags.found_notary_ledger &&
    nextState.flags.found_pattern_cases &&
    nextState.flags.exposed_proxy_network &&
    !nextState.flags.exposed_notary_ring
  ) {
    nextState = setFlag(nextState, 'exposed_notary_ring');
    notifications.push('马修把暗账、旧案和口供重新排成一列：“这不是单点违规，是公证与代投一起养出来的链条。” 结构闭环已成立。');
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
        notifications: ['你已经看见了记录裂缝，却还没把它推到能公开质询的程度。若现在结算，这份怀疑只会停留在你心里。'],
      };
    }

    return emptyRuntimeResult(state);
  },
};
