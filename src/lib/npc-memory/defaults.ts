import { NpcMemoryState } from './types';

export const MAX_NPC_MEMORY_ENTRIES = 24;

export function createDefaultNpcMemoryState(ownerNpcId: string): NpcMemoryState {
  return {
    ownerNpcId,
    entries: [],
    summary: '',
    lastUpdatedAt: Date.now(),
  };
}
