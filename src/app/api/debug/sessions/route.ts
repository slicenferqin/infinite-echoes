import { NextResponse } from 'next/server';
import { sessionStore } from '@/lib/session/store';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: '仅开发模式可用' }, { status: 403 });
  }

  return NextResponse.json({
    sessions: sessionStore.listSessionIds(),
  });
}
