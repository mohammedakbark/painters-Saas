import 'server-only';
import { connection } from 'next/server';
import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * The signed-in user's access token, or null. Deduplicated per request.
 * The token is only forwarded to the API, which verifies it; the web app does
 * not make authorization decisions from the cookie contents.
 */
export const getAccessToken = cache(async (): Promise<string | null> => {
  // Session reads are request-time work: Supabase checks token expiry against
  // the clock, which must never be captured in a prerender.
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});
