'use server';

import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/problem';
import { registerShop } from '@/lib/api/shops';
import { SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import { getAccessToken } from '@/lib/auth/session';
import {
  REGISTER_SHOP_MESSAGES,
  type RegisterShopFormState,
  registerFieldErrors,
  registerShopSchema,
} from '@/lib/shops/register';

/** Registers a shop through the API; the caller becomes its master account. */
export async function registerShopAction(
  _previous: RegisterShopFormState,
  formData: FormData,
): Promise<RegisterShopFormState> {
  const values = {
    shopName: String(formData.get('shopName') ?? ''),
    ownerName: String(formData.get('ownerName') ?? ''),
  };
  const parsed = registerShopSchema.safeParse(values);
  if (!parsed.success) {
    return {
      values,
      fieldErrors: registerFieldErrors(
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      ),
    };
  }

  const token = await getAccessToken();
  if (!token) {
    redirect(SHOP_SIGN_IN_PATH);
  }

  let shopId: string;
  try {
    shopId = (await registerShop(token, parsed.data)).id;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(SHOP_SIGN_IN_PATH);
    }
    if (
      error instanceof ApiError &&
      error.code === 'phone_verification_required'
    ) {
      return { values, formError: REGISTER_SHOP_MESSAGES.phoneRequired };
    }
    if (error instanceof ApiError && error.code === 'validation_failed') {
      return {
        values,
        fieldErrors: registerFieldErrors(error.problem?.errors ?? []),
      };
    }
    return { values, formError: REGISTER_SHOP_MESSAGES.unavailable };
  }

  redirect(`/shops/${shopId}?registered=1`);
}
