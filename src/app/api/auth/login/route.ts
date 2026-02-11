import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthSession, findUserByUsername } from '@/lib/auth/repo';
import { verifyPassword } from '@/lib/auth/password';
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_MAX_AGE_SEC,
  buildAuthCookieOptions,
  generateAuthToken,
  hashAuthToken,
} from '@/lib/auth/session';

const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入用户名').max(24),
  password: z.string().min(1, '请输入密码').max(72),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '登录参数不合法',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const username = parsed.data.username.trim().toLowerCase();
  const password = parsed.data.password;

  const user = findUserByUsername(username);
  if (!user) {
    return NextResponse.json(
      {
        error: '用户名或密码错误。',
        code: 'INVALID_CREDENTIALS',
      },
      { status: 401 }
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      {
        error: '用户名或密码错误。',
        code: 'INVALID_CREDENTIALS',
      },
      { status: 401 }
    );
  }

  const token = generateAuthToken();
  const tokenHash = hashAuthToken(token);
  const expiresAt = Date.now() + AUTH_SESSION_MAX_AGE_SEC * 1000;
  createAuthSession(user.id, tokenHash, expiresAt);

  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    },
  });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    ...buildAuthCookieOptions(),
  });

  return response;
}
