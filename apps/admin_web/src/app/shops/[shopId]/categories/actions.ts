'use server';

import { refresh } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/problem';
import {
  createShopCategory,
  updateShopCategory,
} from '@/lib/api/shop-categories';
import { requireShopSession, SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import {
  CATALOGUE_MESSAGES,
  type CatalogueFormState,
  catalogueFieldErrors,
  formValues,
} from '@/lib/catalogue/form-state';

/*
 * Shop categories (CAT-007). The shop and category ids are only requests: the
 * API checks membership, the owner role, and that the category is this
 * shop's own.
 */

function failure(
  error: unknown,
  values: Record<string, string>,
): CatalogueFormState {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      redirect(SHOP_SIGN_IN_PATH);
    }
    if (error.code === 'shop_not_found') {
      notFound();
    }
    if (error.code === 'shop_permission_denied') {
      return { values, error: 'Only the shop owner can change categories.' };
    }
    const errors = error.problem?.errors ?? [];
    if (errors.length > 0) {
      return { values, fieldErrors: catalogueFieldErrors(errors) };
    }
    if (error.problem?.detail && [400, 404, 409].includes(error.status)) {
      return { values, error: error.problem.detail };
    }
  }
  return { values, error: CATALOGUE_MESSAGES.unavailable };
}

function checkName(name: string): string | null {
  const length = name.trim().length;
  if (length < 2) {
    return 'Enter the category name (at least 2 characters).';
  }
  return length > 60 ? 'Keep the category name to 60 characters.' : null;
}

export async function createShopCategoryAction(
  shopId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, ['name']);
  const invalid = checkName(values.name);
  if (invalid) {
    return { values, fieldErrors: { name: invalid } };
  }
  try {
    const created = await createShopCategory(
      await requireShopSession(),
      shopId,
      values.name.trim(),
    );
    refresh();
    return { saved: `Category "${created.name}" added.` };
  } catch (error) {
    return failure(error, values);
  }
}

/** Save the name, or archive / restore (`intent`). */
export async function updateShopCategoryAction(
  shopId: string,
  categoryId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, ['name', 'intent']);
  const intent = values.intent;
  let body: { name?: string; active?: boolean };
  if (intent === 'archive' || intent === 'restore') {
    body = { active: intent === 'restore' };
  } else {
    const invalid = checkName(values.name);
    if (invalid) {
      return { values, fieldErrors: { name: invalid } };
    }
    body = { name: values.name.trim() };
  }
  try {
    const updated = await updateShopCategory(
      await requireShopSession(),
      shopId,
      categoryId,
      body,
    );
    refresh();
    return {
      saved:
        intent === 'archive'
          ? `Category "${updated.name}" archived.`
          : intent === 'restore'
            ? `Category "${updated.name}" restored.`
            : `Category "${updated.name}" saved.`,
    };
  } catch (error) {
    return failure(error, values);
  }
}
