import type { Response } from 'express';

export const AuthAccessTokenCookieName = 'gr8booksneo.accessToken';

const AuthCookieMaxAgeMs = 1000 * 60 * 60 * 24 * 30;

function shouldUseSecureCookie() {
  return (
    process.env.AUTH_COOKIE_SECURE?.toLowerCase() === 'true' ||
    process.env.NODE_ENV === 'production'
  );
}

function getCookieDomain() {
  return process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;
}

export function setAuthAccessTokenCookie(
  response: Response,
  accessToken: string,
  rememberMe = false,
) {
  response.cookie(AuthAccessTokenCookieName, accessToken, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'lax',
    path: '/',
    domain: getCookieDomain(),
    ...(rememberMe ? { maxAge: AuthCookieMaxAgeMs } : {}),
  });
}

export function clearAuthAccessTokenCookie(response: Response) {
  response.clearCookie(AuthAccessTokenCookieName, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'lax',
    path: '/',
    domain: getCookieDomain(),
  });
}

export function readCookieValue(
  cookieHeader: string | undefined,
  name: string,
) {
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}
