'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  EpisodeConfig,
  GameAction,
  GameState,
  NarrativeEntry,
  SettlementResult,
  TimelinePauseReason,
} from '@/lib/types';
import {
  computeRouteProgress,
  diffRouteProgress,
  RouteProgressSnapshot,
} from '@/lib/progress/route-progress';
import { getIdentityPresentation, resolveIdentityForState } from '@/lib/identity/system';

interface ApiFailure {
  error?: string;
  code?: string;
  retryAfterMs?: number;
}

interface OptimisticEntry extends NarrativeEntry {
  id: string;
  status: 'pending' | 'failed';
}

interface SettlementArtifactSummary {
  id: string;
  kind: string;
  title: string;
}

interface SettlementChronicleSummary {
  id: string;
  title: string;
  routeType: string;
}

interface SettlementNovelPreview {
  chapter: number;
  title: string;
  pov: string;
}

interface SettlementNovelSummary {
  id: string;
  status: string;
  chapterCount: number;
  wordsPerChapter: number;
  previewChapters: SettlementNovelPreview[];
}

interface TimelineViewModel {
  mode: 'round' | 'realtime_day';
  currentDay: number;
  totalDays: number;
  slotLabel: string;
  remainingSecInDay: number;
  remainingSecTotal: number;
  isPaused: boolean;
  pauseReason?: TimelinePauseReason;
}

interface EpisodePrimerAction {
  label: string;
  action?: GameAction;
  input?: string;
}

interface EpisodePrimer {
  focusName: string;
  focusRole: string;
  pulse: string;
  stake: string;
  approach: string;
  actions: EpisodePrimerAction[];
}


type TalkApproach = NonNullable<GameAction['approach']>;

const TALK_APPROACH_OPTIONS: Array<{ value: TalkApproach; label: string }> = [
  { value: 'neutral', label: '平稳追问' },
  { value: 'empathy', label: '共情安抚' },
  { value: 'pressure', label: '强势施压' },
  { value: 'exchange', label: '交换条件' },
  { value: 'present_evidence', label: '出示证据' },
];

const TALK_APPROACH_HINT: Record<TalkApproach, string> = {
  neutral: '稳住语气，优先厘清事实顺序。',
  empathy: '先接住情绪，再推动信息松口。',
  pressure: '短期逼供有效，但容易引发反弹。',
  exchange: '可换信息，但会抬高对方筹码。',
  present_evidence: '用已掌握线索拆穿口供。',
};

function createOptimisticId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatClock(totalSec: number): string {
  const seconds = Math.max(0, Math.ceil(totalSec));
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatPauseReason(reason?: TimelinePauseReason): string {
  if (reason === 'background') return '页面不在前台，计时已暂停';
  if (reason === 'offline') return '网络离线，计时已暂停';
  if (reason === 'settled') return '调查已结算';
  return '计时已暂停';
}

function buildTimelineView(
  state: GameState,
  episodeConfig: EpisodeConfig,
  nowMs: number
): TimelineViewModel {
  const timeline = state.timeline;

  if (timeline.mode !== 'realtime_day') {
    return {
      mode: 'round',
      currentDay: 1,
      totalDays: 1,
      slotLabel: `回合 ${state.round}/${state.maxRounds}`,
      remainingSecInDay: Math.max(0, state.maxRounds - state.round),
      remainingSecTotal: Math.max(0, state.maxRounds - state.round),
      isPaused: false,
    };
  }

  const slotLabels = timeline.slotLabels.length > 0 ? timeline.slotLabels : ['时段'];
  const totalDays = Math.max(1, timeline.totalDays);
  const dayDurationSec = Math.max(1, timeline.dayDurationSec);
  const totalSec = totalDays * dayDurationSec;
  const slotDurationSec =
    timeline.slotDurationSec > 0
      ? timeline.slotDurationSec
      : dayDurationSec / Math.max(1, slotLabels.length);
  const heartbeatTimeoutSec = Math.max(3, episodeConfig.pacing?.heartbeatTimeoutSec ?? 12);

  const lastTickAt = timeline.lastTickAt || nowMs;
  const lastHeartbeatAt = timeline.lastHeartbeatAt || nowMs;
  const heartbeatDeadlineMs = lastHeartbeatAt + heartbeatTimeoutSec * 1000;

  let elapsedSecTotal = clamp(timeline.elapsedSecTotal, 0, totalSec);
  let isPaused = timeline.isPaused;
  let pauseReason = timeline.pauseReason;

  if (!timeline.isPaused) {
    const effectiveNowMs = Math.min(nowMs, heartbeatDeadlineMs);
    const deltaSec = Math.max(0, (effectiveNowMs - lastTickAt) / 1000);
    elapsedSecTotal = clamp(timeline.elapsedSecTotal + deltaSec, 0, totalSec);

    if (nowMs > heartbeatDeadlineMs && elapsedSecTotal < totalSec) {
      isPaused = true;
      pauseReason = 'background';
    }
  }

  const remainingSecTotal = Math.max(0, totalSec - elapsedSecTotal);

  const normalizedElapsed =
    remainingSecTotal <= 0
      ? totalSec - Number.EPSILON
      : clamp(elapsedSecTotal, 0, totalSec - Number.EPSILON);

  const dayIndex = clamp(Math.floor(normalizedElapsed / dayDurationSec), 0, totalDays - 1);
  const currentDay = dayIndex + 1;
  const elapsedInDay = normalizedElapsed - dayIndex * dayDurationSec;
  const slotIndex = clamp(
    Math.floor(elapsedInDay / slotDurationSec),
    0,
    slotLabels.length - 1
  );

  const remainingSecInDay =
    remainingSecTotal <= 0
      ? 0
      : ((Math.ceil(remainingSecTotal) - 1) % dayDurationSec) + 1;

  return {
    mode: 'realtime_day',
    currentDay,
    totalDays,
    slotLabel: slotLabels[slotIndex] ?? '未知时段',
    remainingSecInDay,
    remainingSecTotal,
    isPaused,
    pauseReason,
  };
}

function getNpcStanceLabel(state: GameState['npcStates'][string] | undefined): string {
  if (!state?.isAvailable) return '暂时回避';
  if (state.stance === 'hostile') return '明显抗拒';
  if (state.stance === 'guarded') return '带着防备';
  if (state.trust >= 60) return '愿意多说';
  return '还在观察你';
}

function getNpcStanceColor(state: GameState['npcStates'][string] | undefined): string {
  if (!state?.isAvailable || state.stance === 'hostile') return 'var(--system-color)';
  if (state.stance === 'guarded') return 'var(--clue-color)';
  if (state.trust >= 60) return 'var(--player-color)';
  return 'var(--npc-color)';
}

function buildEpisodePrimer(params: {
  episode: EpisodeConfig;
  state: GameState;
  connectedLocs: EpisodeConfig['locations'];
  npcsHere: EpisodeConfig['npcs'];
}): EpisodePrimer | null {
  const { episode, state, connectedLocs, npcsHere } = params;
  if (episode.id !== 'ep01' || state.phase === 'settlement') return null;

  const contacted = new Set(state.socialLedger?.npcContacted ?? []);
  const isEarlyWindow =
    state.timeline.mode !== 'realtime_day' ||
    (state.timeline.currentDay === 1 &&
      state.timeline.currentSlotIndex <= 1 &&
      contacted.size < 4);

  if (!isEarlyWindow) return null;

  const canMoveTo = (locationId: string) =>
    connectedLocs.some((loc) => loc.id === locationId);
  const isHere = (npcId: string) => npcsHere.some((npc) => npc.id === npcId);
  const hasItem = (itemId: string) => state.inventory.includes(itemId);

  if (!contacted.has('nora')) {
    return {
      focusName: '诺拉',
      focusRole: '求助者 / 父女主线核心',
      pulse: '她不像在找会破案的人，更像在赌你肯不肯先去看汉克一眼。',
      stake: '她怕的不是自己丢脸，而是父亲连明天都撑不过去。',
      approach: '先别追案情，先问她父亲最近哪里不对、她现在最怕什么。',
      actions: [
        isHere('nora')
          ? { label: '先这样问她', input: '对诺拉说：先别急，把你知道的从头告诉我。' }
          : canMoveTo('bridge')
            ? { label: '回桥头找诺拉', action: { type: 'move', target: 'bridge' } }
            : canMoveTo('square')
              ? { label: '先回广场转桥头', action: { type: 'move', target: 'square' } }
            : { label: '先环顾这里', action: { type: 'look' } },
        { label: '环顾桥头/周围', action: { type: 'look' } },
      ],
    };
  }

  if (!hasItem('cellar_key')) {
    return {
      focusName: '艾德蒙',
      focusRole: '村长 / 阴谋枢纽',
      pulse: contacted.has('edmond')
          ? '你已经见过艾德蒙，但还没把钥匙拿到手。现在别让话题继续散开，回去把“先见汉克”这件事咬住。'
          : '想见汉克，先得过艾德蒙这一关。他嘴上说的是大局，心里护的却未必只是村子。',
      stake: '他既想保住儿子，也想保住自己仍像个能护住全村的村长。',
      approach: '别先跟他辩公道，先让他说完“规矩”和“大局”，再咬住钥匙。',
      actions: [
        canMoveTo('elder_house')
          ? { label: '去村长宅邸', action: { type: 'move', target: 'elder_house' } }
          : canMoveTo('square')
            ? { label: '先去广场', action: { type: 'move', target: 'square' } }
            : { label: '先环顾这里', action: { type: 'look' } },
        isHere('edmond')
          ? { label: '先向他要钥匙', input: '对艾德蒙说：我想先见汉克。' }
          : { label: '准备开口方式', input: '对艾德蒙说：我想先见汉克。' },
      ],
    };
  }

  if (!contacted.has('hank')) {
    return {
      focusName: '汉克',
      focusRole: '被告 / 沉默真相承载者',
      pulse: '见到汉克时，先别逼命案。先听他第一句问什么，那比任何口供都更快告诉你他在护谁。',
      stake: '他不是不想活，是更怕诺拉替他活不下去。',
      approach: '别先逼凶手是谁，先让他确认诺拉会不会被你拖进去。',
      actions: [
        canMoveTo('cellar')
          ? { label: '去地窖见汉克', action: { type: 'move', target: 'cellar' } }
          : canMoveTo('elder_house')
            ? { label: '先去宅邸', action: { type: 'move', target: 'elder_house' } }
            : canMoveTo('square')
              ? { label: '先回广场转宅邸', action: { type: 'move', target: 'square' } }
              : { label: '先环顾这里', action: { type: 'look' } },
        { label: '准备第一句', input: '对汉克说：诺拉还在等你开口。你先告诉我，她现在最该防什么。' },
      ],
    };
  }

  if (!contacted.has('mila') || !contacted.has('gareth')) {
    return {
      focusName: !contacted.has('mila') ? '米拉' : '加雷斯',
      focusRole: !contacted.has('mila') ? '村医 / 伤情与伦理节点' : '矿工班头 / 舆论节点',
      pulse:
        '现在别急着下结论。你需要一边把伤情拉回事实，一边看清全村到底是谁在退、谁在带口风。',
      stake: !contacted.has('mila')
        ? '她怕自己的专业判断被权力拿去伤另一个无辜的人。'
        : '他想护汉克，也怕矿工几十口人的饭碗先跟着出事。',
      approach: !contacted.has('mila')
        ? '只问伤情和时间，不要让她替你下道德结论。'
        : '先说明你不是来挑软柿子的，再问谁在急着把汉克先定下来。',
      actions: [
        !contacted.has('mila') && canMoveTo('clinic')
          ? { label: '先去诊所', action: { type: 'move', target: 'clinic' } }
          : !contacted.has('gareth') && canMoveTo('miners_quarter')
            ? { label: '去矿工棚屋区', action: { type: 'move', target: 'miners_quarter' } }
            : canMoveTo('square')
              ? { label: '回广场再转场', action: { type: 'move', target: 'square' } }
              : { label: '先环顾这里', action: { type: 'look' } },
        !contacted.has('mila')
          ? { label: '准备问米拉', input: '对米拉说：我需要你只按伤情告诉我，哪里和口供对不上。' }
          : { label: '准备问加雷斯', input: '对加雷斯说：现在村里到底是谁在急着把汉克先定下来？' },
      ],
    };
  }

  return null;
}

export default function GameView({
  initialState,
  sessionId,
  episodeConfig,
  onSessionExpired,
}: {
  initialState: GameState;
  sessionId: string;
  episodeConfig: EpisodeConfig;
  onSessionExpired: () => void;
}) {
  const [state, setState] = useState<GameState>(initialState);
  const [input, setInput] = useState('');
  const [talkApproach, setTalkApproach] = useState<TalkApproach>('neutral');
  const [presentedClueId, setPresentedClueId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showClues, setShowClues] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitText, setSubmitText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [pendingActionLabel, setPendingActionLabel] = useState<string | null>(null);
  const [optimisticEntries, setOptimisticEntries] = useState<OptimisticEntry[]>([]);
  const [settledRouteId, setSettledRouteId] = useState<string | null>(null);
  const [settlementArtifacts, setSettlementArtifacts] = useState<SettlementArtifactSummary[]>([]);
  const [settlementChronicle, setSettlementChronicle] = useState<SettlementChronicleSummary | null>(null);
  const [settlementNovel, setSettlementNovel] = useState<SettlementNovelSummary | null>(null);
  const [routeProgress, setRouteProgress] = useState<RouteProgressSnapshot[]>(() =>
    computeRouteProgress(episodeConfig, initialState)
  );
  const [progressToast, setProgressToast] = useState<string | null>(null);
  const [slotToast, setSlotToast] = useState<string | null>(null);
  const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<RouteProgressSnapshot[]>(routeProgress);
  const slotRef = useRef<string>(`${initialState.timeline.currentDay}-${initialState.timeline.currentSlotIndex}`);
  const toastTimerRef = useRef<number | null>(null);
  const slotToastTimerRef = useRef<number | null>(null);
  const routeHighlightTimerRef = useRef<number | null>(null);
  const heartbeatInFlightRef = useRef(false);
  const loadingRef = useRef(false);

  const episode = episodeConfig;

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const timelineView = useMemo(
    () => buildTimelineView(state, episode, clockNow),
    [state, episode, clockNow]
  );

  const discoveredClues = useMemo(
    () => episode.clues.filter((clue) => state.discoveredClues.includes(clue.id)),
    [episode.clues, state.discoveredClues]
  );

  const presentableClues = useMemo(
    () => discoveredClues.filter((clue) => !clue.isFalse),
    [discoveredClues]
  );

  const currentIdentity = useMemo(
    () => resolveIdentityForState(episode, state),
    [episode, state]
  );

  const identityPresentation = useMemo(
    () => getIdentityPresentation(currentIdentity),
    [currentIdentity]
  );

  const identityRisk = state.socialLedger?.identityRisk ?? 0;
  const identityRiskPercent = clamp(identityRisk, 0, 100);
  const governanceLedger = state.governanceLedger ?? {
    order: 50,
    humanity: 50,
    survival: 50,
  };
  const worldPressure = state.worldPressure ?? {
    publicHeat: 0,
    evidenceDecay: 0,
    rumorByNpc: {},
    locationPressure: {},
  };
  const currentLocationPressure = worldPressure.locationPressure[state.currentLocation] ?? 0;
  const showGovernanceLedger = episode.id === 'ep03';

  useEffect(() => {
    if (talkApproach !== 'present_evidence') {
      if (presentedClueId) {
        setPresentedClueId('');
      }
      return;
    }

    if (presentableClues.length === 0) {
      setTalkApproach('neutral');
      setPresentedClueId('');
      return;
    }

    if (!presentedClueId || !presentableClues.some((clue) => clue.id === presentedClueId)) {
      setPresentedClueId(presentableClues[0].id);
    }
  }, [talkApproach, presentableClues, presentedClueId]);

  const getNpcsAtLocation = useCallback(
    (locationId: string) =>
      episode.npcs.filter((npc) => {
        const npcState = state.npcStates[npc.id];
        if (!npcState?.isAvailable) return false;
        const npcLocation = npcState.locationOverride ?? npc.locationId;
        return npcLocation === locationId;
      }),
    [episode.npcs, state.npcStates]
  );

  const scrollToBottom = useCallback(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.narrativeLog, optimisticEntries, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    const nextProgress = computeRouteProgress(episode, state, settledRouteId ?? undefined);
    const deltas = diffRouteProgress(progressRef.current, nextProgress).filter((delta) => delta.delta > 0);

    if (deltas.length > 0) {
      const topDelta = deltas.sort((a, b) => b.delta - a.delta)[0];
      setProgressToast(
        `${getRouteTypeLabel(topDelta.routeType)}：「${topDelta.routeName}」+${topDelta.delta}%（${topDelta.current}%）`
      );
      setHighlightedRouteId(topDelta.routeId);

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (routeHighlightTimerRef.current) {
        window.clearTimeout(routeHighlightTimerRef.current);
      }

      toastTimerRef.current = window.setTimeout(() => {
        setProgressToast(null);
      }, 2800);

      routeHighlightTimerRef.current = window.setTimeout(() => {
        setHighlightedRouteId(null);
      }, 1200);
    }

    progressRef.current = nextProgress;
    setRouteProgress(nextProgress);
  }, [episode, settledRouteId, state]);

  useEffect(() => {
    if (state.timeline.mode !== 'realtime_day') return;

    const previous = slotRef.current;
    const current = `${state.timeline.currentDay}-${state.timeline.currentSlotIndex}`;

    if (previous === current) return;

    slotRef.current = current;

    if (state.phase === 'settlement' || sessionExpired) return;

    const [previousDayRaw] = previous.split('-');
    const previousDay = Number(previousDayRaw || state.timeline.currentDay);
    const slotLabel = state.timeline.slotLabels[state.timeline.currentSlotIndex] ?? '未知时段';

    const toastText =
      previousDay !== state.timeline.currentDay
        ? `【进入第${state.timeline.currentDay}天 · ${slotLabel}】`
        : `【进入${slotLabel}】`;

    setSlotToast(toastText);

    if (slotToastTimerRef.current) {
      window.clearTimeout(slotToastTimerRef.current);
    }

    slotToastTimerRef.current = window.setTimeout(() => {
      setSlotToast(null);
    }, 2200);
  }, [
    state.timeline.currentDay,
    state.timeline.currentSlotIndex,
    state.timeline.mode,
    state.timeline.slotLabels,
    state.phase,
    sessionExpired,
  ]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (routeHighlightTimerRef.current) window.clearTimeout(routeHighlightTimerRef.current);
      if (slotToastTimerRef.current) window.clearTimeout(slotToastTimerRef.current);
    };
  }, []);

  function consumeError(error: ApiFailure | null, fallback: string): string {
    if (!error) return fallback;

    if (
      error.code === 'SESSION_EXPIRED' ||
      error.code === 'SESSION_SETTLED' ||
      error.code === 'UNAUTHORIZED' ||
      error.code === 'SESSION_FORBIDDEN'
    ) {
      setSessionExpired(true);
      return error.error ?? '会话已失效，请重新开始。';
    }

    if (error.code === 'ACTION_THROTTLED') {
      const retrySec =
        typeof error.retryAfterMs === 'number'
          ? Math.max(1, Math.ceil(error.retryAfterMs / 1000))
          : null;
      return retrySec
        ? `操作过快，请 ${retrySec} 秒后再试。`
        : error.error ?? '操作过快，请稍后重试。';
    }

    return error.error ?? fallback;
  }

  const sendHeartbeat = useCallback(
    async (payload: { visible: boolean; focused: boolean; online: boolean }) => {
      if (sessionExpired || state.phase === 'settlement') return;
      if (loadingRef.current) return;
      if (heartbeatInFlightRef.current) return;

      heartbeatInFlightRef.current = true;
      try {
        const res = await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            ...payload,
          }),
        });

        const data = (await res.json()) as { state?: GameState; shouldSettle?: boolean } & ApiFailure;

        if (!res.ok) {
          setErrorText(consumeError(data, '心跳同步失败，请稍后重试。'));
          return;
        }

        if (data.state) {
          setState(data.state);
        }
      } catch (error) {
        console.warn('heartbeat failed:', error);
      } finally {
        heartbeatInFlightRef.current = false;
      }
    },
    [sessionExpired, sessionId, state.phase]
  );

  useEffect(() => {
    if (sessionExpired) return;

    const intervalSec = Math.max(1, episode.pacing?.heartbeatIntervalSec ?? 5);

    const collectPresence = () => ({
      visible: document.visibilityState === 'visible',
      focused: document.hasFocus(),
      online: navigator.onLine,
    });

    void sendHeartbeat(collectPresence());

    const interval = window.setInterval(() => {
      void sendHeartbeat(collectPresence());
    }, intervalSec * 1000);

    const handlePresenceEvent = () => {
      void sendHeartbeat(collectPresence());
    };

    document.addEventListener('visibilitychange', handlePresenceEvent);
    window.addEventListener('focus', handlePresenceEvent);
    window.addEventListener('blur', handlePresenceEvent);
    window.addEventListener('online', handlePresenceEvent);
    window.addEventListener('offline', handlePresenceEvent);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handlePresenceEvent);
      window.removeEventListener('focus', handlePresenceEvent);
      window.removeEventListener('blur', handlePresenceEvent);
      window.removeEventListener('online', handlePresenceEvent);
      window.removeEventListener('offline', handlePresenceEvent);
    };
  }, [episode.pacing?.heartbeatIntervalSec, sendHeartbeat, sessionExpired]);

  function resolveLocationLabel(target?: string): string {
    if (!target) return '未知地点';
    const location = episode.locations.find((loc) => loc.id === target || loc.name === target || loc.name.includes(target));
    return location?.name ?? target;
  }

  function buildOptimisticContext(action: GameAction): {
    entries: OptimisticEntry[];
    pendingLabel: string;
  } {
    const now = Date.now();

    switch (action.type) {
      case 'talk': {
        const content = action.content?.trim() || '……';
        const target = action.target ?? '对方';
        const approach = (action.approach ?? 'neutral') as TalkApproach;
        const approachLabel = TALK_APPROACH_OPTIONS.find((option) => option.value === approach)?.label ?? '平稳追问';
        const evidenceName =
          approach === 'present_evidence' && action.presentedClueId
            ? episode.clues.find((clue) => clue.id === action.presentedClueId)?.name
            : undefined;

        return {
          entries: [
            {
              id: createOptimisticId(),
              type: 'player',
              speaker: '你',
              content,
              round: state.round,
              timestamp: now,
              status: 'pending',
            },
          ],
          pendingLabel:
            approach === 'present_evidence'
              ? `正在以「${approachLabel}」和 ${target} 对话${evidenceName ? `（出示：${evidenceName}）` : ''}`
              : `正在以「${approachLabel}」和 ${target} 对话`,
        };
      }
      case 'examine':
        return {
          entries: [
            {
              id: createOptimisticId(),
              type: 'player',
              speaker: '你',
              content: `我开始搜查「${action.target ?? '周围'}」……`,
              round: state.round,
              timestamp: now,
              status: 'pending',
            },
          ],
          pendingLabel: `正在搜查 ${action.target ?? '目标'}`,
        };
      case 'move':
        return {
          entries: [
            {
              id: createOptimisticId(),
              type: 'player',
              speaker: '你',
              content: `我动身前往「${resolveLocationLabel(action.target)}」……`,
              round: state.round,
              timestamp: now,
              status: 'pending',
            },
          ],
          pendingLabel: `正在前往 ${resolveLocationLabel(action.target)}`,
        };
      default:
        return {
          entries: [
            {
              id: createOptimisticId(),
              type: 'player',
              speaker: '你',
              content: '我环顾四周。',
              round: state.round,
              timestamp: now,
              status: 'pending',
            },
          ],
          pendingLabel: '正在观察周围',
        };
    }
  }

  async function sendAction(action: GameAction) {
    if (sessionExpired) return;

    const optimistic = buildOptimisticContext(action);
    setOptimisticEntries(optimistic.entries);
    setPendingActionLabel(optimistic.pendingLabel);
    setLoading(true);
    setErrorText(null);

    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action }),
      });
      const data = (await res.json()) as { state?: GameState } & ApiFailure;

      if (!res.ok) {
        setOptimisticEntries((entries) => entries.map((entry) => ({ ...entry, status: 'failed' })));
        setPendingActionLabel(null);
        setErrorText(consumeError(data, '行动处理失败，请稍后重试。'));
        return;
      }

      setOptimisticEntries([]);
      setPendingActionLabel(null);

      if (data.state) {
        setState(data.state);
      }
    } catch (err) {
      console.error('Action failed:', err);
      setOptimisticEntries((entries) => entries.map((entry) => ({ ...entry, status: 'failed' })));
      setPendingActionLabel(null);
      setErrorText('网络异常，行动未生效。');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReasoning() {
    if (!submitText.trim() || sessionExpired) return;

    const pendingEntry: OptimisticEntry = {
      id: createOptimisticId(),
      type: 'player',
      speaker: '你的推理',
      content: submitText.trim(),
      round: state.round,
      timestamp: Date.now(),
      status: 'pending',
    };

    setOptimisticEntries([pendingEntry]);
    setPendingActionLabel('正在评估你的推理');
    setLoading(true);
    setShowSubmit(false);
    setErrorText(null);

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, submission: submitText }),
      });
      const data = (await res.json()) as {
        state?: GameState;
        settlement?: SettlementResult;
        artifacts?: SettlementArtifactSummary[];
        chronicle?: SettlementChronicleSummary;
        novelProject?: SettlementNovelSummary;
      } & ApiFailure;

      if (!res.ok) {
        setOptimisticEntries((entries) => entries.map((entry) => ({ ...entry, status: 'failed' })));
        setPendingActionLabel(null);
        setErrorText(consumeError(data, '提交失败，请稍后重试。'));
        return;
      }

      setOptimisticEntries([]);
      setPendingActionLabel(null);

      if (data.state) setState(data.state);
      setSettledRouteId(data.settlement?.route?.id ?? null);
      setSettlementArtifacts(data.artifacts ?? []);
      setSettlementChronicle(data.chronicle ?? null);
      setSettlementNovel(data.novelProject ?? null);
    } catch (err) {
      console.error('Submit failed:', err);
      setOptimisticEntries((entries) => entries.map((entry) => ({ ...entry, status: 'failed' })));
      setPendingActionLabel(null);
      setErrorText('网络异常，提交未完成。');
    } finally {
      setLoading(false);
      setSubmitText('');
    }
  }

  function buildTalkAction(target: string, content: string): GameAction | null {
    const normalizedTarget = target.trim();
    const normalizedContent = content.trim();

    if (!normalizedTarget || !normalizedContent) {
      return null;
    }

    if (talkApproach === 'present_evidence' && !presentedClueId) {
      setErrorText('你选择了“出示证据”，但还没有指定要出示的线索。');
      return null;
    }

    return {
      type: 'talk',
      target: normalizedTarget,
      content: normalizedContent,
      approach: talkApproach,
      presentedClueId: talkApproach === 'present_evidence' ? presentedClueId : undefined,
    };
  }

  function parseInput(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || sessionExpired) return;

    const moveMatch = trimmed.match(/^(?:去|前往|移动到?|走到?|go\s+to?)\s*(.+)/i);
    if (moveMatch) {
      void sendAction({ type: 'move', target: moveMatch[1] });
      return;
    }

    const examineMatch = trimmed.match(/^(?:搜查|查看|检查|观察|搜索|examine|look\s+at)\s*(.+)/i);
    if (examineMatch) {
      void sendAction({ type: 'examine', target: examineMatch[1] });
      return;
    }

    const talkMatch = trimmed.match(/^(?:对|跟|和|向|问)\s*(.+?)\s*(?:说|问|聊|：|:)\s*(.+)/);
    if (talkMatch) {
      const talkAction = buildTalkAction(talkMatch[1], talkMatch[2]);
      if (talkAction) {
        void sendAction(talkAction);
      }
      return;
    }

    if (/^(?:环顾|四处看|看看|look|look around)$/i.test(trimmed)) {
      void sendAction({ type: 'look' });
      return;
    }

    const npcsHere = getNpcsAtLocation(state.currentLocation);
    if (npcsHere.length === 1) {
      const talkAction = buildTalkAction(npcsHere[0].id, trimmed);
      if (talkAction) {
        void sendAction(talkAction);
      }
      return;
    }

    void sendAction({ type: 'examine', target: trimmed });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      parseInput(input);
      setInput('');
    }
  }

  function getEntryColor(type: NarrativeEntry['type']): string {
    switch (type) {
      case 'gm':
        return 'var(--gm-color)';
      case 'npc':
        return 'var(--npc-color)';
      case 'player':
        return 'var(--player-color)';
      case 'system':
        return 'var(--system-color)';
      case 'clue':
        return 'var(--clue-color)';
      default:
        return 'var(--foreground)';
    }
  }

  function getEntryPrefix(entry: NarrativeEntry): string {
    switch (entry.type) {
      case 'gm':
        return '';
      case 'npc':
        return `【${entry.speaker}】`;
      case 'player':
        return `【${entry.speaker || state.player.name}】`;
      case 'system':
        return '';
      case 'clue':
        return '🔍 ';
      default:
        return '';
    }
  }

  function getRouteTypeLabel(routeType: RouteProgressSnapshot['routeType']): string {
    return routeType === 'BE' ? 'BE风险' : routeType;
  }

  const currentLoc = useMemo(
    () => episode.locations.find((l) => l.id === state.currentLocation),
    [episode.locations, state.currentLocation]
  );
  const connectedLocs = useMemo(
    () =>
      (currentLoc?.connectedTo
        .map((id) => episode.locations.find((l) => l.id === id))
        .filter((loc): loc is EpisodeConfig['locations'][number] => !!loc)) ?? [],
    [currentLoc, episode.locations]
  );
  const npcsHere = useMemo(
    () => getNpcsAtLocation(state.currentLocation),
    [getNpcsAtLocation, state.currentLocation]
  );
  const episodePrimer = useMemo(
    () =>
      buildEpisodePrimer({
        episode,
        state,
        connectedLocs,
        npcsHere,
      }),
    [connectedLocs, episode, npcsHere, state]
  );
  const isEp01CinematicIntro =
    episode.id === 'ep01' &&
    state.phase !== 'settlement' &&
    state.timeline.currentDay === 1 &&
    state.timeline.currentSlotIndex <= 1 &&
    (state.socialLedger?.npcContacted.length ?? 0) < 3 &&
    !state.flags.ep01_hank_anchor_seen;
  const openingLogCount =
    (episode.openingSequence?.length ?? 0) + (episode.taskBriefing ? 1 : 0);
  const isOpeningSceneVisible =
    isEp01CinematicIntro &&
    state.actionHistory.length === 0 &&
    openingLogCount > 0 &&
    state.narrativeLog.length >= openingLogCount;
  const openingSceneEntries = useMemo(
    () =>
      isOpeningSceneVisible
        ? state.narrativeLog.slice(0, openingLogCount)
        : [],
    [isOpeningSceneVisible, openingLogCount, state.narrativeLog]
  );
  const visibleNarrativeLog = useMemo(
    () =>
      isOpeningSceneVisible
        ? state.narrativeLog.slice(openingLogCount)
        : state.narrativeLog,
    [isOpeningSceneVisible, openingLogCount, state.narrativeLog]
  );
  const suggestedInput = episodePrimer?.actions.find((action) => action.input)?.input;
  const actionPlaceholder = loading
    ? '处理中...'
    : suggestedInput
      ? `例如：${suggestedInput}`
      : '输入行动（对xxx说：/ 去xxx / 搜查xxx / 环顾）';

  function runPrimerAction(action: EpisodePrimerAction) {
    if (action.action) {
      void sendAction(action.action);
      return;
    }

    if (action.input) {
      setInput(action.input);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div
        className="flex items-center justify-between px-4 py-2 text-xs border-b shrink-0"
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span style={{ color: 'var(--system-color)' }}>{episode.name}</span>
          {timelineView.mode === 'realtime_day' ? (
            <span>
              第{timelineView.currentDay}/{timelineView.totalDays}天 · {timelineView.slotLabel} ·{' '}
              {formatClock(timelineView.remainingSecInDay)}
            </span>
          ) : (
            <span>回合 {state.round}/{state.maxRounds}</span>
          )}
          <span>📍 {currentLoc?.name ?? '未知'}</span>
          <span>线索 {discoveredClues.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMap(!showMap)}
            className="hover:opacity-80 transition-opacity"
            style={{ color: showMap ? 'var(--system-color)' : 'var(--muted)' }}
          >
            地图
          </button>
          <button
            onClick={() => setShowClues(!showClues)}
            className="hover:opacity-80 transition-opacity"
            style={{ color: showClues ? 'var(--clue-color)' : 'var(--muted)' }}
          >
            线索
          </button>
          <button
            onClick={() => setShowInventory(!showInventory)}
            className="hover:opacity-80 transition-opacity"
            style={{ color: showInventory ? 'var(--system-color)' : 'var(--muted)' }}
          >
            背包{state.inventory.length > 0 ? ` (${state.inventory.length})` : ''}
          </button>
          {state.phase !== 'settlement' && (
            <button
              onClick={() => setShowSubmit(!showSubmit)}
              className="hover:opacity-80 transition-opacity"
              style={{ color: 'var(--system-color)' }}
            >
              提交推理
            </button>
          )}
          {state.phase === 'settlement' && !sessionExpired && (
            <button
              onClick={onSessionExpired}
              className="hover:opacity-80 transition-opacity"
              style={{ color: 'var(--system-color)' }}
            >
              返回裂隙门
            </button>
          )}
          {sessionExpired && (
            <button
              onClick={onSessionExpired}
              className="hover:opacity-80 transition-opacity"
              style={{ color: 'var(--system-color)' }}
            >
              重新开始
            </button>
          )}
        </div>
      </div>

      <div className="lg:hidden border-b px-4 py-2 text-[11px] space-y-1" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <div>
          身份：{currentIdentity.name} · 风险 {identityRisk}
        </div>
        {showGovernanceLedger && (
          <div>
            治理：秩序 {governanceLedger.order} · 人性 {governanceLedger.humanity} · 生存 {governanceLedger.survival}
          </div>
        )}
        {!isEp01CinematicIntro && (
          <>
            <div>
              世界压力：舆论 {worldPressure.publicHeat} · 证据流失 {worldPressure.evidenceDecay} · 当前地点 {currentLocationPressure}
            </div>
            <div>
              {routeProgress.length === 0 ? (
                <span>尚未锁定结局线索</span>
              ) : (
                routeProgress.map((entry) => (
                  <span key={entry.routeId} className="mr-3">
                    {getRouteTypeLabel(entry.routeType)}:{entry.progress}%
                  </span>
                ))
              )}
            </div>
          </>
        )}
        {state.phase === 'settlement' && settlementArtifacts.length > 0 && (
          <div>
            本次沉淀：{settlementArtifacts.slice(0, 2).map((entry) => entry.title).join(' / ')}
          </div>
        )}
      </div>

      {timelineView.mode === 'realtime_day' && timelineView.isPaused && state.phase !== 'settlement' && (
        <div
          className="px-4 py-2 text-xs border-b"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'rgba(122,176,212,0.08)' }}
        >
          {formatPauseReason(timelineView.pauseReason)}
        </div>
      )}

      {slotToast && (
        <div
          className="px-4 py-2 text-xs border-b progress-toast"
          style={{ borderColor: 'var(--border)', color: 'var(--npc-color)', background: 'rgba(122,176,212,0.08)' }}
        >
          {slotToast}
        </div>
      )}

      {progressToast && (
        <div
          className="px-4 py-2 text-xs border-b progress-toast"
          style={{ borderColor: 'var(--border)', color: 'var(--system-color)', background: 'rgba(212,160,87,0.08)' }}
        >
          {progressToast}
        </div>
      )}

      {errorText && (
        <div
          className="px-4 py-2 text-xs border-b"
          style={{ borderColor: 'var(--border)', color: 'var(--system-color)', background: 'var(--input-bg)' }}
        >
          {errorText}
        </div>
      )}

      {episodePrimer && !isOpeningSceneVisible && (
        <div
          className="px-4 py-2 border-b"
          style={{ borderColor: 'var(--border)', background: 'rgba(122,176,212,0.06)' }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--npc-color)' }}>
                当前焦点 · {episodePrimer.focusName}
              </div>
              <div className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                {episodePrimer.pulse}
              </div>
              <div className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                {episodePrimer.focusRole}
              </div>
              <div className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--player-color)' }}>
                在意：{episodePrimer.stake}
              </div>
              <div className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--npc-color)' }}>
                切口：{episodePrimer.approach}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {episodePrimer.actions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => runPrimerAction(action)}
                  disabled={loading}
                  className="px-2 py-1 text-xs rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--system-color)' }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          {isOpeningSceneVisible && episodePrimer && (
            <div
              className="border-b px-4 py-4 shrink-0"
              style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="max-w-4xl">
                <div className="text-[11px] tracking-[0.2em] mb-2" style={{ color: 'var(--muted)' }}>
                  村口石桥 · 开场
                </div>
                <div className="space-y-4">
                  {openingSceneEntries.map((entry, index) => {
                    if (entry.type === 'npc') {
                      return (
                        <div
                          key={`opening-${index}`}
                          className="rounded-xl border px-4 py-3"
                          style={{
                            borderColor: 'rgba(122,176,212,0.28)',
                            background: 'rgba(122,176,212,0.08)',
                          }}
                        >
                          <div className="text-xs font-bold mb-2" style={{ color: 'var(--npc-color)' }}>
                            【{entry.speaker ?? '来者'}】
                          </div>
                          <div className="text-base leading-8 whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
                            {entry.content}
                          </div>
                        </div>
                      );
                    }

                    if (entry.type === 'system') {
                      return (
                        <div
                          key={`opening-${index}`}
                          className="rounded-lg px-4 py-3"
                          style={{
                            background: 'rgba(212,160,87,0.08)',
                            border: '1px solid rgba(212,160,87,0.2)',
                          }}
                        >
                          <div className="text-sm font-bold" style={{ color: 'var(--system-color)' }}>
                            {entry.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`opening-${index}`}
                        className="text-base leading-8 whitespace-pre-wrap"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {entry.content}
                      </div>
                    );
                  })}
                </div>

                <div
                  className="mt-4 rounded-xl border px-4 py-3"
                  style={{ borderColor: 'var(--border)', background: 'rgba(122,176,212,0.04)' }}
                >
                  <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--npc-color)' }}>
                    当前焦点 · {episodePrimer.focusName}
                  </div>
                  <div className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                    {episodePrimer.pulse}
                  </div>
                  <div className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                    {episodePrimer.focusRole}
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: 'var(--player-color)' }}>
                    在意：{episodePrimer.stake}
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: 'var(--npc-color)' }}>
                    切口：{episodePrimer.approach}
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {episodePrimer.actions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => runPrimerAction(action)}
                        disabled={loading}
                        className="px-3 py-1.5 text-xs rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
                        style={{ borderColor: 'var(--border)', color: 'var(--system-color)' }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {visibleNarrativeLog.map((entry, i) => (
              <div key={`log-${i}`} className="narrative-entry text-sm leading-relaxed whitespace-pre-wrap">
                {entry.type === 'player' ? (
                  <div style={{ color: getEntryColor(entry.type) }}>
                    <span className="font-bold">{getEntryPrefix(entry)}</span>
                    {entry.content}
                  </div>
                ) : (
                  <div style={{ color: getEntryColor(entry.type) }}>
                    {entry.speaker && entry.type === 'npc' && (
                      <span className="font-bold">{getEntryPrefix(entry)}</span>
                    )}
                    {entry.content}
                  </div>
                )}
              </div>
            ))}

            {optimisticEntries.map((entry) => (
              <div
                key={entry.id}
                className={`narrative-entry text-sm leading-relaxed whitespace-pre-wrap optimistic-entry ${entry.status}`}
              >
                <div style={{ color: entry.status === 'failed' ? 'var(--system-color)' : getEntryColor(entry.type) }}>
                  <span className="font-bold">{getEntryPrefix(entry)}</span>
                  {entry.content}
                  {entry.status === 'pending' && <span className="optimistic-dots" />}
                  {entry.status === 'failed' && <span className="ml-2 text-xs">（未生效）</span>}
                </div>
              </div>
            ))}

            {loading && <div className="text-sm cursor-blink" style={{ color: 'var(--muted)' }} />}
          </div>

          {state.phase !== 'settlement' && !sessionExpired && (
            <div className="border-t px-4 py-3 shrink-0" style={{ borderColor: 'var(--border)' }}>
              {pendingActionLabel && (
                <div
                  className="mb-2 px-2 py-1 text-xs rounded border pending-status"
                  style={{ borderColor: 'var(--border)', color: 'var(--system-color)', background: 'rgba(212,160,87,0.08)' }}
                >
                  正在处理：{pendingActionLabel}
                </div>
              )}

              {npcsHere.length > 0 && !isOpeningSceneVisible && (
                <div className="mb-3">
                  <div className="text-[11px] font-bold mb-2" style={{ color: 'var(--npc-color)' }}>
                    此地人物
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {npcsHere.map((npc) => {
                      const npcState = state.npcStates[npc.id];
                      return (
                        <button
                          key={npc.id}
                          type="button"
                          onClick={() => {
                            setInput(`对${npc.name}说：`);
                            inputRef.current?.focus();
                          }}
                          disabled={loading}
                          className="text-left rounded border px-3 py-2 transition-opacity hover:opacity-85 disabled:opacity-40"
                          style={{
                            borderColor: 'var(--border)',
                            background: 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                              {npc.name}
                            </div>
                            <div className="text-[10px]" style={{ color: getNpcStanceColor(npcState) }}>
                              {getNpcStanceLabel(npcState)}
                            </div>
                          </div>
                          <div className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                            {npc.role}
                          </div>
                          {npc.firstImpression && (
                            <div className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--foreground)' }}>
                              {npc.firstImpression}
                            </div>
                          )}
                          {npc.emotionalStake && (
                            <div className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--player-color)' }}>
                              在意：{npc.emotionalStake}
                            </div>
                          )}
                          {npc.approachHint && (
                            <div className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--npc-color)' }}>
                              切口：{npc.approachHint}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isOpeningSceneVisible && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {connectedLocs.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      void sendAction({ type: 'move', target: loc.id });
                    }}
                    disabled={loading}
                    className="px-2 py-1 text-xs rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ borderColor: 'var(--border)', color: 'var(--gm-color)' }}
                  >
                    去{loc.name}
                  </button>
                ))}
                {npcsHere.map((npc) => (
                  <button
                    key={npc.id}
                    onClick={() => {
                      setInput(`对${npc.name}说：`);
                      inputRef.current?.focus();
                    }}
                    disabled={loading}
                    className="px-2 py-1 text-xs rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ borderColor: 'var(--border)', color: 'var(--npc-color)' }}
                  >
                    与{npc.name}交谈
                  </button>
                ))}
                <button
                  onClick={() => {
                    void sendAction({ type: 'look' });
                  }}
                  disabled={loading}
                  className="px-2 py-1 text-xs rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  环顾四周
                </button>
              </div>
              )}

              {!isOpeningSceneVisible && (
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                <span style={{ color: 'var(--npc-color)' }}>对话策略</span>
                <select
                  value={talkApproach}
                  onChange={(event) => {
                    const next = event.target.value as TalkApproach;
                    setTalkApproach(next);
                    if (next !== 'present_evidence') {
                      setPresentedClueId('');
                    }
                  }}
                  disabled={loading}
                  className="rounded border px-2 py-1 bg-transparent disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  {TALK_APPROACH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {talkApproach === 'present_evidence' && (
                  <>
                    <span style={{ color: 'var(--clue-color)' }}>出示线索</span>
                    <select
                      value={presentedClueId}
                      onChange={(event) => setPresentedClueId(event.target.value)}
                      disabled={loading || presentableClues.length === 0}
                      className="rounded border px-2 py-1 bg-transparent disabled:opacity-40"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    >
                      {presentableClues.length === 0 ? (
                        <option value="">暂无可出示线索</option>
                      ) : (
                        presentableClues.map((clue) => (
                          <option key={clue.id} value={clue.id}>
                            [{clue.id}] {clue.name}
                          </option>
                        ))
                      )}
                    </select>
                  </>
                )}
                <span style={{ color: 'var(--muted)' }}>· {TALK_APPROACH_HINT[talkApproach]}</span>
              </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--player-color)' }}>&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  placeholder={actionPlaceholder}
                  className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-40"
                  style={{ color: 'var(--foreground)' }}
                />
              </div>
            </div>
          )}

          {sessionExpired && (
            <div className="border-t px-4 py-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              会话已失效。请重新开始新的调查。
            </div>
          )}
        </div>

        <div
          className="hidden lg:block w-72 border-l overflow-y-auto p-3 shrink-0"
          style={{ borderColor: 'var(--border)', background: 'rgba(20,20,24,0.75)' }}
        >
          <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--npc-color)' }}>
            当前身份
          </h3>
          <div className="rounded border px-3 py-2 mb-4" style={{ borderColor: 'var(--border)', background: 'rgba(122,176,212,0.06)' }}>
            <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
              {currentIdentity.title}
            </div>
            <div className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>
              {state.player.identityBrief}
            </div>
            <div className="mt-2 text-[11px]" style={{ color: 'var(--player-color)' }}>
              优势：{identityPresentation.advantages.join('；')}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: 'var(--system-color)' }}>
              代价：{identityPresentation.costs.join('；')}
            </div>
            {!isEp01CinematicIntro && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                  <span>身份风险</span>
                  <span style={{ color: 'var(--system-color)' }}>{identityRisk}</span>
                </div>
                <div className="h-1.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded progress-fill"
                    style={{
                      width: `${identityRiskPercent}%`,
                      background: identityRiskPercent >= 70 ? 'var(--system-color)' : 'var(--npc-color)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {showGovernanceLedger && (
            <div className="rounded border px-3 py-2 mb-4" style={{ borderColor: 'var(--border)', background: 'rgba(108,188,164,0.08)' }}>
              <div className="text-xs font-bold mb-2" style={{ color: 'var(--npc-color)' }}>
                治理指标
              </div>
              <div className="space-y-2">
                {[
                  { label: '秩序', value: governanceLedger.order, color: 'var(--player-color)' },
                  { label: '人性', value: governanceLedger.humanity, color: 'var(--system-color)' },
                  { label: '生存', value: governanceLedger.survival, color: 'var(--clue-color)' },
                ].map((entry) => (
                  <div key={entry.label}>
                    <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                      <span>{entry.label}</span>
                      <span style={{ color: entry.color }}>{entry.value}</span>
                    </div>
                    <div className="h-1.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded progress-fill"
                        style={{
                          width: `${clamp(entry.value, 0, 100)}%`,
                          background: entry.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isEp01CinematicIntro && (
            <div className="rounded border px-3 py-2 mb-4" style={{ borderColor: 'var(--border)', background: 'rgba(212,160,87,0.08)' }}>
              <div className="text-xs font-bold mb-2" style={{ color: 'var(--system-color)' }}>
                世界压力
              </div>
              <div className="space-y-2">
                {[
                  { label: '舆论热度', value: worldPressure.publicHeat, color: 'var(--system-color)' },
                  { label: '证据流失', value: worldPressure.evidenceDecay, color: 'var(--clue-color)' },
                  { label: '当前地点压力', value: currentLocationPressure * 16.6, color: 'var(--npc-color)' },
                ].map((entry) => (
                  <div key={entry.label}>
                    <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                      <span>{entry.label}</span>
                      <span style={{ color: entry.color }}>{Math.round(entry.value)}</span>
                    </div>
                    <div className="h-1.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded progress-fill"
                        style={{
                          width: `${clamp(entry.value, 0, 100)}%`,
                          background: entry.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                压力升高后，NPC 会更保守，高阶物证也更容易只剩残片。
              </div>
            </div>
          )}

          {!isEp01CinematicIntro && (
            <>
              <h3 className="text-xs font-bold mb-3" style={{ color: 'var(--system-color)' }}>
                结局进度
              </h3>
              <div className="space-y-3">
                {routeProgress.length === 0 ? (
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                    还没有锁定任何结局线索。继续调查后，这里才会逐条显示对应路线进度。
                  </div>
                ) : (
                  routeProgress.map((entry) => (
                    <div
                      key={entry.routeId}
                      className={`rounded border px-2 py-2 route-progress-item ${highlightedRouteId === entry.routeId ? 'active' : ''}`}
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color: 'var(--foreground)' }}>{getRouteTypeLabel(entry.routeType)}：{entry.routeName}</span>
                        <span style={{ color: 'var(--system-color)' }}>{entry.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded progress-rail" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div
                          className="h-full rounded progress-fill"
                          style={{
                            width: `${entry.progress}%`,
                            background:
                              entry.routeType === 'HE'
                                ? 'var(--player-color)'
                                : entry.routeType === 'TE'
                                  ? 'var(--npc-color)'
                                  : entry.routeType === 'SE'
                                    ? 'var(--clue-color)'
                                    : 'var(--system-color)',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {state.phase === 'settlement' && (
            <div className="mt-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--clue-color)' }}>
                  本次沉淀
                </h3>
                <div className="rounded border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'rgba(199,158,207,0.06)' }}>
                  {settlementArtifacts.length > 0 ? (
                    <div className="space-y-2">
                      {settlementArtifacts.map((entry) => (
                        <div key={entry.id} className="text-[11px]" style={{ color: 'var(--foreground)' }}>
                          {entry.kind === 'archive_summary'
                            ? '档案'
                            : entry.kind === 'world_bulletin'
                              ? '日报'
                              : entry.kind === 'fragment_log'
                                ? '碎片'
                                : entry.kind}
                          ：{entry.title}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      这次结算尚未生成额外沉淀。
                    </div>
                  )}
                </div>
              </div>

              {settlementChronicle && (
                <div>
                  <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--player-color)' }}>
                    主角经历
                  </h3>
                  <div className="rounded border px-3 py-2 text-[11px]" style={{ borderColor: 'var(--border)', background: 'rgba(139,196,138,0.06)', color: 'var(--foreground)' }}>
                    {settlementChronicle.title} · {settlementChronicle.routeType}
                  </div>
                </div>
              )}

              {settlementNovel && (
                <div>
                  <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--system-color)' }}>
                    小说化提纲
                  </h3>
                  <div className="rounded border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'rgba(212,160,87,0.06)' }}>
                    <div className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>
                      已生成 {settlementNovel.chapterCount} 章提纲，每章目标约 {settlementNovel.wordsPerChapter} 字。
                    </div>
                    <div className="space-y-2">
                      {settlementNovel.previewChapters.map((chapter) => (
                        <div key={chapter.chapter} className="text-[11px]" style={{ color: 'var(--foreground)' }}>
                          第{chapter.chapter}章 · {chapter.title} · 视角：{chapter.pov}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showClues && (
          <div
            className="w-72 border-l overflow-y-auto p-3 shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <h3 className="text-xs font-bold mb-3" style={{ color: 'var(--clue-color)' }}>
              已发现线索 ({discoveredClues.length})
            </h3>
            {discoveredClues.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>暂无线索</p>
            ) : (
              <div className="space-y-3">
                {discoveredClues.map((clue) => (
                  <div key={clue.id} className="text-xs">
                    <div className="font-bold" style={{ color: 'var(--clue-color)' }}>
                      [{clue.tier}] {clue.name}
                    </div>
                    <div className="mt-1 leading-relaxed" style={{ color: 'var(--foreground)' }}>
                      {clue.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showMap && (
          <div
            className="w-72 border-l overflow-y-auto p-3 shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <h3 className="text-xs font-bold mb-3" style={{ color: 'var(--gm-color)' }}>
              {episode.name}地图
            </h3>
            <div className="space-y-2">
              {episode.locations.map((loc) => {
                const isCurrent = loc.id === state.currentLocation;
                const isVisited = state.visitedLocations.includes(loc.id);
                return (
                  <div
                    key={loc.id}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      background: isCurrent ? 'var(--border)' : 'transparent',
                      color: isCurrent
                        ? 'var(--system-color)'
                        : isVisited
                          ? 'var(--foreground)'
                          : 'var(--muted)',
                    }}
                  >
                    {isCurrent ? '▸ ' : '  '}
                    {loc.name}
                    {isCurrent ? ' (当前)' : ''}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showInventory && (
          <div
            className="w-64 border-l overflow-y-auto p-3 shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}
          >
            <h3 className="text-xs font-bold mb-3" style={{ color: 'var(--system-color)' }}>
              背包
            </h3>
            {state.inventory.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>空空如也。</p>
            ) : (
              <div className="space-y-2">
                {state.inventory.map((itemId) => {
                  const item = episode.items.find((i) => i.id === itemId);
                  if (!item) return null;
                  return (
                    <div key={itemId} className="text-xs p-2 rounded" style={{ background: 'var(--border)' }}>
                      <div className="font-bold" style={{ color: 'var(--system-color)' }}>
                        {item.name}
                      </div>
                      <div className="mt-1" style={{ color: 'var(--muted)' }}>
                        {item.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showSubmit && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="max-w-lg w-full mx-4 p-6 rounded-lg" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--system-color)' }}>
              提交推理
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
              请写下你的判断：关键责任人是谁？你依据了哪些事实？你的裁断如何平衡情与法？
            </p>
            <textarea
              value={submitText}
              onChange={(e) => setSubmitText(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 text-sm rounded border focus:outline-none resize-none"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              placeholder="我认为关键责任人是……证据包括……我的判决是……"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSubmit(false)}
                className="px-4 py-2 text-xs rounded border transition-opacity hover:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  void handleSubmitReasoning();
                }}
                disabled={!submitText.trim() || loading}
                className="px-4 py-2 text-xs rounded font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--system-color)', color: 'var(--background)' }}
              >
                {loading ? '评估中...' : '提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
