import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { serverEnv } from '@/lib/env';
import { AUTH_COOKIE_OPTIONS } from './cookie-options';

/**
 * Supabase client for Server Components and Server Actions. The session lives
 * in HTTP-only cookies. Create one per request; never share it.
 *
 * Supabase is used only to sign in and out. All data comes from the API.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = serverEnv();
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy (src/proxy.ts) refreshes and writes the session instead.
        }
      },
    },
  });
}
