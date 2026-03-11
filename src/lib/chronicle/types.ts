import { RouteDefinition } from '../types';

export interface ChronicleEntry {
  id: string;
  userId: string;
  episodeId: string;
  routeId: string;
  routeType: RouteDefinition['type'];
  title: string;
  emotionalTheme: string;
  majorChoices: string[];
  peopleRemembered: string[];
  truthsLearned: string[];
  woundsLeft: string[];
  anomaliesWitnessed: string[];
  artifactIds: string[];
  createdAt: number;
}

export interface ChronicleSummary {
  id: string;
  episodeId: string;
  routeId: string;
  routeType: RouteDefinition['type'];
  title: string;
  createdAt: number;
}
