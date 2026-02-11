import { createHash, randomBytes } from 'node:crypto';

export const AUTH_COOKIE_NAME = 'ie_auth_v1';
export const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function generateAuthToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashAuthToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getCookieValueFromHeader(
  cookieHeader: string | null,
  key: string
): string | null {
  if (!cookieHeader) return null;

  const chunks = cookieHeader.split(';');
  for (const chunk of chunks) {
    const [rawName, ...rawValue] = chunk.trim().split('=');
    if (!rawName || rawName !== key) continue;
    return rawValue.join('=');
  }

  return null;
}

export function buildAuthCookieOptions(maxAge = AUTH_SESSION_MAX_AGE_SEC): {
  httpOnly: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
  secure: boolean;
} {
  const secureOverride = process.env.AUTH_COOKIE_SECURE;
  const secure =
    secureOverride === 'true'
      ? true
      : secureOverride === 'false'
        ? false
        : process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
    secure,
  };
}
