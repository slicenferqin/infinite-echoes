import { NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import {
  buildMetaWorldAnomalyDetails,
  buildMetaWorldArchiveDetails,
  buildMetaWorldCognitionDetails,
  buildMetaWorldNpcDetails,
  buildMetaWorldSummary,
  getMetaWorldState,
} from '@/lib/meta-world/repo';
import { listRecentArtifactSummaries } from '@/lib/artifacts/repo';
import { listRecentChronicleSummaries } from '@/lib/chronicle/repo';
import { listRecentNovelProjects } from '@/lib/novelization/repo';
import { MetaWorldHubPayload } from '@/lib/types';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const metaWorld = getMetaWorldState(auth.user.id);
  const payload: MetaWorldHubPayload = {
    summary: buildMetaWorldSummary(metaWorld),
    persistentNpcs: buildMetaWorldNpcDetails(metaWorld),
    anomalies: buildMetaWorldAnomalyDetails(metaWorld),
    cognition: buildMetaWorldCognitionDetails(metaWorld),
    archiveEntries: buildMetaWorldArchiveDetails(metaWorld),
    recentArtifacts: listRecentArtifactSummaries(auth.user.id, 12),
    recentChronicles: listRecentChronicleSummaries(auth.user.id, 8),
    novelProjects: listRecentNovelProjects(auth.user.id, 6).map((project) => ({
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

  return NextResponse.json(payload);
}
