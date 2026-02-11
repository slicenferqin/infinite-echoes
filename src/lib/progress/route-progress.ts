import { EpisodeConfig, GameState, RouteDefinition } from '../types';

export interface RouteProgressSnapshot {
  routeId: string;
  routeType: RouteDefinition['type'];
  routeName: string;
  progress: number;
  matchedWeight: number;
  totalWeight: number;
}

export interface RouteProgressDelta {
  routeId: string;
  routeType: RouteDefinition['type'];
  routeName: string;
  previous: number;
  current: number;
  delta: number;
}

interface InternalRouteProgressSnapshot extends RouteProgressSnapshot {
  visible: boolean;
}

const routeTypeOrder: Record<RouteDefinition['type'], number> = {
  HE: 0,
  TE: 1,
  SE: 2,
  BE: 3,
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isCheckpointSatisfied(
  state: GameState,
  checkpoint: {
    trigger: {
      type: 'clue' | 'flag';
      key: string;
    };
  }
): boolean {
  if (checkpoint.trigger.type === 'clue') {
    return state.discoveredClues.includes(checkpoint.trigger.key);
  }

  return !!state.flags[checkpoint.trigger.key];
}

export function computeRouteProgress(
  episode: EpisodeConfig,
  state: GameState,
  settledRouteId?: string
): RouteProgressSnapshot[] {
  const routes = episode.routes;
  const trackConfig = episode.progressTracks ??
    routes.map((route) => ({
      routeId: route.id,
      routeType: route.type,
      name: route.name,
      checkpoints: [],
    }));

  const baseSnapshots: InternalRouteProgressSnapshot[] = trackConfig.map((track) => {
    const route = routes.find((entry) => entry.id === track.routeId);
    const routeType = route?.type ?? track.routeType;
    const routeName = route?.name ?? track.name;
    const isSettledRoute = Boolean(settledRouteId && settledRouteId === track.routeId);

    if (routeType === 'BE') {
      return {
        routeId: track.routeId,
        routeType,
        routeName,
        progress: 0,
        matchedWeight: 0,
        totalWeight: 100,
        visible: isSettledRoute,
      };
    }

    let matchedWeight = 0;
    let matchedCheckpointCount = 0;

    for (const checkpoint of track.checkpoints) {
      if (isCheckpointSatisfied(state, checkpoint)) {
        matchedWeight += checkpoint.weight;
        matchedCheckpointCount += 1;
      }
    }

    const totalWeight = track.checkpoints.reduce((sum, checkpoint) => sum + checkpoint.weight, 0);
    const progress = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;

    return {
      routeId: track.routeId,
      routeType,
      routeName,
      progress: clampPercent(progress),
      matchedWeight,
      totalWeight: totalWeight || 100,
      visible: isSettledRoute || track.checkpoints.length === 0 || matchedCheckpointCount > 0,
    };
  });

  const visibleNonBe = baseSnapshots.filter(
    (snapshot) => snapshot.routeType !== 'BE' && snapshot.visible
  );

  const maxVisibleNonBe = visibleNonBe.reduce(
    (max, snapshot) => Math.max(max, snapshot.progress),
    0
  );

  const hasVisibleNonBeProgress = visibleNonBe.some((snapshot) => snapshot.progress > 0);
  const beRisk = hasVisibleNonBeProgress ? clampPercent(100 - maxVisibleNonBe) : 0;

  const withRisk = baseSnapshots.map((snapshot) => {
    if (snapshot.routeType !== 'BE') {
      return snapshot;
    }

    if (!snapshot.visible) {
      return snapshot;
    }

    return {
      ...snapshot,
      progress: beRisk,
      matchedWeight: beRisk,
    };
  });

  const withSettlementBoost = withRisk.map((snapshot) => {
    if (!settledRouteId || snapshot.routeId !== settledRouteId) {
      return snapshot;
    }

    return {
      ...snapshot,
      visible: true,
      progress: 100,
      matchedWeight: snapshot.totalWeight,
    };
  });

  return withSettlementBoost
    .filter((snapshot) => snapshot.visible)
    .sort((a, b) => routeTypeOrder[a.routeType] - routeTypeOrder[b.routeType])
    .map((snapshot) => ({
      routeId: snapshot.routeId,
      routeType: snapshot.routeType,
      routeName: snapshot.routeName,
      progress: snapshot.progress,
      matchedWeight: snapshot.matchedWeight,
      totalWeight: snapshot.totalWeight,
    }));
}

export function diffRouteProgress(
  previous: RouteProgressSnapshot[],
  next: RouteProgressSnapshot[]
): RouteProgressDelta[] {
  const previousMap = new Map(previous.map((entry) => [entry.routeId, entry]));

  return next
    .map((entry) => {
      const prev = previousMap.get(entry.routeId);
      const previousValue = prev?.progress ?? 0;
      const delta = entry.progress - previousValue;

      return {
        routeId: entry.routeId,
        routeType: entry.routeType,
        routeName: entry.routeName,
        previous: previousValue,
        current: entry.progress,
        delta,
      };
    })
    .filter((entry) => entry.delta !== 0);
}
