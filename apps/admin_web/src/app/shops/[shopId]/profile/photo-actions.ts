'use server';

import { notFound, redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/problem';
import { uploadShopPhoto } from '@/lib/api/shop-profile';
import { SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import { getAccessToken } from '@/lib/auth/session';
import {
  checkImageFile,
  type ImageFormState,
  imageMessages,
  imageUploadError,
} from '@/lib/media/image-file';

const MESSAGES = imageMessages('photo');

/**
 * Forwards the chosen photo to the API, which validates and re-encodes it.
 * `shopId` is bound by the page but is only a request: the API checks the
 * caller's membership and role.
 */
export async function uploadShopPhotoAction(
  shopId: string,
  _previous: ImageFormState,
  formData: FormData,
): Promise<ImageFormState> {
  const value = formData.get('photo');
  const file = value instanceof File ? value : null;
  const problem = checkImageFile(file, 'photo');
  if (problem || !file) {
    return { error: problem ?? MESSAGES.required };
  }

  const token = await getAccessToken();
  if (!token) {
    redirect(SHOP_SIGN_IN_PATH);
  }

  try {
    await uploadShopPhoto(token, shopId, file);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirect(SHOP_SIGN_IN_PATH);
      }
      if (error.status === 404) {
        notFound();
      }
      if (error.code === 'shop_permission_denied') {
        return { error: 'Only the shop owner can change the photo.' };
      }
      return { error: imageUploadError(error, 'photo') };
    }
    return { error: MESSAGES.unavailable };
  }

  redirect(`/shops/${encodeURIComponent(shopId)}/profile?photo=1`);
}
