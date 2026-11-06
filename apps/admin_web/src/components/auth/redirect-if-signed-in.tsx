import { redirect } from 'next/navigation';
import { getAccessToken } from '@/lib/auth/session';

/**
 * Sends a visitor who already has a session on to `to`. Render it inside
 * <Suspense> so the page itself stays static. A convenience only: the shop
 * area authorizes every request itself.
 */
export async function RedirectIfSignedIn({ to }: { to: string }) {
  if (await getAccessToken()) redirect(to);
  return null;
}
