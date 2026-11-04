'use server';

import { notFound, redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/problem';
import { updateShopProfile } from '@/lib/api/shop-profile';
import { SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import { getAccessToken } from '@/lib/auth/session';
import {
  PROFILE_MESSAGES,
  type ProfileFormState,
  parseProfileForm,
  profileFieldErrors,
  readProfileForm,
} from '@/lib/shops/profile';

/**
 * Saves the shop profile through the API. `shopId` is bound by the page but
 * is only a request: the API checks the caller's membership and role.
 */
export async function saveShopProfileAction(
  shopId: string,
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const values = readProfileForm(formData);
  const parsed = parseProfileForm(values);
  if (!parsed.ok) {
    return { values, fieldErrors: parsed.fieldErrors };
  }

  const token = await getAccessToken();
  if (!token) {
    redirect(SHOP_SIGN_IN_PATH);
  }

  try {
    await updateShopProfile(token, shopId, parsed.body);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirect(SHOP_SIGN_IN_PATH);
      }
      if (error.status === 404) {
        notFound();
      }
      if (error.code === 'shop_permission_denied') {
        return { values, formError: PROFILE_MESSAGES.notAllowed };
      }
      if (error.code === 'validation_failed') {
        return {
          values,
          fieldErrors: profileFieldErrors(error.problem?.errors ?? []),
        };
      }
    }
    return { values, formError: PROFILE_MESSAGES.unavailable };
  }

  redirect(`/shops/${encodeURIComponent(shopId)}/profile?saved=1`);
}
