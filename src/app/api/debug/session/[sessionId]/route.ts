import { NextResponse } from 'next/server';
import { sessionStore } from '@/lib/session/store';

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: '仅开发模式可用' }, { status: 403 });
  }

  const { sessionId } = await context.params;

  const storeWithDebug = sessionStore as typeof sessionStore & {
    getSessionDebug?: (
      id: string
    ) => {
      state: {
        actionHistory: unknown[];
        narrativeLog: unknown[];
      };
      expiresAt: number;
      updatedAt: number;
      ttlMs: number;
    } | null;
  };

  if (!storeWithDebug.getSessionDebug) {
    return NextResponse.json({ error: '当前会话存储不支持调试读取' }, { status: 500 });
  }

  const snapshot = storeWithDebug.getSessionDebug(sessionId);
  if (!snapshot) {
    return NextResponse.json({ error: '会话不存在或已过期' }, { status: 404 });
  }

  return NextResponse.json({
    sessionId,
    expiresAt: snapshot.expiresAt,
    updatedAt: snapshot.updatedAt,
    ttlMs: snapshot.ttlMs,
    state: {
      ...snapshot.state,
      actionHistory: snapshot.state.actionHistory.slice(-12),
      narrativeLog: snapshot.state.narrativeLog.slice(-20),
    },
  });
}
