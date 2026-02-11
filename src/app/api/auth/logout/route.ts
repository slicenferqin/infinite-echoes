import { NextResponse } from 'next/server';
import { deleteAuthSessionByTokenHash } from '@/lib/auth/repo';
import {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  getCookieValueFromHeader,
  hashAuthToken,
} from '@/lib/auth/session';

export async function POST(request: Request) {
  const token = getCookieValueFromHeader(request.headers.get('cookie'), AUTH_COOKIE_NAME);
  if (token) {
    deleteAuthSessionByTokenHash(hashAuthToken(token));
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    ...buildAuthCookieOptions(0),
  });

  return response;
}
