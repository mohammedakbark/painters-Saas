'use server';

import { redirect } from 'next/navigation';
import { SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Ends the session on this device and returns to the shop sign-in. */
export async function signOutOfShop(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect(SHOP_SIGN_IN_PATH);
}
