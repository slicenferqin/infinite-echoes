export type NpcMemoryKind =
  | 'dialogue'
  | 'event'
  | 'relationship'
  | 'institution'
  | 'trauma';

export type NpcMemoryVisibility = 'public' | 'private' | 'secret';

export interface NpcMemoryEntry {
  id: string;
  ownerNpcId: string;
  kind: NpcMemoryKind;
  aboutNpcId?: string;
  aboutPlayer?: boolean;
  episodeId: string;
  locationId?: string;
  summary: string;
  emotionTag: string;
  topicTags: string[];
  weight: number;
  confidence: number;
  visibility: NpcMemoryVisibility;
  createdAt: number;
  lastRecalledAt?: number;
}

export interface NpcMemoryState {
  ownerNpcId: string;
  entries: NpcMemoryEntry[];
  summary: string;
  lastUpdatedAt: number;
}

export interface AppendNpcMemoryEntryInput {
  kind: NpcMemoryKind;
  aboutNpcId?: string;
  aboutPlayer?: boolean;
  episodeId: string;
  locationId?: string;
  summary: string;
  emotionTag: string;
  topicTags?: string[];
  weight?: number;
  confidence?: number;
  visibility?: NpcMemoryVisibility;
}

export interface NpcMemorySelectionInput {
  playerInput: string;
  currentLocation?: string;
  presentedClueId?: string;
  limit?: number;
}

export interface NpcMemorySelectionResult {
  entries: NpcMemoryEntry[];
  lines: string[];
}
