import { ArtifactDocument } from '../artifacts/types';
import { RouteDefinition } from '../types';
import { ChronicleEntry } from './types';

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function createChronicleEntry(params: {
  userId: string;
  episodeId: string;
  route: RouteDefinition;
  episodeName: string;
  emotionalTheme: string;
  majorChoices: string[];
  peopleRemembered: string[];
  truthsLearned: string[];
  woundsLeft: string[];
  anomaliesWitnessed: string[];
  artifacts: ArtifactDocument[];
}): ChronicleEntry {
  return {
    id: crypto.randomUUID(),
    userId: params.userId,
    episodeId: params.episodeId,
    routeId: params.route.id,
    routeType: params.route.type,
    title: `旅人手记：${params.episodeName} · ${params.route.name}`,
    emotionalTheme: params.emotionalTheme,
    majorChoices: unique(params.majorChoices),
    peopleRemembered: unique(params.peopleRemembered),
    truthsLearned: unique(params.truthsLearned),
    woundsLeft: unique(params.woundsLeft),
    anomaliesWitnessed: unique(params.anomaliesWitnessed),
    artifactIds: params.artifacts.map((item) => item.id),
    createdAt: Date.now(),
  };
}
