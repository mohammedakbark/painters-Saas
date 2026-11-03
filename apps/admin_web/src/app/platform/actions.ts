'use server';

import { redirect } from 'next/navigation';
import { PLATFORM_SIGN_IN_PATH } from '@/lib/auth/platform-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Ends the session on this device and returns to the sign-in page. */
export async function signOutOfPlatform(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect(PLATFORM_SIGN_IN_PATH);
}
