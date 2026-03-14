import { EpisodeConfig, GameState, NpcState } from '../../types';
import { discoverClue } from '../../engine/game-state';
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

function clearFlag(state: GameState, flag: string): GameState {
  if (!state.flags[flag]) return state;
  const nextFlags = { ...state.flags };
  delete nextFlags[flag];
  return {
    ...state,
    flags: nextFlags,
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

  if (context.toDay !== 1) {
    return { state: nextState, notifications };
  }

  if (context.toSlotIndex === 1 && !nextState.flags.beat_morning_opinion) {
    nextState = setFlag(nextState, 'beat_morning_opinion');
    notifications.push(
      '【舆论发酵】广场上的口风开始往“先定罪再说”那边倒，诺拉一露面就容易被堵回去。再晚些，肯当面说话的人只会更少。建议优先接触诺拉或加雷斯。'
    );
  }

  if (context.toSlotIndex === 2 && !nextState.flags.beat_noon_medical_conflict) {
    nextState = setFlag(nextState, 'beat_noon_medical_conflict');
    notifications.push(
      '【证词冲突】诊所那边传出争执：伤口深浅和现有说法对不上。若不把伤情问实，后面的判断容易被带偏。建议先找米拉，再回案发点复查。'
    );
  }

  if (context.toSlotIndex === 3) {
    if (!nextState.flags.beat_afternoon_split) {
      nextState = setFlag(nextState, 'beat_afternoon_split');
      notifications.push(
        '【立场分裂】午后矿工之间先吵起来了：有人要先保住秩序，有人说不能把命糊过去。口风一乱，证词会更谨慎。建议先找加雷斯，再选一条证据线追深。'
      );
    }

    if (!nextState.flags.met_renn) {
      nextState = setFlag(nextState, 'renn_fleeing');
      notifications.push(
        '【时间敏感】后山道传来收拾行李的动静，像有人要趁天黑前离村。若要追雷恩，现在就是窗口。建议立刻去后山道，或先问清方向再追。'
      );
    }
  }

  if (context.toSlotIndex === 4) {
    if (!nextState.flags.beat_evening_pressure) {
      nextState = setFlag(nextState, 'beat_evening_pressure');
      notifications.push(
        '【舆论升温】广场上已经有人催着今晚把话定死。你不必立刻去广场，但从现在起，你的站位会被人记住。建议先补齐关键证据，再决定怎么表态。'
      );
    }

    nextState = clearFlag(nextState, 'renn_fleeing');

    if (!nextState.flags.met_renn) {
      nextState = setNpcState(nextState, 'renn', (renn) => ({
        ...renn,
        isAvailable: false,
        locationOverride: undefined,
      }));

      if (!nextState.flags.renn_escaped) {
        nextState = setFlag(nextState, 'renn_escaped');
        notifications.push(
          '【窗口关闭】傍晚传来消息：雷恩已经不在公开能找到的地方。若你还没拿到他的矛盾证词，后面只能更多依靠物证和时间线。'
        );
      }
    }
  }

  if (context.toSlotIndex === 5) {
    if (!nextState.flags.beat_night_father_daughter) {
      nextState = setFlag(nextState, 'beat_night_father_daughter');
      notifications.push(
        '【夜色压下来】天一黑，诺拉在宅邸外已经站不住了。再拖下去，你能从父女这条线上问到的话只会更少。建议尽快补完最后一条核心证据。'
      );
    }

    if (
      !nextState.discoveredClues.includes('B5') &&
      !nextState.flags.blood_clothes_destroyed
    ) {
      nextState = setFlag(nextState, 'blood_clothes_destroyed');
      notifications.push(
        '【证据损失】宅邸方向传来焦糊味，疑似衣物证据被销毁。与血衣相关的直接物证窗口已关闭。建议改走口供冲突与时间线反证。'
      );
    }
  }

  return { state: nextState, notifications };
}

function applyDynamicEvents(
  state: GameState,
  episode: EpisodeConfig,
  context: RuntimeActionContext
): RuntimeApplyResult {
  let nextState = state;
  const notifications: string[] = [];

  if (
    context.action.type === 'move' &&
    nextState.currentLocation === 'square' &&
    !nextState.flags.ep01_square_anchor_seen
  ) {
    nextState = setFlag(nextState, 'ep01_square_anchor_seen');
    notifications.push(
      '【广场口风】井边的人见诺拉过来就住了口，卖炭的把摊子往后挪开，谁都不肯多停一步。这里的话越晚越难问。建议尽快接触还愿意正面开口的人。'
    );
  }

  if (
    context.action.type === 'talk' &&
    context.action.target === 'nora' &&
    !nextState.flags.ep01_nora_anchor_seen
  ) {
    nextState = setFlag(nextState, 'ep01_nora_anchor_seen');
    notifications.push(
      '【旧铁戒】诺拉手里那枚旧铁戒被她攥得发亮。她翻来覆去说的只有一件事：先去见汉克。建议先下地窖，再回来补问她昨夜的细节。'
    );
  }

  if (
    context.action.type === 'move' &&
    nextState.currentLocation === 'elder_house' &&
    !nextState.flags.can_search_house
  ) {
    nextState = setFlag(nextState, 'can_search_house');
    notifications.push(
      '【权限开放】你已获得宅邸公开区域调查权限（大厅/二楼）。这是阶段性窗口，不代表所有房间都可直接拿到关键物证。建议优先检查雷恩房间相关异常。'
    );
  }

  if (
    context.action.type === 'talk' &&
    context.action.target === 'edmond' &&
    !nextState.flags.ep01_edmond_anchor_seen
  ) {
    nextState = setFlag(nextState, 'ep01_edmond_anchor_seen');
    notifications.push(
      '【艾德蒙的口风】艾德蒙翻来覆去只说“规矩”“大局”，可一提到雷恩就把话岔开。想从他手里拿到更多东西，先让他把话说满，再抓矛盾。'
    );
  }

  if (context.action.type === 'talk' && context.action.target === 'hank') {
    if (!nextState.flags.ep01_hank_anchor_seen) {
      nextState = setFlag(nextState, 'ep01_hank_anchor_seen');
      notifications.push(
        '【汉克先问的人】你一提诺拉，汉克先问的是她，而不是命案。要继续往下问，先把诺拉现在的处境和昨夜发生的事问清。'
      );
    }

    if (nextState.flags.beat_evening_pressure && !nextState.flags.hank_pressure_notice) {
      nextState = setFlag(nextState, 'hank_pressure_notice');
      notifications.push(
        '【沉默代价】汉克反复提外头催得越凶，越不能乱说。若你想继续问下去，先让他相信诺拉不会被这话牵进去。'
      );
    }
  }

  if (context.action.type === 'talk' && context.action.target === 'nora') {
    if (nextState.flags.beat_night_father_daughter && !nextState.flags.nora_breakdown_noted) {
      nextState = setFlag(nextState, 'nora_breakdown_noted');
      notifications.push(
        '【关系变化】诺拉哭过一场后反而不再乱说，只一遍遍问你见没见到汉克。此时比起再问“是谁干的”，更适合先谈怎么让人活过明天。'
      );
    }
  }

  if (nextState.flags.renn_fleeing && !nextState.flags.met_renn) {
    nextState = setNpcState(nextState, 'renn', (renn) => ({
      ...renn,
      locationOverride: 'mountain_path',
      isAvailable: true,
    }));

    if (
      nextState.currentLocation === 'mountain_path' &&
      !nextState.discoveredClues.includes('B8')
    ) {
      nextState = discoverClue(nextState, episode, 'B8');
      notifications.push(
        '【关键目击】你在山道撞见雷恩背包离村并出现明显异常反应。该信息可直接影响后续指控可信度。建议尽快固定关联证据，避免仅停留在主观印象。'
      );
    }
  }

  if (
    nextState.flags.met_renn &&
    nextState.npcStates['renn']?.locationOverride === 'mountain_path'
  ) {
    nextState = setNpcState(nextState, 'renn', (renn) => ({
      ...renn,
      locationOverride: undefined,
    }));
  }

  return { state: nextState, notifications };
}

export const ep01RuntimeHooks: EpisodeRuntimeHooks = {
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
    return emptyRuntimeResult(state);
  },
};
