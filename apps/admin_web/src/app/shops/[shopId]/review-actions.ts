'use server';

import { refresh } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/problem';
import { submitShopForReview, withdrawShopReview } from '@/lib/api/shop-review';
import { requireShopSession, SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import {
  CATALOGUE_MESSAGES,
  type CatalogueFormState,
} from '@/lib/catalogue/form-state';

/*
 * Shop review Server Actions (PLT-002). The bound shop id is only a request:
 * the API checks membership, the owner role and the shop's status.
 */

function failure(error: unknown): CatalogueFormState {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      redirect(SHOP_SIGN_IN_PATH);
    }
    if (error.code === 'shop_not_found') {
      notFound();
    }
    if (error.code === 'shop_permission_denied') {
      return { error: 'Only the shop owner can do this.' };
    }
    if (error.status === 409 && error.problem?.detail) {
      return { error: error.problem.detail };
    }
  }
  return { error: CATALOGUE_MESSAGES.unavailable };
}

export async function submitForReviewAction(
  shopId: string,
): Promise<CatalogueFormState> {
  const token = await requireShopSession();
  try {
    await submitShopForReview(token, shopId);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}

export async function withdrawReviewAction(
  shopId: string,
): Promise<CatalogueFormState> {
  const token = await requireShopSession();
  try {
    await withdrawShopReview(token, shopId);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}
