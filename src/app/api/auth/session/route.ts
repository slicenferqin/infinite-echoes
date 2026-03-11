import { NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import { getUserProgress } from '@/lib/progress/repo';
import { sessionStore } from '@/lib/session/store';
import { buildMetaWorldSummary, getMetaWorldState } from '@/lib/meta-world/repo';
import { listRecentArtifactSummaries } from '@/lib/artifacts/repo';
import { listRecentChronicleSummaries } from '@/lib/chronicle/repo';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const progress = getUserProgress(auth.user.id);
  const activeSession = sessionStore.getActiveSessionMeta(auth.user.id);
  const metaWorld = buildMetaWorldSummary(getMetaWorldState(auth.user.id));
  const recentArtifacts = listRecentArtifactSummaries(auth.user.id, 4);
  const recentChronicles = listRecentChronicleSummaries(auth.user.id, 3);

  return NextResponse.json({
    user: {
      id: auth.user.id,
      username: auth.user.username,
      createdAt: auth.user.createdAt,
    },
    progress,
    activeSession,
    metaWorld,
    recentArtifacts,
    recentChronicles,
  });
}
