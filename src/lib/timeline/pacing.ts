import {
  EpisodeConfig,
  EpisodePacingConfig,
  GameState,
  GameTimelineState,
  TimelinePauseReason,
} from '../types';

const DEFAULT_SLOT_LABELS = ['清晨', '上午', '正午', '午后', '傍晚', '夜间'];
const DEFAULT_REALTIME_PACING: EpisodePacingConfig = {
  mode: 'realtime_day',
  dayDurationSec: 3600,
  totalDays: 1,
  slotLabels: DEFAULT_SLOT_LABELS,
  heartbeatIntervalSec: 5,
  heartbeatTimeoutSec: 12,
  llmTimeMultiplier: 0.5,
};

export interface TimelineSlotTransition {
  fromDay: number;
  fromSlotIndex: number;
  toDay: number;
  toSlotIndex: number;
  crossDay: boolean;
}

export interface TimelineMutationResult {
  state: GameState;
  transitions: TimelineSlotTransition[];
  exhausted: boolean;
  consumedSec: number;
}

interface TimelinePoint {
  day: number;
  slotIndex: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function slotCount(pacing: EpisodePacingConfig): number {
  return Math.max(1, pacing.slotLabels.length);
}

function totalDurationSec(pacing: EpisodePacingConfig): number {
  return Math.max(1, pacing.dayDurationSec) * Math.max(1, pacing.totalDays);
}

function slotDurationSec(pacing: EpisodePacingConfig): number {
  return Math.max(1, pacing.dayDurationSec) / slotCount(pacing);
}

export function getEpisodePacing(episode: EpisodeConfig): EpisodePacingConfig {
  const pacing = episode.pacing;

  if (!pacing) {
    return {
      ...DEFAULT_REALTIME_PACING,
      totalDays: Math.max(1, episode.difficulty ?? 1),
    };
  }

  const labels = pacing.slotLabels?.filter((label) => label.trim().length > 0) ?? [];

  if (pacing.mode === 'round') {
    return {
      mode: 'round',
      dayDurationSec: Math.max(1, pacing.dayDurationSec || episode.maxRounds || 1),
      totalDays: 1,
      slotLabels: labels.length > 0 ? labels : ['回合'],
      heartbeatIntervalSec: Math.max(1, pacing.heartbeatIntervalSec || 5),
      heartbeatTimeoutSec: Math.max(1, pacing.heartbeatTimeoutSec || 12),
      llmTimeMultiplier: clamp(pacing.llmTimeMultiplier ?? 0.5, 0, 1),
    };
  }

  return {
    mode: 'realtime_day',
    dayDurationSec: Math.max(60, pacing.dayDurationSec || DEFAULT_REALTIME_PACING.dayDurationSec),
    totalDays: Math.max(1, pacing.totalDays || 1),
    slotLabels: labels.length > 0 ? labels : DEFAULT_SLOT_LABELS,
    heartbeatIntervalSec: Math.max(1, pacing.heartbeatIntervalSec || DEFAULT_REALTIME_PACING.heartbeatIntervalSec),
    heartbeatTimeoutSec: Math.max(3, pacing.heartbeatTimeoutSec || DEFAULT_REALTIME_PACING.heartbeatTimeoutSec),
    llmTimeMultiplier: clamp(
      pacing.llmTimeMultiplier ?? DEFAULT_REALTIME_PACING.llmTimeMultiplier,
      0,
      1
    ),
  };
}

function resolveTimelinePoint(elapsedSec: number, pacing: EpisodePacingConfig): TimelinePoint {
  const totalSec = totalDurationSec(pacing);
  const slots = slotCount(pacing);

  if (elapsedSec >= totalSec) {
    return {
      day: pacing.totalDays,
      slotIndex: slots - 1,
    };
  }

  const safeElapsed = Math.max(0, elapsedSec);
  const dayDuration = pacing.dayDurationSec;
  const dayIndex = clamp(Math.floor(safeElapsed / dayDuration), 0, pacing.totalDays - 1);
  const dayElapsed = safeElapsed - dayIndex * dayDuration;
  const index = clamp(Math.floor(dayElapsed / slotDurationSec(pacing)), 0, slots - 1);

  return {
    day: dayIndex + 1,
    slotIndex: index,
  };
}

function nextTimelinePoint(current: TimelinePoint, pacing: EpisodePacingConfig): TimelinePoint | null {
  const slots = slotCount(pacing);

  if (current.day === pacing.totalDays && current.slotIndex >= slots - 1) {
    return null;
  }

  if (current.slotIndex < slots - 1) {
    return {
      day: current.day,
      slotIndex: current.slotIndex + 1,
    };
  }

  return {
    day: current.day + 1,
    slotIndex: 0,
  };
}

function collectSlotTransitions(
  beforeElapsed: number,
  afterElapsed: number,
  pacing: EpisodePacingConfig
): TimelineSlotTransition[] {
  if (afterElapsed <= beforeElapsed) return [];

  const transitions: TimelineSlotTransition[] = [];
  let point = resolveTimelinePoint(beforeElapsed, pacing);
  const target = resolveTimelinePoint(afterElapsed, pacing);

  while (point.day !== target.day || point.slotIndex !== target.slotIndex) {
    const next = nextTimelinePoint(point, pacing);
    if (!next) break;

    transitions.push({
      fromDay: point.day,
      fromSlotIndex: point.slotIndex,
      toDay: next.day,
      toSlotIndex: next.slotIndex,
      crossDay: next.day !== point.day,
    });

    point = next;
  }

  return transitions;
}

function normalizeTimeline(
  timeline: GameTimelineState,
  pacing: EpisodePacingConfig
): GameTimelineState {
  if (pacing.mode === 'round') {
    return timeline;
  }

  const totalSec = totalDurationSec(pacing);
  const elapsed = clamp(timeline.elapsedSecTotal, 0, totalSec);
  const point = resolveTimelinePoint(elapsed, pacing);
  const remainingTotal = Math.max(0, Math.ceil(totalSec - elapsed));
  const remainingInDay =
    remainingTotal <= 0
      ? 0
      : ((remainingTotal - 1) % pacing.dayDurationSec) + 1;

  return {
    ...timeline,
    mode: 'realtime_day',
    totalDays: pacing.totalDays,
    dayDurationSec: pacing.dayDurationSec,
    slotLabels: pacing.slotLabels,
    slotDurationSec: slotDurationSec(pacing),
    currentDay: point.day,
    currentSlotIndex: point.slotIndex,
    elapsedSecTotal: elapsed,
    remainingSecTotal: remainingTotal,
    remainingSecInDay: remainingInDay,
    lastTickAt: timeline.lastTickAt || Date.now(),
    lastHeartbeatAt: timeline.lastHeartbeatAt || Date.now(),
  };
}

function withTimeline(state: GameState, timeline: GameTimelineState): GameState {
  return {
    ...state,
    timeline,
  };
}

function advanceInternal(
  state: GameState,
  pacing: EpisodePacingConfig,
  consumedSec: number
): TimelineMutationResult {
  if (pacing.mode !== 'realtime_day' || consumedSec <= 0) {
    const normalized = normalizeTimeline(state.timeline, pacing);
    return {
      state: withTimeline(state, normalized),
      transitions: [],
      exhausted: normalized.remainingSecTotal <= 0,
      consumedSec: 0,
    };
  }

  const normalized = normalizeTimeline(state.timeline, pacing);
  const beforeElapsed = normalized.elapsedSecTotal;
  const afterElapsed = clamp(beforeElapsed + consumedSec, 0, totalDurationSec(pacing));
  const transitions = collectSlotTransitions(beforeElapsed, afterElapsed, pacing);

  const nextTimeline = normalizeTimeline(
    {
      ...normalized,
      elapsedSecTotal: afterElapsed,
    },
    pacing
  );

  return {
    state: withTimeline(state, nextTimeline),
    transitions,
    exhausted: nextTimeline.remainingSecTotal <= 0,
    consumedSec,
  };
}

function countElapsedSecSinceLastTick(
  timeline: GameTimelineState,
  pacing: EpisodePacingConfig,
  nowMs: number
): number {
  if (timeline.isPaused) return 0;

  const lastTickAt = timeline.lastTickAt || nowMs;
  const timeoutMs = pacing.heartbeatTimeoutSec * 1000;
  const deadlineMs = (timeline.lastHeartbeatAt || nowMs) + timeoutMs;
  const countUntilMs = nowMs > deadlineMs ? deadlineMs : nowMs;

  if (countUntilMs <= lastTickAt) return 0;
  return (countUntilMs - lastTickAt) / 1000;
}

export function createInitialTimelineState(
  episode: EpisodeConfig,
  nowMs = Date.now()
): GameTimelineState {
  const pacing = getEpisodePacing(episode);

  if (pacing.mode === 'round') {
    return {
      mode: 'round',
      totalDays: 1,
      dayDurationSec: pacing.dayDurationSec,
      slotLabels: pacing.slotLabels,
      slotDurationSec: pacing.dayDurationSec,
      currentDay: 1,
      currentSlotIndex: 0,
      elapsedSecTotal: 0,
      remainingSecTotal: pacing.dayDurationSec,
      remainingSecInDay: pacing.dayDurationSec,
      isPaused: false,
      lastTickAt: nowMs,
      lastHeartbeatAt: nowMs,
    };
  }

  const timeline: GameTimelineState = {
    mode: 'realtime_day',
    totalDays: pacing.totalDays,
    dayDurationSec: pacing.dayDurationSec,
    slotLabels: pacing.slotLabels,
    slotDurationSec: slotDurationSec(pacing),
    currentDay: 1,
    currentSlotIndex: 0,
    elapsedSecTotal: 0,
    remainingSecTotal: totalDurationSec(pacing),
    remainingSecInDay: pacing.dayDurationSec,
    isPaused: false,
    lastTickAt: nowMs,
    lastHeartbeatAt: nowMs,
  };

  return normalizeTimeline(timeline, pacing);
}

export function advanceTimelineBySeconds(
  state: GameState,
  episode: EpisodeConfig,
  consumedSec: number
): TimelineMutationResult {
  const pacing = getEpisodePacing(episode);
  return advanceInternal(state, pacing, consumedSec);
}

export function touchTimelineActive(
  state: GameState,
  episode: EpisodeConfig,
  nowMs = Date.now()
): TimelineMutationResult {
  const pacing = getEpisodePacing(episode);
  const normalized = normalizeTimeline(state.timeline, pacing);

  if (pacing.mode !== 'realtime_day') {
    return {
      state,
      transitions: [],
      exhausted: false,
      consumedSec: 0,
    };
  }

  const consumedSec = countElapsedSecSinceLastTick(normalized, pacing, nowMs);
  const advanced = advanceInternal(withTimeline(state, normalized), pacing, consumedSec);

  const timeline = normalizeTimeline(
    {
      ...advanced.state.timeline,
      isPaused: false,
      pauseReason: undefined,
      lastTickAt: nowMs,
      lastHeartbeatAt: nowMs,
    },
    pacing
  );

  return {
    state: withTimeline(advanced.state, timeline),
    transitions: advanced.transitions,
    exhausted: timeline.remainingSecTotal <= 0,
    consumedSec,
  };
}

export function touchTimelinePaused(
  state: GameState,
  episode: EpisodeConfig,
  reason: TimelinePauseReason,
  nowMs = Date.now()
): TimelineMutationResult {
  const pacing = getEpisodePacing(episode);
  const normalized = normalizeTimeline(state.timeline, pacing);

  if (pacing.mode !== 'realtime_day') {
    return {
      state,
      transitions: [],
      exhausted: false,
      consumedSec: 0,
    };
  }

  const consumedSec = countElapsedSecSinceLastTick(normalized, pacing, nowMs);
  const advanced = advanceInternal(withTimeline(state, normalized), pacing, consumedSec);

  const timeline = normalizeTimeline(
    {
      ...advanced.state.timeline,
      isPaused: true,
      pauseReason: reason,
      lastTickAt: nowMs,
      lastHeartbeatAt: nowMs,
    },
    pacing
  );

  return {
    state: withTimeline(advanced.state, timeline),
    transitions: advanced.transitions,
    exhausted: timeline.remainingSecTotal <= 0,
    consumedSec,
  };
}

export function applyProcessingWindow(
  state: GameState,
  episode: EpisodeConfig,
  totalMs: number,
  llmMs: number,
  nowMs = Date.now()
): TimelineMutationResult {
  const pacing = getEpisodePacing(episode);

  if (pacing.mode !== 'realtime_day') {
    return {
      state,
      transitions: [],
      exhausted: false,
      consumedSec: 0,
    };
  }

  const safeTotalMs = Math.max(0, totalMs);
  const safeLlmMs = clamp(llmMs, 0, safeTotalMs);
  const nonLlmMs = safeTotalMs - safeLlmMs;
  const consumedSec = (nonLlmMs + safeLlmMs * pacing.llmTimeMultiplier) / 1000;

  const advanced = advanceInternal(state, pacing, consumedSec);

  const timeline = normalizeTimeline(
    {
      ...advanced.state.timeline,
      isPaused: false,
      pauseReason: undefined,
      lastTickAt: nowMs,
      lastHeartbeatAt: nowMs,
    },
    pacing
  );

  return {
    state: withTimeline(advanced.state, timeline),
    transitions: advanced.transitions,
    exhausted: timeline.remainingSecTotal <= 0,
    consumedSec,
  };
}

export function markTimelineSettled(
  state: GameState,
  episode: EpisodeConfig,
  nowMs = Date.now()
): GameState {
  const pacing = getEpisodePacing(episode);
  const timeline = normalizeTimeline(
    {
      ...state.timeline,
      isPaused: true,
      pauseReason: 'settled',
      lastTickAt: nowMs,
      lastHeartbeatAt: nowMs,
    },
    pacing
  );

  return withTimeline(state, timeline);
}

export function isTimelineExpired(state: GameState, episode: EpisodeConfig): boolean {
  const pacing = getEpisodePacing(episode);
  if (pacing.mode !== 'realtime_day') return false;

  const normalized = normalizeTimeline(state.timeline, pacing);
  return normalized.remainingSecTotal <= 0;
}
