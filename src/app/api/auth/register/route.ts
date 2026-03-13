import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUser, createAuthSession, findUserByUsername } from '@/lib/auth/repo';
import { hashPassword } from '@/lib/auth/password';
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_MAX_AGE_SEC,
  buildAuthCookieOptions,
  generateAuthToken,
  hashAuthToken,
} from '@/lib/auth/session';
import { ensureUserProgress } from '@/lib/progress/repo';

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, '用户名至少 2 个字符')
    .max(24, '用户名最多 24 个字符')
    .regex(/^[\p{L}\p{N}_-]+$/u, '用户名仅支持字母、数字、下划线和中划线'),
  password: z
    .string()
    .min(8, '密码至少 8 位')
    .max(72, '密码过长，请控制在 72 位以内'),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '注册参数不合法',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const username = parsed.data.username.trim().toLowerCase();
  const password = parsed.data.password;

  const exists = findUserByUsername(username);
  if (exists) {
    return NextResponse.json(
      {
        error: '用户名已存在，请换一个。',
        code: 'USERNAME_EXISTS',
      },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = createUser(username, passwordHash);
  ensureUserProgress(user.id);

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
