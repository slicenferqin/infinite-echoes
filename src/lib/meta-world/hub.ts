import { listRecentArtifactSummaries } from '../artifacts/repo';
import { listRecentChronicleSummaries } from '../chronicle/repo';
import { listRecentNovelProjects } from '../novelization/repo';
import { MetaWorldHubPayload } from '../types';
import {
  buildMetaWorldAnomalyDetails,
  buildMetaWorldArchiveDetails,
  buildMetaWorldCognitionDetails,
  buildMetaWorldNpcDetails,
  buildMetaWorldSummary,
  getMetaWorldState,
} from './repo';

export function buildMetaWorldHubPayload(userId: string): MetaWorldHubPayload {
  const metaWorld = getMetaWorldState(userId);

  return {
    summary: buildMetaWorldSummary(metaWorld),
    persistentNpcs: buildMetaWorldNpcDetails(metaWorld),
    anomalies: buildMetaWorldAnomalyDetails(metaWorld),
    cognition: buildMetaWorldCognitionDetails(metaWorld),
    archiveEntries: buildMetaWorldArchiveDetails(metaWorld),
    recentArtifacts: listRecentArtifactSummaries(userId, 12),
    recentChronicles: listRecentChronicleSummaries(userId, 8),
    novelProjects: listRecentNovelProjects(userId, 6).map((project) => ({
      id: project.id,
      chronicleEntryId: project.chronicleEntryId,
      status: project.status,
      targetChapterCount: project.targetChapterCount,
      targetWordsPerChapter: project.targetWordsPerChapter,
      createdAt: project.createdAt,
      previewChapters: project.chapterPlan.slice(0, 4).map((chapter) => ({
        chapter: chapter.chapter,
        title: chapter.title,
        pov: chapter.pov,
      })),
    })),
  };
}
