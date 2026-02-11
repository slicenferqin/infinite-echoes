import { NextResponse } from 'next/server';
import { listEpisodes, getDefaultEpisodeId } from '@/lib/episodes/registry';
import { filterUnlockedEpisodes } from '@/lib/progression';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import { getUserProgress } from '@/lib/progress/repo';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const allEpisodes = listEpisodes();
  const progress = getUserProgress(auth.user.id);
  const visibleEpisodes = filterUnlockedEpisodes(allEpisodes, progress);

  const defaultEpisodeId = getDefaultEpisodeId();
  const resolvedDefaultEpisodeId = visibleEpisodes.some(
    (episode) => episode.id === defaultEpisodeId
  )
    ? defaultEpisodeId
    : visibleEpisodes[0]?.id ?? defaultEpisodeId;

  return NextResponse.json({
    defaultEpisodeId: resolvedDefaultEpisodeId,
    episodes: visibleEpisodes,
  });
}
