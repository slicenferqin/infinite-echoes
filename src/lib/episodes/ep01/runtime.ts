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
      '【舆论发酵】广场口风开始偏向“先定罪再说”，诺拉正承受当面指责。你接下来的对话立场会影响谁愿意继续开口。建议优先接触诺拉或加雷斯，先稳住人证链。'
    );
  }

  if (context.toSlotIndex === 2 && !nextState.flags.beat_noon_medical_conflict) {
    nextState = setFlag(nextState, 'beat_noon_medical_conflict');
    notifications.push(
      '【证词冲突】诊所传出争论：伤情判断与现有口供对不上。若你只追口风，不补医学侧证，后续推理会偏。建议先找米拉核对伤情，再回到案发点复查。'
    );
  }

  if (context.toSlotIndex === 3) {
    if (!nextState.flags.beat_afternoon_split) {
      nextState = setFlag(nextState, 'beat_afternoon_split');
      notifications.push(
        '【立场分裂】午后矿工内部口风出现分裂：有人要“保秩序”，有人要“保人命”。你若不尽快建立可信立场，后续证词会更保守。建议先和加雷斯沟通，再选择一条证据线深入。'
      );
    }

    if (!nextState.flags.met_renn) {
      nextState = setFlag(nextState, 'renn_fleeing');
      notifications.push(
        '【时间敏感】你听见后山道有收拾行李的动静，疑似有人准备离村。若要锁定雷恩动向，需在傍晚前处理。建议立刻前往后山道，或先问到更具体方向再追。'
      );
    }
  }

  if (context.toSlotIndex === 4) {
    if (!nextState.flags.beat_evening_pressure) {
      nextState = setFlag(nextState, 'beat_evening_pressure');
      notifications.push(
        '【舆论升温】广场出现“今晚定性”的集体施压。你不必立刻去广场；但从现在开始，你与NPC的对话取向和最终提交都会被视为公开表态。建议优先补齐关键证据，再决定裁断立场。'
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
          '【窗口关闭】傍晚矿道口传来消息：雷恩已失去公开接触窗口。若你尚未拿到其关键矛盾证词，本局翻案难度将明显上升。建议转向物证链与汉克沉默成因。'
        );
      }
    }
  }

  if (context.toSlotIndex === 5) {
    if (!nextState.flags.beat_night_father_daughter) {
      nextState = setFlag(nextState, 'beat_night_father_daughter');
      notifications.push(
        '【情感临界】入夜前诺拉情绪崩溃，父女线已到临界点。若你仍未补足关键证据，最终裁断会更容易滑向程序定性。建议优先完成最后一条核心证据链。'
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
      '【先开审的是村子】广场上没人正式宣布汉克有罪，可你一路走过去，井边有人看见诺拉就闭了嘴，卖炭的人把摊子往后挪，像怕和她扯上关系。这里最可怕的不是骂声，而是很多人明知不对，也先往后退了一步。'
    );
  }

  if (
    context.action.type === 'talk' &&
    context.action.target === 'nora' &&
    !nextState.flags.ep01_nora_anchor_seen
  ) {
    nextState = setFlag(nextState, 'ep01_nora_anchor_seen');
    notifications.push(
      '【她押上的是最后一点体面】诺拉掌心那枚旧铁戒已经被捏得发亮。你忽然意识到，她不是在找人替自己伸冤，她是在赌父亲还能不能活到明天。'
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
      '【另一种父亲】艾德蒙嘴里全是“规矩”和“大局”，可你听得出来，他每一句都像在把雷恩往自己身后藏。这个人不只是村长，也是已经错到回不了头的父亲。'
    );
  }

  if (context.action.type === 'talk' && context.action.target === 'hank') {
    if (!nextState.flags.ep01_hank_anchor_seen) {
      nextState = setFlag(nextState, 'ep01_hank_anchor_seen');
      notifications.push(
        '【先问的不是命案】你刚提到诺拉掌心那枚旧铁戒，汉克喉结就滚了一下。那是他十岁那年亲手给她打的，尺寸早就不合了，她却一直舍不得丢。你一下明白，他沉默里护着的首先不是自己，而是女儿。'
      );
    }

    if (nextState.flags.beat_evening_pressure && !nextState.flags.hank_pressure_notice) {
      nextState = setFlag(nextState, 'hank_pressure_notice');
      notifications.push(
        '【沉默代价】汉克明确表达“外头越催，越不能乱开口”。这代表他更在意家人连坐风险而非自证清白。建议先证明你能保护诺拉处境，再追问核心事实。'
      );
    }
  }

  if (context.action.type === 'talk' && context.action.target === 'nora') {
    if (nextState.flags.beat_night_father_daughter && !nextState.flags.nora_breakdown_noted) {
      nextState = setFlag(nextState, 'nora_breakdown_noted');
      notifications.push(
        '【关系变化】诺拉从崩溃转为“硬撑”状态，说明她愿意承担乡评压力保父亲。此时更适合用“如何救人”的问题推进，而非重复追问“是不是他干的”。'
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
