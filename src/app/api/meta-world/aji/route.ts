import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import { callLlmWithMeta, LlmError } from '@/lib/llm';
import { buildAjiFallbackReply, buildAjiSystemPrompt } from '@/lib/meta-world/aji';
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

const requestSchema = z.object({
  message: z.string().trim().min(1).max(800),
});

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const payload = requestSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: '问题格式不合法。' },
      { status: 400 }
    );
  }

  const metaWorld = getMetaWorldState(auth.user.id);
  const hub: MetaWorldHubPayload = {
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

  try {
    const completion = await callLlmWithMeta(
      buildAjiSystemPrompt({
        username: auth.user.username,
        hub,
      }),
      [{ role: 'user', content: payload.data.message }],
      { temperature: 0.5, maxTokens: 260 }
    );

    return NextResponse.json({
      reply: completion.text.trim(),
    });
  } catch (error) {
    if (error instanceof LlmError) {
      return NextResponse.json({
        reply: buildAjiFallbackReply(payload.data.message),
      });
    }

    throw error;
  }
}
