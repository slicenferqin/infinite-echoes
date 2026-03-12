import { GameState } from '../types';

export type WorldEventType =
  | 'private_confrontation'
  | 'rumor_spread'
  | 'evidence_hidden'
  | 'temporary_alliance'
  | 'cover_up'
  | 'public_pressure_shift'
  | 'request_rejected';

export interface WorldEventEffects {
  npcThreatDeltas?: Record<string, number>;
  npcMoodChanges?: Record<string, string>;
  flagChanges?: string[];
  fragmentSeeds?: string[];
  publicHeatDelta?: number;
  evidenceDecayDelta?: number;
  rumorDeltas?: Record<string, number>;
  locationPressureDeltas?: Record<string, number>;
}

export interface WorldEventLog {
  id: string;
  userId: string;
  sessionId: string;
  episodeId: string;
  day: number;
  slot: number;
  type: WorldEventType;
  participants: string[];
  summary: string;
  publicHint: string;
  effects: WorldEventEffects;
  createdAt: number;
}

export interface WorldEventSimulationResult {
  state: GameState;
  events: WorldEventLog[];
  notifications: string[];
}
