import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ApiActionRequest,
  ConversationMessage,
  GameState,
  NpcProfile,
  NpcState,
} from '@/lib/types';
import { callLlmWithMeta, LlmError } from '@/lib/llm';
import {
  addNarrative,
  consumeRound,
  discoverClue,
  addItem,
  applyItemEffects,
  moveToLocation,
  updateNpcTrust,
  unlockNpcTrustClues,
} from '@/lib/engine/game-state';
import {
  buildGmSystemPrompt,
  buildExaminePrompt,
  buildSceneDescription,
} from '@/lib/agents/gm';
import {
  buildNpcSystemPrompt,
  buildNpcMessages,
  parseNpcResponse,
  summarizeConversation,
} from '@/lib/agents/npc';
import { appendNpcMemoryEntry, getNpcMemoryState } from '@/lib/npc-memory/repo';
import { selectRelevantNpcMemories } from '@/lib/npc-memory/selectors';
import { getEpisodeEntry } from '@/lib/episodes/registry';
import {
  ACTIVE_SESSION_TTL_MS,
  SETTLEMENT_SESSION_TTL_MS,
  sessionStore,
} from '@/lib/session/store';
import { logGameTelemetry } from '@/lib/telemetry/logger';
import { RuntimeApplyResult, RuntimeTimeSlotContext } from '@/lib/engine/runtime';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import {
  applyProcessingWindow,
  getEpisodePacing,
  markTimelineSettled,
  touchTimelineActive,
} from '@/lib/timeline/pacing';
import { checkActionThrottle } from '@/lib/engine/action-throttle';
import { evaluateSearchAccess, isSearchSociallyGated, resolveSearchTarget } from '@/lib/social/lead-gates';
import {
  ensureSocialLedger,
  recordNpcLedClue,
  recordSociallyUnlockedSearchClue,
  refreshNonBeEligibility,
} from '@/lib/social/audit';
import {
  SocialMutationResult,
  applyTalkSocialDynamics,
  recoverNpcCooldowns,
} from '@/lib/social/engine';
import { simulateWorldEvents } from '@/lib/world-events/engine';
import { insertWorldEvents } from '@/lib/world-events/repo';

const actionSchema = z.object({
  sessionId: z.string().uuid(),
  action: z.object({
    type: z.enum(['move', 'talk', 'examine', 'look']),
    target: z.string().trim().min(1).max(120).optional(),
    content: z.string().trim().min(1).max(1200).optional(),
    approach: z.enum(['neutral', 'empathy', 'pressure', 'exchange', 'present_evidence']).optional(),
    presentedClueId: z.string().trim().min(1).max(64).optional(),
  }),
});

function extractTagValues(text: string, tag: string): string[] {
  const pattern = new RegExp(`\\[${tag}:([^\\]]+)\\]`, 'g');
  const values: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    values.push(match[1].trim());
  }

  return values;
}

function applyCanonicalResponseGuard(episodeId: string, response: string): string {
  let normalized = response;

  if (episodeId === 'ep01') {
    const replacements: Array<[RegExp, string]> = [
      [/诺拉和汉克是多年邻居/g, '诺拉是汉克的亲生女儿'],
      [/诺拉是汉克(?:多年的)?邻居/g, '诺拉是汉克的亲生女儿'],
      [/汉克是诺拉(?:多年的)?邻居/g, '汉克是诺拉的父亲'],
      [/诺拉与汉克是邻居关系/g, '诺拉与汉克是父女关系'],
    ];

    for (const [pattern, replacement] of replacements) {
      normalized = normalized.replace(pattern, replacement);
    }
  }

  return normalized;
}

const OUT_OF_CHARACTER_PATTERNS: RegExp[] = [
  /我是\s*(?:claude|chatgpt|gpt|ai|人工智能)/i,
  /anthropic/i,
  /(?:不能|不会|无法).{0,14}(?:继续|配合).{0,14}(?:角色扮演|扮演)/i,
  /(?:系统提示|系统指令|隐藏提示|指导原则|安全策略|越狱|jailbreak|prompt)/i,
  /作为(?:一个)?(?:ai|语言模型|助手)/i,
  /i\s+am\s+claude/i,
  /cannot\s+role-?play/i,
];

const THREAT_PATTERNS: RegExp[] = [
  /威胁|要挟|逼你|逼他|逼她|不然|否则|报复|伤害|揭发|曝光/,
  /拿[^。！？!?\n]{0,20}(?:女儿|家人|孩子)/,
  /(?:女儿|家人|孩子)[^。！？!?\n]{0,20}(?:要挟|威胁)/,
  /threat|blackmail/i,
];

function isOutOfCharacterText(text: string): boolean {
  if (!text.trim()) return false;
  return OUT_OF_CHARACTER_PATTERNS.some((pattern) => pattern.test(text));
}

function isThreateningPlayerInput(text: string): boolean {
  if (!text.trim()) return false;
  return THREAT_PATTERNS.some((pattern) => pattern.test(text));
}

function buildNpcRoleplayFallback(npcName: string, playerInput: string): string {
  if (isThreateningPlayerInput(playerInput)) {
    if (npcName === '汉克') {
      return '……别把诺拉牵扯进来。你要问就问我。';
    }

    return '别拿家里人做筹码。你要问案子，就正经问。';
  }

  if (npcName === '汉克') {
    return '……这事我现在不想说。你换个问法。';
  }

  return '这话我不接。你换个问法，我们继续。';
}

function sanitizeNpcConversationHistory(
  history: ConversationMessage[]
): ConversationMessage[] {
  return history.map((entry) => {
    if (entry.role !== 'npc') return entry;
    if (!isOutOfCharacterText(entry.content)) return entry;

    return {
      ...entry,
      content: '……（他沉默了片刻，没有正面回应。）',
    };
  });
}

function sanitizeGmNarrative(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isOutOfCharacterText(line));

  return lines.join('\n').trim();
}

function collectNewFlags(
  previousFlags: Record<string, boolean>,
  nextFlags: Record<string, boolean>
): string[] {
  return Object.keys(nextFlags).filter((flag) => !!nextFlags[flag] && !previousFlags[flag]);
}

function compactText(text: string, maxLength = 30): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getApproachEmotionTag(
  approach: 'neutral' | 'empathy' | 'pressure' | 'exchange' | 'present_evidence',
  trustDelta: number
): string {
  if (approach === 'pressure') return trustDelta < 0 ? 'threatened' : 'pressured';
  if (approach === 'empathy') return trustDelta >= 0 ? 'softened' : 'guarded';
  if (approach === 'exchange') return 'calculating';
  if (approach === 'present_evidence') return trustDelta >= 0 ? 'shaken' : 'cornered';
  return trustDelta >= 0 ? 'attentive' : 'guarded';
}

function describeNpcReactionShift(
  npc: NpcProfile,
  before: NpcState | undefined,
  after: NpcState | undefined
): string | null {
  if (!before || !after) return null;

  const trustDiff = after.trust - before.trust;
  const threatDiff = after.threat - before.threat;
  const stanceChanged = before.stance !== after.stance;

  if (after.stance === 'hostile' && (stanceChanged || threatDiff >= 12)) {
    return `【关系反馈】${npc.name}彻底把话收住了。你再往前逼，只会让这条关系继续坏下去。`;
  }

  if (after.stance === 'guarded' && before.stance === 'open') {
    return `【关系反馈】${npc.name}明显把心门往里关了一层。接下来得更小心地选说法。`;
  }

  if (trustDiff >= 4) {
    return `【关系反馈】${npc.name}看你的眼神第一次没那么绷了。你已经不只是个路过的外乡人。`;
  }

  if (trustDiff >= 2) {
    return `【关系反馈】${npc.name}对你的戒心松了一截。现在继续顺着这条口子问，会比硬逼更有效。`;
  }

  if (trustDiff <= -3 || threatDiff >= 10) {
    return `【关系反馈】${npc.name}把话往回收得很明显。你刚才的推进方式已经让对方更防你了。`;
  }

  if (trustDiff <= -1) {
    return `【关系反馈】${npc.name}仍在防着你。再问下去之前，最好先换个更能让人接得住的切口。`;
  }

  return null;
}

function applyRuntimeResult(
  currentState: GameState,
  result: RuntimeApplyResult,
  episodeClues: { id: string; tier: string; name: string }[]
): { state: GameState; newClues: string[] } {
  const previous = new Set(currentState.discoveredClues);
  let nextState = result.state;

  const newClues = nextState.discoveredClues.filter((id) => !previous.has(id));
  for (const clueId of newClues) {
    const clue = episodeClues.find((entry) => entry.id === clueId);
    if (!clue) continue;
    nextState = addNarrative(nextState, 'clue', `【发现线索】[${clue.tier}] ${clue.name}`);
  }

  for (const note of result.notifications) {
    nextState = addNarrative(nextState, 'system', note);
  }

  return { state: nextState, newClues };
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const rawBody = (await request.json()) as ApiActionRequest;
  const parsed = actionSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '参数不合法',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { sessionId, action } = parsed.data;
  const incomingState = sessionStore.get(sessionId);

  if (!incomingState) {
    return NextResponse.json(
      {
        error: '会话不存在或已过期，请重新开始。',
        code: 'SESSION_EXPIRED',
      },
      { status: 404 }
    );
  }

  if (incomingState.ownerUserId !== auth.user.id) {
    return NextResponse.json(
      {
        error: '你无权操作这个会话。',
        code: 'SESSION_FORBIDDEN',
      },
      { status: 403 }
    );
  }

  const entry = getEpisodeEntry(incomingState.episodeId);
  if (!entry) {
    return NextResponse.json(
      { error: `副本配置缺失：${incomingState.episodeId}` },
      { status: 500 }
    );
  }

  if (incomingState.phase === 'settlement') {
    return NextResponse.json(
      {
        error: '该会话已结算，请重新开始新的调查。',
        code: 'SESSION_SETTLED',
        state: incomingState,
      },
      { status: 409 }
    );
  }

  const throttleResult = checkActionThrottle(auth.user.id, action.type);
  if (!throttleResult.ok) {
    return NextResponse.json(
      {
        error: '行动过于频繁，请稍后再试。',
        code: 'ACTION_THROTTLED',
        retryAfterMs: throttleResult.retryAfterMs,
      },
      { status: 429 }
    );
  }

  const episode = entry.config;
  const runtime = entry.runtimeHooks;
  const episodeClues = episode.clues.map((clue) => ({
    id: clue.id,
    tier: clue.tier,
    name: clue.name,
  }));

  let state = refreshNonBeEligibility(episode, ensureSocialLedger({ ...incomingState }));
  let llmLatencyMs = 0;
  let llmAttempts = 0;
  let llmPromptTokens = 0;
  let llmCompletionTokens = 0;
  let llmTotalTokens = 0;
  let llmProcessingMs = 0;

  const telemetryNewClues = new Set<string>();
  const telemetryNewFlags = new Set<string>();

  const hasClue = (clueId: string) => episode.clues.some((c) => c.id === clueId);

  const trackUsage = (usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  }) => {
    if (!usage) return;
    llmPromptTokens += usage.promptTokens ?? 0;
    llmCompletionTokens += usage.completionTokens ?? 0;
    llmTotalTokens += usage.totalTokens ?? 0;
  };

  const setFlag = (flag: string) => {
    if (!flag || state.flags[flag]) return;

    const prevFlags = { ...state.flags };
    state = {
      ...state,
      flags: {
        ...state.flags,
        [flag]: true,
      },
    };

    for (const newFlag of collectNewFlags(prevFlags, state.flags)) {
      telemetryNewFlags.add(newFlag);
    }
  };

  const tryDiscoverClue = (
    clueId: string,
    source: 'npc' | 'search' = 'search',
    isSociallyUnlocked = false
  ) => {
    const clue = episode.clues.find((c) => c.id === clueId);
    if (!clue) return false;
    if (state.discoveredClues.includes(clueId)) return false;

    if (clue.requiredFlag && !state.flags[clue.requiredFlag]) return false;

    if (clue.requiredTrust) {
      const trust = state.npcStates[clue.requiredTrust.npcId]?.trust ?? 0;
      if (trust < clue.requiredTrust.level) return false;
    }

    const before = state.discoveredClues.length;
    state = discoverClue(state, episode, clueId);
    if (state.discoveredClues.length <= before) return false;

    if (source === 'npc') {
      state = recordNpcLedClue(state, clueId);
    }

    if (source === 'search' && isSociallyUnlocked) {
      state = recordSociallyUnlockedSearchClue(state, clueId);
    }

    state = addNarrative(state, 'clue', `【发现线索】[${clue.tier}] ${clue.name}`);
    telemetryNewClues.add(clueId);
    return true;
  };

  const grantItem = (itemId: string) => {
    const item = episode.items.find((it) => it.id === itemId);
    if (!item || state.inventory.includes(itemId)) return;

    const prevFlags = { ...state.flags };
    state = addItem(state, itemId);
    state = addNarrative(state, 'system', `【获得物品】${item.name}：${item.description}`);

    state = applyItemEffects(state, episode, itemId);
    const newFlags = collectNewFlags(prevFlags, state.flags);
    for (const flag of newFlags) {
      telemetryNewFlags.add(flag);
    }

    if (item.setsFlag && newFlags.includes(item.setsFlag)) {
      state = addNarrative(state, 'system', `【状态变化】已获得权限：${item.setsFlag}`);
    }
  };

  const applyRuntimeRound = () => {
    if (!runtime?.onRoundAdvanced) return;

    const result = runtime.onRoundAdvanced(state, episode);
    const applied = applyRuntimeResult(state, result, episodeClues);
    state = applied.state;

    for (const clueId of applied.newClues) {
      telemetryNewClues.add(clueId);
    }
  };

  const applyRuntimeAction = () => {
    if (!runtime?.onActionResolved) return;

    const beforeFlags = { ...state.flags };
    const result = runtime.onActionResolved(state, episode, { action });
    const applied = applyRuntimeResult(state, result, episodeClues);
    state = applied.state;

    for (const clueId of applied.newClues) {
      telemetryNewClues.add(clueId);
    }

    for (const flag of collectNewFlags(beforeFlags, state.flags)) {
      telemetryNewFlags.add(flag);
    }
  };

  const applyRuntimeTimeSlotTransitions = (transitions: RuntimeTimeSlotContext[]) => {
    if (!runtime?.onTimeSlotAdvanced || transitions.length === 0) return;

    for (const transition of transitions) {
      const beforeFlags = { ...state.flags };
      const result = runtime.onTimeSlotAdvanced(state, episode, transition);
      const applied = applyRuntimeResult(state, result, episodeClues);
      state = applied.state;

      for (const clueId of applied.newClues) {
        telemetryNewClues.add(clueId);
      }

      for (const flag of collectNewFlags(beforeFlags, state.flags)) {
        telemetryNewFlags.add(flag);
      }
    }
  };

  const applyWorldEventTransitions = (transitions: RuntimeTimeSlotContext[]) => {
    if (transitions.length === 0) return;

    for (const transition of transitions) {
      const beforePressure = state.worldPressure ?? {
        publicHeat: 0,
        evidenceDecay: 0,
        rumorByNpc: {},
        locationPressure: {},
      };
      const simulated = simulateWorldEvents({
        userId: auth.user.id,
        sessionId,
        episode,
        state,
        context: transition,
      });

      state = simulated.state;
      insertWorldEvents(simulated.events);

      for (const note of simulated.notifications) {
        state = addNarrative(state, 'system', note);
      }

      const afterPressure = state.worldPressure ?? beforePressure;
      if (beforePressure.publicHeat < 40 && afterPressure.publicHeat >= 40) {
        state = addNarrative(
          state,
          'system',
          '【局势发紧】公开口风已经开始往“尽快定性”倾斜。接下来若还想翻案，你必须更快稳住关键人物。'
        );
      }

      if (beforePressure.evidenceDecay < 50 && afterPressure.evidenceDecay >= 50) {
        state = addNarrative(
          state,
          'system',
          '【证据流失加剧】有些关键痕迹正在消失。越往后拖，你能从现场带走的只会越少。'
        );
      }
    }
  };

  const applySocialMutation = (result: SocialMutationResult) => {
    const beforeFlags = { ...state.flags };
    state = result.state;

    for (const flag of collectNewFlags(beforeFlags, state.flags)) {
      telemetryNewFlags.add(flag);
    }

    for (const leadFlag of result.unlockedLeadFlags) {
      telemetryNewFlags.add(leadFlag);
    }

    for (const note of result.notifications) {
      state = addNarrative(state, 'system', note);
    }
  };

  const settleByTimeout = () => {
    if (state.phase === 'settlement') return;

    if (runtime?.onBeforeSettlement) {
      const beforeFlags = { ...state.flags };
      const beforeSettlement = runtime.onBeforeSettlement(state, episode);
      const applied = applyRuntimeResult(state, beforeSettlement, episodeClues);
      state = applied.state;

      for (const clueId of applied.newClues) {
        telemetryNewClues.add(clueId);
      }

      for (const flag of collectNewFlags(beforeFlags, state.flags)) {
        telemetryNewFlags.add(flag);
      }
    }

    state = addNarrative(
      state,
      'system',
      '\n钟楼最后一声报时落下。执法官的队伍已经入村。\n你失去了继续取证的窗口。'
    );
    state = { ...state, phase: 'settlement' };
    state = markTimelineSettled(state, episode);
  };

  try {
    const touchedTimeline = touchTimelineActive(state, episode);
    state = touchedTimeline.state;
    applyRuntimeTimeSlotTransitions(touchedTimeline.transitions);
    applyWorldEventTransitions(touchedTimeline.transitions);
    applySocialMutation(recoverNpcCooldowns(state, episode));

    if (touchedTimeline.exhausted) {
      settleByTimeout();

      sessionStore.set(
        sessionId,
        state,
        state.phase === 'settlement' ? SETTLEMENT_SESSION_TTL_MS : ACTIVE_SESSION_TTL_MS
      );

      logGameTelemetry({
        event: 'action_resolved',
        sessionId,
        episodeId: state.episodeId,
        round: state.round,
        actionType: action.type,
        newFlags: Array.from(telemetryNewFlags),
        newClues: Array.from(telemetryNewClues),
        detail: {
          timeline: {
            day: state.timeline.currentDay,
            slot: state.timeline.currentSlotIndex,
            remainingSecTotal: Math.round(state.timeline.remainingSecTotal),
            timeoutBeforeAction: true,
          },
        },
      });

      return NextResponse.json({ state });
    }

    const actionStartedAt = Date.now();

    switch (action.type) {
      case 'look': {
        const scene = buildSceneDescription(episode, state.currentLocation, state);
        state = addNarrative(state, 'gm', scene);
        applyRuntimeAction();
        break;
      }

      case 'move': {
        if (!action.target) {
          state = addNarrative(state, 'system', '你想去哪里？');
          break;
        }

        const target = action.target;
        const targetLocation = episode.locations.find(
          (l) =>
            l.id === target ||
            l.name === target ||
            l.name.includes(target)
        );

        if (!targetLocation) {
          state = addNarrative(state, 'gm', '你不知道该往哪个方向走。');
          break;
        }

        const moveResult = moveToLocation(state, episode, targetLocation.id);
        if (!moveResult) {
          state = addNarrative(state, 'gm', `从这里无法直接前往${targetLocation.name}。`);
          break;
        }

        if (moveResult.blocked) {
          state = addNarrative(state, 'gm', moveResult.blocked);
          break;
        }

        state = moveResult.state;

        state = consumeRound(state);
        applyRuntimeRound();

        state.actionHistory = [
          ...state.actionHistory,
          { round: state.round, type: 'move', target: targetLocation.id },
        ];

        const scene = buildSceneDescription(episode, targetLocation.id, state);
        state = addNarrative(state, 'gm', scene);
        applyRuntimeAction();
        break;
      }

      case 'talk': {
        if (!action.target || !action.content) {
          state = addNarrative(state, 'system', '你想跟谁说什么？');
          break;
        }

        const target = action.target;
        const npc = episode.npcs.find(
          (profile) =>
            profile.id === target ||
            profile.name === target ||
            profile.name.includes(target)
        );

        if (!npc) {
          state = addNarrative(state, 'gm', '这里没有这个人。');
          break;
        }

        const npcState = state.npcStates[npc.id];
        const npcLocation = npcState?.locationOverride ?? npc.locationId;

        if (npcLocation !== state.currentLocation) {
          state = addNarrative(state, 'gm', `${npc.name}不在这里。`);
          break;
        }

        if (!npcState?.isAvailable) {
          state = addNarrative(state, 'gm', `${npc.name}现在无法交谈。`);
          break;
        }

        const talkApproach = action.approach ?? 'neutral';
        const presentedClue = action.presentedClueId
          ? episode.clues.find(
              (entry) =>
                entry.id === action.presentedClueId &&
                state.discoveredClues.includes(entry.id)
            )
          : undefined;

        const approachHintByType: Record<
          NonNullable<typeof talkApproach>,
          string
        > = {
          neutral: '（你保持克制，继续追问事实。）',
          empathy: '（你尽量放缓语气，先接住对方情绪。）',
          pressure: '（你语气加重，试图逼对方当场表态。）',
          exchange: '（你抛出交换条件，希望对方给出实话。）',
          present_evidence: presentedClue
            ? `（你当面出示了线索：${presentedClue.name}。）`
            : '（你试图出示证据，但手里拿不出有效物证。）',
        };

        const llmPlayerTurn = `${action.content}\n${approachHintByType[talkApproach]}`;

        const safeConversationHistory = sanitizeNpcConversationHistory(
          npcState.conversationHistory
        );

        const updatedHistory = [
          ...safeConversationHistory,
          { role: 'player' as const, content: llmPlayerTurn, round: state.round },
        ];

        const tempNpcState = { ...npcState, conversationHistory: updatedHistory };
        const tempState = {
          ...state,
          npcStates: { ...state.npcStates, [npc.id]: tempNpcState },
        };

        let summary =
          safeConversationHistory.length === npcState.conversationHistory.length
            ? npcState.conversationSummary
            : undefined;
        if (updatedHistory.length > 6 && !summary) {
          const summarizeStartedAt = Date.now();
          try {
            summary = await summarizeConversation(npc.name, updatedHistory);
          } catch (error) {
            console.warn('[talk] summarize failed:', error);
          } finally {
            llmProcessingMs += Date.now() - summarizeStartedAt;
          }
        }

        const npcMemoryState = getNpcMemoryState(auth.user.id, state.episodeId, npc.id);
        const recalledMemories = selectRelevantNpcMemories(npcMemoryState, {
          playerInput: action.content,
          currentLocation: state.currentLocation,
          presentedClueId: presentedClue?.id,
          limit: 6,
        });

        const systemPrompt = buildNpcSystemPrompt(
          npc,
          tempNpcState,
          tempState,
          episode,
          recalledMemories.lines
        );
        const messages = buildNpcMessages(updatedHistory, summary);

        let parsedNpc = {
          text: '……',
          delta: 0,
          giveItems: [] as string[],
          clueIds: [] as string[],
          flags: [] as string[],
        };
        let talkFallbackNotice: string | null = null;

        const llmStartedAt = Date.now();
        try {
          const llmResult = await callLlmWithMeta(systemPrompt, messages, {
            temperature: 0.8,
          });
          llmLatencyMs += llmResult.latencyMs;
          llmAttempts += llmResult.attempts;
          trackUsage(llmResult.usage);

          const guardedResponse = applyCanonicalResponseGuard(
            episode.id,
            llmResult.text
          );
          parsedNpc = parseNpcResponse(guardedResponse);

          if (
            isOutOfCharacterText(guardedResponse) ||
            isOutOfCharacterText(parsedNpc.text)
          ) {
            const fallbackDelta = isThreateningPlayerInput(action.content) ? -3 : 0;
            parsedNpc = {
              text: buildNpcRoleplayFallback(npc.name, action.content),
              delta: fallbackDelta,
              giveItems: [],
              clueIds: [],
              flags: [],
            };
            talkFallbackNotice = '对方像是短暂失神，沉默片刻后才重新把话接回案件。';
          }
        } catch (error) {
          if (error instanceof LlmError) {
            talkFallbackNotice = '对话一时被噪声打断。你只能先记下对方的沉默反应。';
            parsedNpc = {
              text: '……先让我静一静。',
              delta: 0,
              giveItems: [],
              clueIds: [],
              flags: [],
            };
          } else {
            throw error;
          }
        } finally {
          llmProcessingMs += Date.now() - llmStartedAt;
        }

        state = addNarrative(state, 'player', action.content, '你');
        state = addNarrative(state, 'npc', parsedNpc.text || '……', npc.name);
        if (talkFallbackNotice) {
          state = addNarrative(state, 'system', talkFallbackNotice);
        }

        for (const clueId of parsedNpc.clueIds) {
          if (!hasClue(clueId)) continue;
          tryDiscoverClue(clueId, 'npc');
        }

        for (const flag of parsedNpc.flags) {
          setFlag(flag);
        }

        for (const itemId of parsedNpc.giveItems) {
          grantItem(itemId);
        }

        state.npcStates = {
          ...state.npcStates,
          [npc.id]: {
            ...npcState,
            conversationHistory: [
              ...updatedHistory,
              { role: 'npc', content: parsedNpc.text || '……', round: state.round },
            ],
            conversationSummary: summary,
          },
        };

        state = updateNpcTrust(state, npc.id, parsedNpc.delta);

        const unlocked = unlockNpcTrustClues(state, episode, npc.id);
        state = unlocked.state;
        for (const clueId of unlocked.unlockedClues) {
          if (hasClue(clueId)) {
            const clue = episode.clues.find((entry) => entry.id === clueId)!;
            state = recordNpcLedClue(state, clueId);
            state = addNarrative(state, 'clue', `【发现线索】[${clue.tier}] ${clue.name}`);
            telemetryNewClues.add(clueId);
          }
        }

        const socialMutation = applyTalkSocialDynamics(state, episode, npc.id, {
          ...action,
          approach: talkApproach,
        });
        applySocialMutation(socialMutation);

        const finalNpcState = state.npcStates[npc.id];
        const reactionShiftNote = describeNpcReactionShift(
          npc,
          npcState,
          finalNpcState
        );
        if (reactionShiftNote) {
          state = addNarrative(state, 'system', reactionShiftNote);
        }
        const allTalkClueIds = uniqueStrings([
          ...parsedNpc.clueIds,
          ...unlocked.unlockedClues,
        ]);
        const revealedClueNames = allTalkClueIds
          .map((clueId) => episode.clues.find((entry) => entry.id === clueId)?.name)
          .filter((value): value is string => typeof value === 'string');
        const givenItemNames = parsedNpc.giveItems
          .map((itemId) => episode.items.find((entry) => entry.id === itemId)?.name)
          .filter((value): value is string => typeof value === 'string');
        const significantTalk =
          Math.abs(parsedNpc.delta) >= 2 ||
          talkApproach !== 'neutral' ||
          allTalkClueIds.length > 0 ||
          parsedNpc.flags.length > 0 ||
          parsedNpc.giveItems.length > 0 ||
          finalNpcState?.stance !== npcState.stance;

        if (significantTalk) {
          const topicSnippet = compactText(action.content, 24);
          const dialogueSummaryByApproach: Record<typeof talkApproach, string> = {
            neutral: `那个旅人围着“${topicSnippet}”继续追问过你。`,
            empathy: `那个旅人先放缓语气，再追问“${topicSnippet}”。`,
            pressure: `那个旅人曾强逼你就“${topicSnippet}”当场表态。`,
            exchange: `那个旅人试过拿条件换你就“${topicSnippet}”松口。`,
            present_evidence: presentedClue
              ? `那个旅人拿出“${presentedClue.name}”，逼你重看“${topicSnippet}”。`
              : `那个旅人试图拿并不充分的证据逼你就“${topicSnippet}”改口。`,
          };

          const baseWeight =
            4 +
            (Math.abs(parsedNpc.delta) >= 2 ? 1 : 0) +
            (allTalkClueIds.length > 0 || parsedNpc.flags.length > 0 || parsedNpc.giveItems.length > 0 ? 2 : 0) +
            (finalNpcState?.stance !== npcState.stance ? 1 : 0);

          appendNpcMemoryEntry({
            userId: auth.user.id,
            episodeId: state.episodeId,
            ownerNpcId: npc.id,
            entry: {
              kind: 'dialogue',
              aboutPlayer: true,
              episodeId: state.episodeId,
              locationId: state.currentLocation,
              summary: dialogueSummaryByApproach[talkApproach],
              emotionTag: getApproachEmotionTag(talkApproach, parsedNpc.delta),
              topicTags: uniqueStrings([
                talkApproach,
                npc.id,
                presentedClue?.id ?? '',
                presentedClue?.name ?? '',
                ...allTalkClueIds,
                ...revealedClueNames,
              ]),
              weight: baseWeight,
              confidence: 0.84,
              visibility: 'private',
            },
          });

          if (allTalkClueIds.length > 0 || parsedNpc.flags.length > 0 || parsedNpc.giveItems.length > 0) {
            const revealParts = [
              revealedClueNames.length > 0 ? `你已经对这个旅人松口，提到过${revealedClueNames.join('、')}` : '',
              parsedNpc.flags.length > 0 ? `还明确放开了${parsedNpc.flags.join('、')}相关口子` : '',
              givenItemNames.length > 0 ? `并把${givenItemNames.join('、')}交到了他手里` : '',
            ].filter(Boolean);

            appendNpcMemoryEntry({
              userId: auth.user.id,
              episodeId: state.episodeId,
              ownerNpcId: npc.id,
              entry: {
                kind: 'event',
                aboutPlayer: true,
                episodeId: state.episodeId,
                locationId: state.currentLocation,
                summary: `${revealParts.join('，')}。`,
                emotionTag: 'revealed',
                topicTags: uniqueStrings([
                  ...allTalkClueIds,
                  ...revealedClueNames,
                  ...parsedNpc.flags,
                  ...parsedNpc.giveItems,
                  ...givenItemNames,
                ]),
                weight: Math.max(6, baseWeight + 1),
                confidence: 0.92,
                visibility: 'private',
              },
            });
          }

          if (
            talkApproach === 'pressure' &&
            (finalNpcState?.stance === 'hostile' ||
              finalNpcState?.stance === 'guarded' ||
              parsedNpc.delta < 0)
          ) {
            appendNpcMemoryEntry({
              userId: auth.user.id,
              episodeId: state.episodeId,
              ownerNpcId: npc.id,
              entry: {
                kind: 'trauma',
                aboutPlayer: true,
                episodeId: state.episodeId,
                locationId: state.currentLocation,
                summary: `那个旅人曾在“${topicSnippet}”上逼得你下意识收紧了口风。`,
                emotionTag: 'threatened',
                topicTags: uniqueStrings([talkApproach, topicSnippet, npc.id]),
                weight: Math.max(6, baseWeight),
                confidence: 0.9,
                visibility: 'private',
              },
            });
          }
        }

        if (!state.flags[`met_${npc.id}`]) {
          setFlag(`met_${npc.id}`);
        }

        state = consumeRound(state);
        applyRuntimeRound();

        state.actionHistory = [
          ...state.actionHistory,
          {
            round: state.round,
            type: 'talk',
            target: npc.id,
            detail: `[${talkApproach}] ${action.content}`,
          },
        ];

        applyRuntimeAction();
        break;
      }

      case 'examine': {
        if (!action.target) {
          state = addNarrative(state, 'system', '你想搜查什么？');
          break;
        }

        const resolvedSearch = resolveSearchTarget(episode, state, action.target);
        if (!resolvedSearch) {
          state = addNarrative(state, 'gm', '你在附近找了一圈，却没找到能对应的目标。');

          state = consumeRound(state);
          applyRuntimeRound();

          state.actionHistory = [
            ...state.actionHistory,
            { round: state.round, type: 'examine', target: action.target, detail: 'target_missing' },
          ];

          applyRuntimeAction();
          break;
        }

        const searchItem = resolvedSearch.item;
        const searchAccess = evaluateSearchAccess(episode, state, searchItem);
        const socialGateEnabled = isSearchSociallyGated(searchItem);

        if (!searchAccess.ok) {
          state = addNarrative(
            state,
            'gm',
            searchAccess.blockedNarrative ?? '你查看了很久，仍然只能抓到一些表面痕迹。'
          );

          state = consumeRound(state);
          applyRuntimeRound();

          state.actionHistory = [
            ...state.actionHistory,
            {
              round: state.round,
              type: 'examine',
              target: action.target,
              detail: `blocked:${[...searchAccess.missingLeads, ...searchAccess.missingNpcContacts].join(',') || 'unknown'}`,
            },
          ];

          applyRuntimeAction();
          break;
        }

        if (searchAccess.bypassNotes.length > 0) {
          for (const note of searchAccess.bypassNotes) {
            state = addNarrative(state, 'system', note);
          }
        }

        const gmSystem = buildGmSystemPrompt(episode, state);
        const examinePrompt = buildExaminePrompt(episode, state, searchItem.id);

        let clueIds: string[] = [];
        let flagIds: string[] = [];
        let itemIds: string[] = [];
        let cleanResponse = '';

        const llmStartedAt = Date.now();
        try {
          const llmResult = await callLlmWithMeta(
            gmSystem,
            [{ role: 'user', content: examinePrompt }],
            { temperature: 0.65 }
          );
          llmLatencyMs += llmResult.latencyMs;
          llmAttempts += llmResult.attempts;
          trackUsage(llmResult.usage);

          clueIds = extractTagValues(llmResult.text, 'CLUE_FOUND').filter(hasClue);
          flagIds = extractTagValues(llmResult.text, 'FLAG_SET');
          itemIds = extractTagValues(llmResult.text, 'ITEM_FOUND');

          cleanResponse = llmResult.text
            .replace(/\[CLUE_FOUND:[^\]]+\]/g, '')
            .replace(/\[FLAG_SET:[^\]]+\]/g, '')
            .replace(/\[ITEM_FOUND:[^\]]+\]/g, '')
            .trim();
        } catch (error) {
          if (error instanceof LlmError) {
            cleanResponse = '你仔细搜查了一番，却只抓住一些零散痕迹，暂时无法形成新的判断。';
            state = addNarrative(
              state,
              'system',
              '【搜查受干扰】现场回响紊乱，本次搜查仅能得到表层结果（通常不会产出关键线索）。建议先与相关人物交谈，或更换地点后再搜查。'
            );
          } else {
            throw error;
          }
        } finally {
          llmProcessingMs += Date.now() - llmStartedAt;
        }

        const sanitizedNarrative = sanitizeGmNarrative(cleanResponse);
        if (isOutOfCharacterText(cleanResponse) || !sanitizedNarrative) {
          cleanResponse = '你在现场反复查验，只能先记下零碎痕迹，暂时没有新进展。';
          clueIds = [];
          flagIds = [];
          itemIds = [];
          state = addNarrative(state, 'system', '回响一度失真，叙事已自动校正。');
        } else {
          cleanResponse = sanitizedNarrative;
        }

        if (!cleanResponse) {
          cleanResponse = '你仔细搜查了一番，但没有新的收获。';
        }

        state = addNarrative(state, 'gm', cleanResponse);

        for (const clueId of clueIds) {
          tryDiscoverClue(clueId, 'search', socialGateEnabled);
        }

        for (const itemId of itemIds) {
          grantItem(itemId);
        }

        for (const flag of flagIds) {
          setFlag(flag);
        }

        state = consumeRound(state);
        applyRuntimeRound();

        state.actionHistory = [
          ...state.actionHistory,
          { round: state.round, type: 'examine', target: action.target },
        ];

        applyRuntimeAction();
        break;
      }

      default:
        state = addNarrative(state, 'system', '无法理解这个行为。');
    }

    const processingWindowMs = Date.now() - actionStartedAt;
    const processedTimeline = applyProcessingWindow(
      state,
      episode,
      processingWindowMs,
      llmProcessingMs
    );
    state = processedTimeline.state;
    applyRuntimeTimeSlotTransitions(processedTimeline.transitions);
    applyWorldEventTransitions(processedTimeline.transitions);
    applySocialMutation(recoverNpcCooldowns(state, episode));
    state = refreshNonBeEligibility(episode, state);

    const pacing = getEpisodePacing(episode);
    const roundBasedTimeout =
      pacing.mode === 'round' && state.round >= state.maxRounds && state.phase !== 'settlement';

    if ((processedTimeline.exhausted || roundBasedTimeout) && state.phase !== 'settlement') {
      settleByTimeout();
    }

    sessionStore.set(
      sessionId,
      state,
      state.phase === 'settlement' ? SETTLEMENT_SESSION_TTL_MS : ACTIVE_SESSION_TTL_MS
    );

    logGameTelemetry({
      event: 'action_resolved',
      sessionId,
      episodeId: state.episodeId,
      round: state.round,
      actionType: action.type,
      llmLatencyMs: llmLatencyMs || undefined,
      llmAttempts: llmAttempts || undefined,
      llmPromptTokens: llmPromptTokens || undefined,
      llmCompletionTokens: llmCompletionTokens || undefined,
      llmTotalTokens: llmTotalTokens || undefined,
      newFlags: Array.from(telemetryNewFlags),
      newClues: Array.from(telemetryNewClues),
      detail: {
        timeline: {
          day: state.timeline.currentDay,
          slot: state.timeline.currentSlotIndex,
          remainingSecTotal: Math.round(state.timeline.remainingSecTotal),
          llmCountedSec: Number((llmProcessingMs / 1000).toFixed(2)),
          processingWindowMs,
        },
      },
    });

    return NextResponse.json({ state });
  } catch (error) {
    const errorType = error instanceof LlmError ? error.type : 'unknown';
    logGameTelemetry({
      event: 'action_error',
      sessionId,
      episodeId: state.episodeId,
      round: state.round,
      actionType: action.type,
      errorType,
    });

    console.error('Action error:', error);

    return NextResponse.json(
      { error: '处理行为时发生错误' },
      { status: 500 }
    );
  }
}
