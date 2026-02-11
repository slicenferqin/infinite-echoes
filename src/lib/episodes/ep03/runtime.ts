import { EpisodeConfig, GameState, GovernanceLedger, NpcState } from '../../types';
import {
  EpisodeRuntimeHooks,
  RuntimeActionContext,
  RuntimeApplyResult,
  RuntimeTimeSlotContext,
  emptyRuntimeResult,
} from '../../engine/runtime';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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

function ensureGovernanceLedger(state: GameState): GovernanceLedger {
  return (
    state.governanceLedger ?? {
      order: 50,
      humanity: 50,
      survival: 50,
    }
  );
}

function applyGovernanceDelta(
  state: GameState,
  delta: Partial<GovernanceLedger>
): { state: GameState; note?: string } {
  const current = ensureGovernanceLedger(state);
  const next: GovernanceLedger = {
    order: clamp(current.order + (delta.order ?? 0), 0, 100),
    humanity: clamp(current.humanity + (delta.humanity ?? 0), 0, 100),
    survival: clamp(current.survival + (delta.survival ?? 0), 0, 100),
  };

  if (
    next.order === current.order &&
    next.humanity === current.humanity &&
    next.survival === current.survival
  ) {
    return { state };
  }

  const buildDeltaText = (key: keyof GovernanceLedger, label: string): string => {
    const change = next[key] - current[key];
    if (change === 0) return '';
    return `${label}${change > 0 ? '+' : ''}${change}`;
  };

  const parts = [
    buildDeltaText('order', '秩序'),
    buildDeltaText('humanity', '人性'),
    buildDeltaText('survival', '生存'),
  ].filter(Boolean);

  return {
    state: {
      ...state,
      governanceLedger: next,
    },
    note:
      parts.length > 0
        ? `【治理指标变化】${parts.join(' / ')}（当前：秩序 ${next.order} · 人性 ${next.humanity} · 生存 ${next.survival}）`
        : undefined,
  };
}

function forceTimelineClosure(state: GameState): GameState {
  const slotCount = Math.max(1, state.timeline.slotLabels.length);
  const totalSec = Math.max(1, state.timeline.dayDurationSec * state.timeline.totalDays);

  return {
    ...state,
    timeline: {
      ...state.timeline,
      currentDay: state.timeline.totalDays,
      currentSlotIndex: slotCount - 1,
      elapsedSecTotal: totalSec,
      remainingSecTotal: 0,
      remainingSecInDay: 0,
    },
  };
}

function applyGovernanceMilestones(state: GameState): RuntimeApplyResult {
  let nextState = state;
  const notifications: string[] = [];

  const milestones: Array<{
    gate: boolean;
    appliedFlag: string;
    delta: Partial<GovernanceLedger>;
  }> = [
    { gate: nextState.discoveredClues.includes('B1'), appliedFlag: 'gov_applied_b1', delta: { order: 8 } },
    { gate: nextState.discoveredClues.includes('B2'), appliedFlag: 'gov_applied_b2', delta: { humanity: 10 } },
    { gate: nextState.discoveredClues.includes('B3'), appliedFlag: 'gov_applied_b3', delta: { survival: 6, order: -2 } },
    { gate: nextState.discoveredClues.includes('B4'), appliedFlag: 'gov_applied_b4', delta: { humanity: 6, order: -1 } },
    { gate: nextState.discoveredClues.includes('B5'), appliedFlag: 'gov_applied_b5', delta: { order: 5, survival: 4 } },
    { gate: nextState.discoveredClues.includes('C1'), appliedFlag: 'gov_applied_c1', delta: { survival: 5, order: -2 } },
    { gate: nextState.discoveredClues.includes('C2'), appliedFlag: 'gov_applied_c2', delta: { survival: 12, humanity: 2, order: -4 } },
    { gate: nextState.discoveredClues.includes('C3'), appliedFlag: 'gov_applied_c3', delta: { order: 8, survival: -2 } },
    { gate: nextState.discoveredClues.includes('C4'), appliedFlag: 'gov_applied_c4', delta: { humanity: 7, order: -3 } },
    { gate: nextState.discoveredClues.includes('C5'), appliedFlag: 'gov_applied_c5', delta: { humanity: 6, survival: 6, order: -3 } },
  ];

  for (const milestone of milestones) {
    if (!milestone.gate || nextState.flags[milestone.appliedFlag]) continue;
    nextState = setFlag(nextState, milestone.appliedFlag);
    const applied = applyGovernanceDelta(nextState, milestone.delta);
    nextState = applied.state;
    if (applied.note) {
      notifications.push(applied.note);
    }
  }

  return {
    state: nextState,
    notifications,
  };
}

function applySlotEvents(
  state: GameState,
  _episode: EpisodeConfig,
  context: RuntimeTimeSlotContext
): RuntimeApplyResult {
  let nextState = state;
  const notifications: string[] = [];

  if (context.toDay === 2 && context.toSlotIndex === 4 && !nextState.flags.yulan_guardianship_frozen) {
    nextState = setFlag(nextState, 'yulan_guardianship_frozen');
    nextState = setNpcState(nextState, 'yulan', (npc) => ({
      ...npc,
      mood: 'shaken',
      threat: clamp(npc.threat + 8, 0, 100),
      stance: npc.threat + 8 >= 35 ? 'guarded' : npc.stance,
    }));
    notifications.push('【窗口收缩】Day2 傍晚，余岚的临时抚养资格被系统冻结。社区开始逼她签“替代监护协议”。');

    const governance = applyGovernanceDelta(nextState, { humanity: -6, order: 3 });
    nextState = governance.state;
    if (governance.note) notifications.push(governance.note);
  }

  if (context.toDay === 3 && context.toSlotIndex === 5 && !nextState.flags.gray_market_window_shrunk) {
    nextState = setFlag(nextState, 'gray_market_window_shrunk');

    if (!nextState.flags.met_zheya) {
      nextState = setNpcState(nextState, 'zheya', (npc) => ({
        ...npc,
        mood: 'guarded',
        trust: clamp(npc.trust - 12, 0, 100),
        threat: clamp(npc.threat + 10, 0, 100),
        stance: 'guarded',
      }));
      notifications.push('【证人收口】Day3 夜间，灰市开始统一口风。你尚未接触折鸦，后续口供将明显更保守。');
    }
  }

  if (context.toDay === 4 && context.toSlotIndex === 2 && !nextState.flags.defense_detail_trimmed) {
    nextState = setFlag(nextState, 'defense_detail_trimmed');
    notifications.push('【记录裁剪】Day4 正午，防线伤亡明细被系统裁剪。若你还没取到黑匣子关键日志，部分真相将不可逆丢失。');

    const governance = applyGovernanceDelta(nextState, { survival: -6 });
    nextState = governance.state;
    if (governance.note) notifications.push(governance.note);
  }

  if (context.toDay === 5 && context.toSlotIndex === 4 && !nextState.flags.core_backdoor_patched) {
    nextState = setFlag(nextState, 'core_backdoor_patched');
    notifications.push('【路径变化】Day5 傍晚，核心维护后门被补丁封死。未固定的后门证据窗口已关闭。');

    const governance = applyGovernanceDelta(nextState, { order: 4, humanity: -3 });
    nextState = governance.state;
    if (governance.note) notifications.push(governance.note);
  }

  if (context.toDay === 6 && context.toSlotIndex === 5 && !nextState.flags.supply_reroute_finalized) {
    nextState = setFlag(nextState, 'supply_reroute_finalized');
    notifications.push('【链路改写】Day6 夜间，配给路由被重定向。部分旧记录与镜像证据失去时效。');

    const governance = applyGovernanceDelta(nextState, { order: 2, humanity: -4, survival: 2 });
    nextState = governance.state;
    if (governance.note) notifications.push(governance.note);
  }

  if (context.toDay === 7 && context.toSlotIndex === 4 && !nextState.flags.tribunal_auto_closed) {
    nextState = setFlag(nextState, 'tribunal_auto_closed');
    nextState = forceTimelineClosure(nextState);
    notifications.push('【系统闭合】Day7 傍晚，审理窗口自动闭合。你当前动作结束后将直接进入结算。');
  }

  const governanceMilestones = applyGovernanceMilestones(nextState);
  nextState = governanceMilestones.state;
  notifications.push(...governanceMilestones.notifications);

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
    context.action.type === 'talk' &&
    context.action.target === 'yulan' &&
    nextState.npcStates.yulan?.trust >= 70 &&
    !nextState.flags.protected_yulan_guardianship
  ) {
    nextState = setFlag(nextState, 'protected_yulan_guardianship');
    notifications.push('【监护保全】余岚同意把监护保全申请交由你提交。母子线进入可逆转状态。');
  }

  if (
    context.action.type === 'talk' &&
    context.action.target === 'yanche' &&
    nextState.npcStates.yanche?.trust >= 65 &&
    nextState.flags.formed_civic_consensus &&
    !nextState.flags.civic_review_started
  ) {
    nextState = setFlag(nextState, 'civic_review_started');
    notifications.push('【程序松动】严彻接受社区联名复议，审理从“单案定性”转为“结构复核”。');
  }

  if (
    context.action.type === 'talk' &&
    context.action.target === 'aji' &&
    nextState.npcStates.aji?.trust >= 72 &&
    nextState.flags.found_zero_layer_protocol &&
    !nextState.flags.recognized_layer_tamper
  ) {
    nextState = setFlag(nextState, 'recognized_layer_tamper');
    notifications.push('【层级确认】阿寂承认零层双账本存在结构性改写，你拿到了“记录被替写”的关键承认。');
  }

  const governanceMilestones = applyGovernanceMilestones(nextState);
  nextState = governanceMilestones.state;
  notifications.push(...governanceMilestones.notifications);

  return { state: nextState, notifications };
}

export const ep03RuntimeHooks: EpisodeRuntimeHooks = {
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
    if (state.flags.found_zero_layer_protocol && !state.flags.recognized_layer_tamper) {
      return {
        state: setFlag(state, 'recognized_layer_tamper'),
        notifications: ['你盯着第零层双账本，终于确认：被改写的不只是结果，而是“谁有资格被看见”。'],
      };
    }

    return emptyRuntimeResult(state);
  },
};
