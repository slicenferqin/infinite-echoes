import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiHeartbeatRequest, GameState } from '@/lib/types';
import { addNarrative } from '@/lib/engine/game-state';
import { getEpisodeEntry } from '@/lib/episodes/registry';
import {
  ACTIVE_SESSION_TTL_MS,
  SETTLEMENT_SESSION_TTL_MS,
  sessionStore,
} from '@/lib/session/store';
import { RuntimeApplyResult, RuntimeTimeSlotContext } from '@/lib/engine/runtime';
import { logGameTelemetry } from '@/lib/telemetry/logger';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import {
  markTimelineSettled,
  touchTimelineActive,
  touchTimelinePaused,
} from '@/lib/timeline/pacing';

const heartbeatSchema = z.object({
  sessionId: z.string().uuid(),
  visible: z.boolean(),
  focused: z.boolean(),
  online: z.boolean(),
});

function collectNewFlags(
  previousFlags: Record<string, boolean>,
  nextFlags: Record<string, boolean>
): string[] {
  return Object.keys(nextFlags).filter((flag) => !!nextFlags[flag] && !previousFlags[flag]);
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

  const rawBody = (await request.json()) as ApiHeartbeatRequest;
  const parsed = heartbeatSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '参数不合法',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { sessionId, visible, focused, online } = parsed.data;
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

  const episode = entry.config;
  const runtime = entry.runtimeHooks;
  const episodeClues = episode.clues.map((clue) => ({
    id: clue.id,
    tier: clue.tier,
    name: clue.name,
  }));

  const telemetryNewClues = new Set<string>();
  const telemetryNewFlags = new Set<string>();

  let state = { ...incomingState };

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

  const isForegroundActive = visible && focused && online;
  const mutation = isForegroundActive
    ? touchTimelineActive(state, episode)
    : touchTimelinePaused(state, episode, online ? 'background' : 'offline');

  state = mutation.state;
  applyRuntimeTimeSlotTransitions(mutation.transitions);

  let shouldSettle = false;

  if (mutation.exhausted && state.phase !== 'settlement') {
    settleByTimeout();
    shouldSettle = true;
  }

  if (state.phase === 'settlement') {
    shouldSettle = true;
    state = markTimelineSettled(state, episode);
  }

  sessionStore.set(
    sessionId,
    state,
    state.phase === 'settlement' ? SETTLEMENT_SESSION_TTL_MS : ACTIVE_SESSION_TTL_MS
  );

  logGameTelemetry({
    event: 'heartbeat',
    sessionId,
    episodeId: state.episodeId,
    round: state.round,
    newFlags: Array.from(telemetryNewFlags),
    newClues: Array.from(telemetryNewClues),
    detail: {
      active: isForegroundActive,
      shouldSettle,
      timeline: {
        day: state.timeline.currentDay,
        slot: state.timeline.currentSlotIndex,
        remainingSecTotal: Math.round(state.timeline.remainingSecTotal),
        paused: state.timeline.isPaused,
        pauseReason: state.timeline.pauseReason,
      },
    },
  });

  return NextResponse.json({
    state,
    shouldSettle,
  });
}
