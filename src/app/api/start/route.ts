import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addNarrative, createInitialState } from '@/lib/engine/game-state';
import {
  getDefaultEpisodeId,
  getEpisodeEntry,
  listEpisodes,
} from '@/lib/episodes/registry';
import {
  createLegacyIdentity,
  getEpisodeIdentityMode,
  pickRandomIdentity,
  resolveIdentityForState,
} from '@/lib/identity/system';
import { ACTIVE_SESSION_TTL_MS, sessionStore } from '@/lib/session/store';
import { ApiStartRequest, ApiStartResponse, GameState } from '@/lib/types';
import { isEpisodeUnlocked } from '@/lib/progression';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import { getUserProgress } from '@/lib/progress/repo';

const startSchema = z.object({
  playerName: z.string().trim().min(1).max(24).optional(),
  profession: z.enum(['journalist', 'doctor', 'programmer', 'teacher']).optional(),
  episodeId: z.string().trim().min(1).max(64).optional(),
  mode: z.enum(['new', 'resume']).optional(),
});

function normalizeStateIdentity(state: GameState): GameState {
  if (
    state.player.identityId &&
    state.player.identityName &&
    state.player.identityBrief
  ) {
    return state;
  }

  const profession = state.player.profession || 'journalist';
  const identity = createLegacyIdentity(profession);

  return {
    ...state,
    player: {
      ...state.player,
      identityId: identity.id,
      identityName: identity.name,
      identityBrief: identity.brief,
      profession,
      professionTrait: state.player.professionTrait,
    },
  };
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const rawBody = (await request.json()) as ApiStartRequest;
  const parsed = startSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '参数不合法',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const mode = body.mode ?? 'new';

  if (mode === 'resume') {
    const activeSession = sessionStore.getActiveSession(auth.user.id);
    if (!activeSession) {
      return NextResponse.json(
        {
          error: '当前没有可继续的调查进度。',
          code: 'NO_ACTIVE_SESSION',
        },
        { status: 404 }
      );
    }

    const entry = getEpisodeEntry(activeSession.episodeId);
    if (!entry) {
      return NextResponse.json(
        { error: `副本配置缺失：${activeSession.episodeId}` },
        { status: 500 }
      );
    }

    const episodeMeta = listEpisodes().find((episode) => episode.id === activeSession.episodeId);
    if (!episodeMeta) {
      return NextResponse.json(
        { error: `副本元数据缺失：${activeSession.episodeId}` },
        { status: 500 }
      );
    }

    const normalizedState = normalizeStateIdentity(activeSession);
    const identity = resolveIdentityForState(entry.config, normalizedState);

    if (normalizedState !== activeSession) {
      sessionStore.set(normalizedState.sessionId, normalizedState, ACTIVE_SESSION_TTL_MS);
    }

    const response: ApiStartResponse & { resumed: boolean } = {
      sessionId: normalizedState.sessionId,
      state: normalizedState,
      episodeMeta,
      episodeConfig: entry.config,
      identity,
      resumed: true,
    };

    return NextResponse.json(response);
  }

  const episodeId = body.episodeId ?? getDefaultEpisodeId();
  const progress = getUserProgress(auth.user.id);

  if (!isEpisodeUnlocked(progress, episodeId)) {
    return NextResponse.json(
      {
        error: '该副本尚未解锁。请先通过前置副本。',
        code: 'EPISODE_LOCKED',
      },
      { status: 403 }
    );
  }

  const entry = getEpisodeEntry(episodeId);

  if (!entry) {
    return NextResponse.json(
      {
        error: `副本不存在：${episodeId}`,
        availableEpisodes: listEpisodes().map((episode) => episode.id),
      },
      { status: 404 }
    );
  }

  const playerName = body.playerName || '旅人';
  const modeIdentity = getEpisodeIdentityMode(entry.config);

  const selectedIdentity =
    modeIdentity === 'random_pool'
      ? pickRandomIdentity(entry.config)
      : createLegacyIdentity(body.profession || 'journalist');

  const stateProfession =
    modeIdentity === 'legacy_profession' ? body.profession || 'journalist' : 'identity_pool';

  const state = createInitialState(
    entry.config,
    playerName,
    stateProfession,
    auth.user.id,
    selectedIdentity
  );

  let gameState = addNarrative(state, 'system', entry.config.openingNarrative);
  gameState = addNarrative(gameState, 'system', entry.config.taskBriefing);

  gameState = { ...gameState, phase: 'exploration', round: 0 };

  const sessionId = sessionStore.create(gameState, ACTIVE_SESSION_TTL_MS);
  const episodeMeta = listEpisodes().find((episode) => episode.id === episodeId)!;

  const response: ApiStartResponse = {
    sessionId,
    state: gameState,
    episodeMeta,
    episodeConfig: entry.config,
    identity: selectedIdentity,
  };

  return NextResponse.json(response);
}
