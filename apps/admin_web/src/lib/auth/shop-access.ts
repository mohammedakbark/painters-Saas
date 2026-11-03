import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { getMe, type Me } from '@/lib/api/me';
import { ApiError } from '@/lib/api/problem';
import { getMyShop, type MyShop } from '@/lib/api/shops';
import { getAccessToken } from './session';

export const SHOP_SIGN_IN_PATH = '/sign-in';

/** The signed-in user's token; redirects to the shop sign-in otherwise. */
export async function requireShopSession(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    redirect(SHOP_SIGN_IN_PATH);
  }
  return token;
}

/** The signed-in user (with their shop memberships). Deduplicated per request. */
export const getShopUser = cache(async (): Promise<Me> => {
  const token = await requireShopSession();
  try {
    return await getMe(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(SHOP_SIGN_IN_PATH);
    }
    throw error;
  }
});

/**
 * Call at the top of every /shops/[shopId] layout AND page (Next.js renders a
 * page in parallel with its layout, so a layout check alone is not enough).
 * The API decides membership; a non-member gets the not-found page, which
 * never reveals whether the shop exists.
 */
export const requireShopAccess = cache(
  async (shopId: string): Promise<MyShop> => {
    const token = await requireShopSession();
    try {
      return await getMyShop(token, shopId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        notFound();
      }
      if (error instanceof ApiError && error.status === 401) {
        redirect(SHOP_SIGN_IN_PATH);
      }
      throw error;
    }
  },
);
