import { RouteDefinition } from '../types';

export type ArtifactKind =
  | 'archive_summary'
  | 'world_bulletin'
  | 'fragment_log'
  | 'chronicle_outline'
  | 'novel_chapter';

export interface ArtifactDocument {
  id: string;
  userId: string;
  episodeId: string;
  routeId: string;
  kind: ArtifactKind;
  title: string;
  body: string;
  meta: Record<string, unknown>;
  createdAt: number;
}

export interface ArtifactSummary {
  id: string;
  episodeId: string;
  routeId: string;
  kind: ArtifactKind;
  title: string;
  createdAt: number;
}

export interface ArtifactGenerationContext {
  userId: string;
  sessionId: string;
  episodeId: string;
  episodeName: string;
  route: RouteDefinition;
  epilogue: string;
  discoveredClueNames: string[];
  contactedNpcNames: string[];
  worldEventSummaries: string[];
}
