import { NextResponse } from 'next/server';
import { findAuthSessionByTokenHash, touchAuthSession } from './repo';
import { AUTH_COOKIE_NAME, getCookieValueFromHeader, hashAuthToken } from './session';

export interface AuthContext {
  user: {
    id: string;
    username: string;
    createdAt: number;
    updatedAt: number;
  };
  authSessionId: string;
}

export async function requireAuth(request: Request): Promise<AuthContext | null> {
  const token = getCookieValueFromHeader(request.headers.get('cookie'), AUTH_COOKIE_NAME);
  if (!token) return null;

  const tokenHash = hashAuthToken(token);
  const authSession = findAuthSessionByTokenHash(tokenHash);
  if (!authSession) return null;

  touchAuthSession(authSession.session.id);

  return {
    user: authSession.user,
    authSessionId: authSession.session.id,
  };
}

export function unauthorizedResponse(message = '请先登录后再继续。') {
  return NextResponse.json(
    {
      error: message,
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  );
}
