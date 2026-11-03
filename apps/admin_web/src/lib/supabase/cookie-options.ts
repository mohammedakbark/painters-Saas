/**
 * Session cookies are HTTP-only: no browser code needs them (sign-in runs in
 * Server Actions and the API is called from the server), so script access is
 * denied to limit the damage of any XSS. `secure` is on in production; local
 * development runs on plain http://localhost.
 */
export const AUTH_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
} as const;
