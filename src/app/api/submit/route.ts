import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callLlmWithMeta, LlmError, LlmCallMeta } from '@/lib/llm';
import { addNarrative, determineRoute } from '@/lib/engine/game-state';
import { buildEvaluationPrompt } from '@/lib/agents/gm';
import { getEpisodeEntry } from '@/lib/episodes/registry';
import { SETTLEMENT_SESSION_TTL_MS, sessionStore } from '@/lib/session/store';
import { ApiSubmitRequest, EpisodeConfig, SettlementResult } from '@/lib/types';
import { logGameTelemetry } from '@/lib/telemetry/logger';
import { applySettlementProgress } from '@/lib/progression';
import { getEpisodePacing, markTimelineSettled } from '@/lib/timeline/pacing';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import { getUserProgress, recordEpisodeOutcome, upsertUserProgress } from '@/lib/progress/repo';
import { ensureSocialLedger, refreshNonBeEligibility } from '@/lib/social/audit';

const submitSchema = z.object({
  sessionId: z.string().uuid(),
  submission: z.string().trim().min(1).max(4000),
});

interface EvaluationResult {
  overallTruthScore: number;
  logicCoherence: number;
  summary: string;
  signalFlags: Record<string, boolean>;
}

function buildDefaultSignalFlags(episode: EpisodeConfig): Record<string, boolean> {
  return Object.fromEntries(
    episode.evaluation.signalDefinitions.map((signal) => [signal.id, false])
  );
}

function clampScore(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toBooleanRecord(
  value: unknown,
  allowedKeys: Set<string>
): Record<string, boolean> {
  const normalized: Record<string, boolean> = {};

  if (!value || typeof value !== 'object') return normalized;

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!allowedKeys.has(key)) continue;
    if (typeof entry === 'boolean') {
      normalized[key] = entry;
    }
  }

  return normalized;
}

function mapLegacySignals(
  payload: Record<string, unknown>,
  allowedKeys: Set<string>
): Record<string, boolean> {
  const mapped: Record<string, boolean> = {};

  const accused = payload.accusedCorrectly;
  if (allowedKeys.has('accused_renn') && typeof accused === 'boolean') {
    mapped.accused_renn = accused;
  }

  const protectedHank = payload.protectedHank;
  if (typeof protectedHank === 'boolean') {
    if (allowedKeys.has('protected_hank_secret') && protectedHank) {
      mapped.protected_hank_secret = true;
    }
    if (allowedKeys.has('hank_secret_exposed') && !protectedHank) {
      mapped.hank_secret_exposed = true;
    }
  }

  const exposedEdmond = payload.exposedEdmond;
  if (
    allowedKeys.has('exposed_edmond_conspiracy') &&
    typeof exposedEdmond === 'boolean' &&
    exposedEdmond
  ) {
    mapped.exposed_edmond_conspiracy = true;
  }

  return mapped;
}

function normalizeEvaluation(
  raw: unknown,
  episode: EpisodeConfig,
  fallbackSummary: string
): EvaluationResult {
  const defaultSignalFlags = buildDefaultSignalFlags(episode);
  const allowedKeys = new Set(Object.keys(defaultSignalFlags));

  if (!raw || typeof raw !== 'object') {
    return {
      overallTruthScore: 30,
      logicCoherence: 50,
      summary: fallbackSummary,
      signalFlags: defaultSignalFlags,
    };
  }

  const payload = raw as Record<string, unknown>;
  const jsonSignalFlags = toBooleanRecord(payload.signalFlags, allowedKeys);
  const legacySignals = mapLegacySignals(payload, allowedKeys);

  return {
    overallTruthScore: clampScore(payload.overallTruthScore, 30),
    logicCoherence: clampScore(payload.logicCoherence, 50),
    summary:
      typeof payload.summary === 'string' && payload.summary.trim().length > 0
        ? payload.summary.trim()
        : fallbackSummary,
    signalFlags: {
      ...defaultSignalFlags,
      ...legacySignals,
      ...jsonSignalFlags,
    },
  };
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const rawBody = (await request.json()) as ApiSubmitRequest;
  const parsed = submitSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '参数不合法',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { sessionId, submission } = parsed.data;
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
        error: '你无权提交这个会话。',
        code: 'SESSION_FORBIDDEN',
      },
      { status: 403 }
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

  const entry = getEpisodeEntry(incomingState.episodeId);
  if (!entry) {
    return NextResponse.json(
      { error: `副本配置缺失：${incomingState.episodeId}` },
      { status: 500 }
    );
  }

  const episode = entry.config;
  let state = refreshNonBeEligibility(
    episode,
    ensureSocialLedger({ ...incomingState })
  );
  const fallbackSummary = '评估系统未完整响应，已按保守规则完成结算。';

  const currentProgress = getUserProgress(auth.user.id);

  try {
    if (entry.runtimeHooks?.onBeforeSettlement) {
      const beforeSettlement = entry.runtimeHooks.onBeforeSettlement(state, episode);
      state = beforeSettlement.state;
      for (const note of beforeSettlement.notifications) {
        state = addNarrative(state, 'system', note);
      }
    }

    state = addNarrative(state, 'player', submission, '你的推理');

    const evalPrompt = buildEvaluationPrompt(episode, state, submission);
    let llmResult: LlmCallMeta | null = null;
    let evaluation: EvaluationResult = {
      overallTruthScore: 30,
      logicCoherence: 50,
      summary: fallbackSummary,
      signalFlags: buildDefaultSignalFlags(episode),
    };
    let fallbackUsed = false;

    try {
      llmResult = await callLlmWithMeta(
        '你是一个严格但公正的评判系统。请严格按照 JSON 格式返回评估结果。',
        [{ role: 'user', content: evalPrompt }],
        { temperature: 0.2 }
      );

      const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedEvaluation = JSON.parse(jsonMatch[0]) as unknown;
          evaluation = normalizeEvaluation(parsedEvaluation, episode, fallbackSummary);
        } catch {
          fallbackUsed = true;
          evaluation = normalizeEvaluation(null, episode, fallbackSummary);
        }
      } else {
        fallbackUsed = true;
        evaluation = normalizeEvaluation(null, episode, fallbackSummary);
      }
    } catch (error) {
      if (error instanceof LlmError) {
        fallbackUsed = true;
        evaluation = normalizeEvaluation(null, episode, fallbackSummary);
        state = addNarrative(
          state,
          'system',
          '评估回响出现短暂干扰，系统已按保守规则完成判定。'
        );
      } else {
        throw error;
      }
    }

    state = {
      ...state,
      flags: {
        ...state.flags,
        ...evaluation.signalFlags,
      },
    };
    state = refreshNonBeEligibility(episode, state);

    const nonBeEligible = state.socialLedger?.nonBeEligible ?? true;
    let routeId = determineRoute(state, episode, evaluation.signalFlags);

    if (!nonBeEligible) {
      const forcedBe = episode.routes.find((routeEntry) => routeEntry.type === 'BE');
      if (forcedBe) {
        routeId = forcedBe.id;
        state = addNarrative(
          state,
          'system',
          '你收集到的证据不足以支撑公开翻案。村里的人情链条和证词关系没有被真正撬动，审判仍滑向了最坏的方向。'
        );
      }
    }

    const route = episode.routes.find((routeEntry) => routeEntry.id === routeId);
    if (!route) {
      return NextResponse.json(
        { error: `结局配置缺失：${routeId}` },
        { status: 500 }
      );
    }

    const discoveredCount = state.discoveredClues.filter(
      (id) => !episode.clues.find((clue) => clue.id === id)?.isFalse
    ).length;

    const explorationScore = Math.round(
      (state.visitedLocations.length / episode.locations.length) * 100
    );

    const pacing = getEpisodePacing(episode);
    const efficiencyScore =
      pacing.mode === 'realtime_day'
        ? Math.round(
            (Math.max(0, state.timeline.remainingSecTotal) /
              Math.max(1, pacing.dayDurationSec * pacing.totalDays)) *
              100
          )
        : Math.round(((state.maxRounds - state.round) / state.maxRounds) * 100);

    const truthScore = evaluation.overallTruthScore;

    const avgScore = (truthScore + explorationScore + efficiencyScore) / 3;
    let grade = 'F';
    if (avgScore >= 90) grade = 'S';
    else if (avgScore >= 80) grade = 'A';
    else if (avgScore >= 70) grade = 'B';
    else if (avgScore >= 55) grade = 'C';
    else if (avgScore >= 40) grade = 'D';

    const settlementText = `
═══════════════════════════════════════
副本结算：「${episode.name}」
结局：${route.type} — 「${route.name}」
═══════════════════════════════════════

${route.narrative}

═══════════════════════════════════════
结算报告
═══════════════════════════════════════

真相还原度 ${'█'.repeat(Math.round(truthScore / 10))}${'░'.repeat(10 - Math.round(truthScore / 10))} ${truthScore}%
探索度     ${'█'.repeat(Math.round(explorationScore / 10))}${'░'.repeat(10 - Math.round(explorationScore / 10))} ${explorationScore}%
效率       ${'█'.repeat(Math.round(efficiencyScore / 10))}${'░'.repeat(10 - Math.round(efficiencyScore / 10))} ${efficiencyScore}%

综合评级：${grade}
回响点奖励：+${route.rewards.echoPoints}
命运余量变化：${route.rewards.destinyChange > 0 ? '+' : ''}${route.rewards.destinyChange}

已收集关键线索：${discoveredCount} 条

${evaluation.summary}
═══════════════════════════════════════`;

    state = addNarrative(state, 'system', settlementText);
    state = { ...state, phase: 'settlement' };
    state = markTimelineSettled(state, episode);

    if (route.type === 'SE') {
      state = addNarrative(
        state,
        'system',
        '\n回到回响之间后，你注意到结算报告的最后多了一行小字：\n"第七座回响柱记录了你的选择。"'
      );
    }

    for (const postSettlementLine of episode.metaNarrativeHooks?.postSettlement ?? []) {
      state = addNarrative(state, 'system', `\n${postSettlementLine}`);
    }

    sessionStore.set(sessionId, state, SETTLEMENT_SESSION_TTL_MS);

    const settlement: SettlementResult = {
      route,
      truthScore,
      explorationScore,
      efficiencyScore,
      overallGrade: grade,
      echoPoints: route.rewards.echoPoints,
      destinyChange: route.rewards.destinyChange,
      collectedClueCount: discoveredCount,
      unlockedRoutes: [route.id],
      epilogue: evaluation.summary,
    };

    const nextProgress = upsertUserProgress(
      auth.user.id,
      applySettlementProgress(currentProgress, state.episodeId, route.type)
    );

    recordEpisodeOutcome({
      userId: auth.user.id,
      episodeId: state.episodeId,
      routeId,
      routeType: route.type,
      grade,
      truthScore,
    });

    logGameTelemetry({
      event: 'submission_settled',
      sessionId,
      episodeId: state.episodeId,
      round: state.round,
      actionType: 'submit',
      llmLatencyMs: llmResult?.latencyMs,
      llmAttempts: llmResult?.attempts,
      llmPromptTokens: llmResult?.usage?.promptTokens,
      llmCompletionTokens: llmResult?.usage?.completionTokens,
      llmTotalTokens: llmResult?.usage?.totalTokens,
      detail: {
        routeId,
        grade,
        truthScore,
        explorationScore,
        efficiencyScore,
        fallbackUsed,
        signalFlags: evaluation.signalFlags,
        nonBeEligible: state.socialLedger?.nonBeEligible ?? true,
        unlockedEpisodes: nextProgress.unlockedEpisodes,
      },
    });

    return NextResponse.json({ state, settlement });
  } catch (error) {
    const errorType = error instanceof LlmError ? error.type : 'unknown';
    logGameTelemetry({
      event: 'submission_error',
      sessionId,
      episodeId: state.episodeId,
      round: state.round,
      actionType: 'submit',
      errorType,
    });

    console.error('Submit error:', error);

    return NextResponse.json(
      { error: '提交推理时发生错误' },
      { status: 500 }
    );
  }
}
