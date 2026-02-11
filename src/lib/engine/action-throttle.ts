import { GameAction } from '../types';

const MIN_ACTION_INTERVAL_MS = 800;
const WINDOW_MS = 60_000;
const MAX_ACTIONS_PER_WINDOW = 24;
const MAX_TALKS_PER_WINDOW = 12;

type ActionType = GameAction['type'];

interface ActionStamp {
  at: number;
  type: ActionType;
}

interface UserThrottleState {
  lastActionAt: number;
  events: ActionStamp[];
}

export interface ActionThrottlePass {
  ok: true;
}

export interface ActionThrottleBlock {
  ok: false;
  retryAfterMs: number;
  reason: 'min_interval' | 'total_window' | 'talk_window';
}

const globalThrottleStore = globalThis as unknown as {
  __infiniteEchoesActionThrottle?: Map<string, UserThrottleState>;
};

const throttleStore =
  globalThrottleStore.__infiniteEchoesActionThrottle ??
  (globalThrottleStore.__infiniteEchoesActionThrottle = new Map<string, UserThrottleState>());

function pruneEvents(events: ActionStamp[], now: number): ActionStamp[] {
  const threshold = now - WINDOW_MS;
  return events.filter((entry) => entry.at > threshold);
}

function computeWindowRetry(now: number, entries: ActionStamp[]): number {
  if (entries.length === 0) return MIN_ACTION_INTERVAL_MS;
  const oldest = entries[0];
  const waitMs = WINDOW_MS - (now - oldest.at);
  return Math.max(MIN_ACTION_INTERVAL_MS, waitMs);
}

export function checkActionThrottle(
  userId: string,
  actionType: ActionType,
  now = Date.now()
): ActionThrottlePass | ActionThrottleBlock {
  const state = throttleStore.get(userId) ?? {
    lastActionAt: 0,
    events: [],
  };

  state.events = pruneEvents(state.events, now);

  if (state.lastActionAt > 0) {
    const deltaMs = now - state.lastActionAt;
    if (deltaMs < MIN_ACTION_INTERVAL_MS) {
      throttleStore.set(userId, state);
      return {
        ok: false,
        reason: 'min_interval',
        retryAfterMs: Math.max(1, MIN_ACTION_INTERVAL_MS - deltaMs),
      };
    }
  }

  if (state.events.length >= MAX_ACTIONS_PER_WINDOW) {
    const retryAfterMs = computeWindowRetry(now, state.events);
    throttleStore.set(userId, state);
    return {
      ok: false,
      reason: 'total_window',
      retryAfterMs,
    };
  }

  if (actionType === 'talk') {
    const talkEvents = state.events.filter((entry) => entry.type === 'talk');
    if (talkEvents.length >= MAX_TALKS_PER_WINDOW) {
      const retryAfterMs = computeWindowRetry(now, talkEvents);
      throttleStore.set(userId, state);
      return {
        ok: false,
        reason: 'talk_window',
        retryAfterMs,
      };
    }
  }

  state.lastActionAt = now;
  state.events.push({ at: now, type: actionType });
  throttleStore.set(userId, state);

  return { ok: true };
}
