import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getMe, type Me } from '@/lib/api/me';
import { ApiError } from '@/lib/api/problem';
import { getAccessToken } from './session';

export const PLATFORM_SIGN_IN_PATH = '/platform/sign-in';
export const PLATFORM_NO_ACCESS_PATH = '/platform/no-access';

export type PlatformAccess =
  | { kind: 'admin'; email: string | null; token: string }
  | { kind: 'forbidden'; account: string | null };

/**
 * Data-access-layer check for the platform console. Redirects to sign-in when
 * there is no valid session; otherwise asks the API who the caller is. The API
 * decides; this only chooses what to render.
 */
export const getPlatformAccess = cache(async (): Promise<PlatformAccess> => {
  const token = await getAccessToken();
  if (!token) {
    redirect(PLATFORM_SIGN_IN_PATH);
  }

  let me: Me;
  try {
    me = await getMe(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(PLATFORM_SIGN_IN_PATH);
    }
    throw error;
  }

  return me.platformRole === 'SUPER_ADMIN'
    ? { kind: 'admin', email: me.email, token }
    : { kind: 'forbidden', account: me.email ?? me.phone };
});

/**
 * Call at the top of the console layout AND of every console page. Next.js
 * renders a page in parallel with its layout and sends the page's output even
 * when the layout does not show it, so a layout check alone is not an
 * authorization boundary. Never returns for anyone but a platform admin.
 */
export async function requirePlatformAdmin(): Promise<{
  email: string | null;
  /** The verified admin's access token, for API calls made by the page. */
  token: string;
}> {
  const access = await getPlatformAccess();
  if (access.kind !== 'admin') {
    redirect(PLATFORM_NO_ACCESS_PATH);
  }
  return { email: access.email, token: access.token };
}
