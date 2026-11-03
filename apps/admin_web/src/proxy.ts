import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_OPTIONS } from '@/lib/supabase/cookie-options';

/**
 * Runs before every page request:
 * 1. Refreshes the Supabase session cookies when the access token is close to
 *    expiry, so Server Components always see a usable token.
 * 2. Optimistically redirects signed-out visitors away from the platform
 *    console. This is a convenience only: every page and the API still
 *    authorize each request themselves.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    // Misconfiguration surfaces as an error from the page (lib/env.ts).
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Responses that set auth cookies must never be cached.
        for (const [header, value] of Object.entries(headers)) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Verifies the token signature (JWKS) and refreshes the session if needed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  if (!signedIn && isPlatformConsolePath(pathname)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/platform/sign-in';
    signIn.search = '';
    return NextResponse.redirect(signIn);
  }
  return response;
}

function isPlatformConsolePath(pathname: string): boolean {
  return (
    (pathname === '/platform' || pathname.startsWith('/platform/')) &&
    pathname !== '/platform/sign-in'
  );
}

export const config = {
  // Pages only: skip Next internals and static files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
