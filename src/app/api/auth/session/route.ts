import { NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import { getUserProgress } from '@/lib/progress/repo';
import { sessionStore } from '@/lib/session/store';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const progress = getUserProgress(auth.user.id);
  const activeSession = sessionStore.getActiveSessionMeta(auth.user.id);

  return NextResponse.json({
    user: {
      id: auth.user.id,
      username: auth.user.username,
      createdAt: auth.user.createdAt,
    },
    progress,
    activeSession,
  });
}
