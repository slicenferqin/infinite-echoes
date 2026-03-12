import { NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import { buildMetaWorldHubPayload } from '@/lib/meta-world/hub';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  return NextResponse.json(buildMetaWorldHubPayload(auth.user.id));
}
