'use server';

import { refresh } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/problem';
import {
  addFavouriteShade,
  addShopPack,
  addShopProduct,
  createOwnShade,
  removeFavouriteShade,
  removeOwnShade,
  removeShopPack,
  updateShopPack,
  updateShopProduct,
  uploadShopProductImage,
} from '@/lib/api/shop-catalogue';
import { requireShopSession, SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import { parsePackSize, notAPackSize } from '@/lib/catalogue/packs';
import {
  CATALOGUE_MESSAGES,
  type CatalogueFormState,
  catalogueFieldErrors,
} from '@/lib/catalogue/form-state';
import {
  checkImageFile,
  type ImageFormState,
  imageMessages,
  imageUploadError,
} from '@/lib/media/image-file';
import {
  allValues,
  type FieldErrors,
  packFields,
  parseCatalogueListing,
  parseOwnPackRows,
  parsePackPrice,
  parseQuickAdd,
  type QuickAddProduct,
} from '@/lib/shop-catalogue/forms';

/*
 * Shop catalogue Server Actions (CAT-002). The shop id and record ids bound by
 * the pages are only requests: the API checks the caller's membership and role
 * and scopes every record to that shop.
 */

const NOT_ALLOWED = 'Only the shop owner can change the catalogue.';

const productPath = (shopId: string, productId: string) =>
  `/shops/${encodeURIComponent(shopId)}/catalogue/products/${encodeURIComponent(productId)}`;

/** API failure → form state; auth problems redirect, unknown shops 404. */
function failure(
  error: unknown,
  values?: Record<string, string>,
  fieldNames: Record<string, string> = {},
): CatalogueFormState {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      redirect(SHOP_SIGN_IN_PATH);
    }
    if (error.code === 'shop_not_found') {
      notFound();
    }
    if (error.code === 'shop_permission_denied') {
      return { values, error: NOT_ALLOWED };
    }
    const errors = error.problem?.errors ?? [];
    if (errors.length > 0) {
      const mapped = catalogueFieldErrors(errors);
      const fieldErrors: FieldErrors = {};
      for (const [path, message] of Object.entries(mapped)) {
        fieldErrors[fieldNames[path] ?? path] = message;
      }
      return { values, fieldErrors };
    }
    if (error.problem?.detail && [400, 404, 409].includes(error.status)) {
      return { values, error: error.problem.detail };
    }
  }
  return { values, error: CATALOGUE_MESSAGES.unavailable };
}

// --- Products ----------------------------------------------------------------

export async function addCatalogueProductAction(
  shopId: string,
  catalogueProductId: string,
  cataloguePackIds: string[],
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = allValues(formData);
  const parsed = parseCatalogueListing(values, cataloguePackIds);
  if (!parsed.ok) {
    return { values, fieldErrors: parsed.fieldErrors };
  }
  const token = await requireShopSession();
  let productId: string;
  try {
    productId = (
      await addShopProduct(token, shopId, {
        source: 'catalogue',
        catalogueProductId,
        packs: parsed.body,
      })
    ).id;
  } catch (error) {
    return failure(error, values, { packs: 'form' });
  }
  redirect(`${productPath(shopId, productId)}?added=1`);
}

/**
 * Quick add (CAT-004): every product on the page that has a price entered,
 * in one submit. Nothing is added while any field is invalid; then products
 * are added one by one, and any the API refuses are named.
 */
export async function addCatalogueProductsAction(
  shopId: string,
  products: QuickAddProduct[],
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = allValues(formData);
  const parsed = parseQuickAdd(values, products);
  if (!parsed.ok) {
    return { values, fieldErrors: parsed.fieldErrors };
  }
  const token = await requireShopSession();
  const failed: string[] = [];
  let added = 0;
  for (const listing of parsed.body) {
    try {
      await addShopProduct(token, shopId, {
        source: 'catalogue',
        catalogueProductId: listing.catalogueProductId,
        packs: listing.packs,
      });
      added += 1;
    } catch (error) {
      const state = failure(error, values);
      if (state.error === NOT_ALLOWED) {
        return state;
      }
      failed.push(listing.name);
    }
  }
  if (failed.length > 0) {
    refresh();
    return {
      values,
      error: `${added > 0 ? `${added} added. ` : ''}Not added: ${failed.join(', ')}. Check their prices and try again.`,
    };
  }
  redirect(`/shops/${encodeURIComponent(shopId)}/catalogue?added=${added}`);
}

/** Reads the details fields of an own product (add and edit forms). */
function ownDetails(values: Record<string, string>) {
  const brandId = values.brandId?.trim() || null;
  const brandName = values.brandName?.trim() || null;
  return {
    name: values.name ?? '',
    categoryId: values.categoryId ?? '',
    brandId,
    brandName,
    description: values.description?.trim() || null,
    supportsShades: values.supportsShades === 'on',
  };
}

function checkOwnDetails(details: ReturnType<typeof ownDetails>): FieldErrors {
  const errors: FieldErrors = {};
  if (details.name.trim().length < 2) {
    errors.name = 'Enter the product name (at least 2 characters).';
  }
  if (details.categoryId === '') {
    errors.categoryId = 'Choose the category.';
  }
  if (details.brandId && details.brandName) {
    errors.brandName =
      'Choose a brand from the list or type a brand name, not both.';
  }
  return errors;
}

export async function addOwnProductAction(
  shopId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = allValues(formData);
  const details = ownDetails(values);
  const packs = parseOwnPackRows(values);
  const fieldErrors = {
    ...checkOwnDetails(details),
    ...(packs.ok ? {} : packs.fieldErrors),
  };
  if (!packs.ok || Object.keys(fieldErrors).length > 0) {
    return { values, fieldErrors };
  }
  const token = await requireShopSession();
  let productId: string;
  try {
    productId = (
      await addShopProduct(token, shopId, {
        source: 'own',
        ...details,
        packs: packs.body,
      })
    ).id;
  } catch (error) {
    return failure(error, values, { packs: 'form' });
  }
  redirect(`${productPath(shopId, productId)}?added=1`);
}

export async function updateOwnProductAction(
  shopId: string,
  productId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = allValues(formData);
  const details = ownDetails(values);
  const fieldErrors = checkOwnDetails(details);
  if (Object.keys(fieldErrors).length > 0) {
    return { values, fieldErrors };
  }
  const token = await requireShopSession();
  try {
    await updateShopProduct(token, shopId, productId, details);
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return { saved: 'Product saved.' };
}

export async function setShopProductStatusAction(
  shopId: string,
  productId: string,
  status: 'ACTIVE' | 'ARCHIVED',
): Promise<CatalogueFormState> {
  const token = await requireShopSession();
  try {
    await updateShopProduct(token, shopId, productId, { status });
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {
    saved:
      status === 'ARCHIVED'
        ? 'Product archived. Customers will not see it.'
        : 'Product restored.',
  };
}

export async function uploadShopProductImageAction(
  shopId: string,
  productId: string,
  _previous: ImageFormState,
  formData: FormData,
): Promise<ImageFormState> {
  const value = formData.get('image');
  const file = value instanceof File ? value : null;
  const problem = checkImageFile(file, 'image');
  if (problem || !file) {
    return { error: problem ?? imageMessages('image').required };
  }
  const token = await requireShopSession();
  try {
    await uploadShopProductImage(token, shopId, productId, file);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirect(SHOP_SIGN_IN_PATH);
      }
      if (error.code === 'shop_not_found') {
        notFound();
      }
      if (error.code === 'shop_permission_denied') {
        return { error: NOT_ALLOWED };
      }
      return { error: imageUploadError(error, 'image') };
    }
    return { error: imageUploadError({ status: 0, problem: null }, 'image') };
  }
  refresh();
  return {};
}

// --- Pack sizes --------------------------------------------------------------

export async function updatePackAction(
  shopId: string,
  productId: string,
  packId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = allValues(formData);
  const errors: FieldErrors = {};
  const price = parsePackPrice(values, packId, errors);
  if (!price) {
    return { values, fieldErrors: errors };
  }
  const token = await requireShopSession();
  const fields = packFields(packId);
  try {
    await updateShopPack(token, shopId, productId, packId, price);
  } catch (error) {
    return failure(error, values, {
      pricePaise: fields.price,
      mrpPaise: fields.mrp,
    });
  }
  refresh();
  return { saved: 'Saved.' };
}

/** The quick availability switch of one pack size. */
export async function setPackAvailableAction(
  shopId: string,
  productId: string,
  packId: string,
  available: boolean,
): Promise<CatalogueFormState> {
  const token = await requireShopSession();
  try {
    await updateShopPack(token, shopId, productId, packId, { available });
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}

export async function removePackAction(
  shopId: string,
  productId: string,
  packId: string,
): Promise<CatalogueFormState> {
  const token = await requireShopSession();
  try {
    await removeShopPack(token, shopId, productId, packId);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}

export async function addPackAction(
  shopId: string,
  productId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = allValues(formData);
  const errors: FieldErrors = {};
  const fields = packFields('new');
  const cataloguePackId = values.cataloguePackId?.trim() ?? '';
  const sizeText = values[fields.size]?.trim() ?? '';
  const ownSize = 'cataloguePackId' in values ? null : parsePackSize(sizeText);
  if ('cataloguePackId' in values) {
    if (cataloguePackId === '') {
      errors.cataloguePackId = 'Choose the pack size.';
    }
  } else if (!ownSize) {
    errors[fields.size] =
      sizeText === ''
        ? 'Enter the pack size, for example 4 L.'
        : notAPackSize(sizeText);
  }
  const price = parsePackPrice(values, 'new', errors);
  if (!price || Object.keys(errors).length > 0) {
    return { values, fieldErrors: errors };
  }
  const token = await requireShopSession();
  try {
    await addShopPack(
      token,
      shopId,
      productId,
      ownSize ? { ...ownSize, ...price } : { cataloguePackId, ...price },
    );
  } catch (error) {
    return failure(error, values, {
      pricePaise: fields.price,
      mrpPaise: fields.mrp,
      quantity: fields.size,
    });
  }
  refresh();
  return { saved: 'Pack size added.' };
}

// --- Shades ------------------------------------------------------------------

export async function setFavouriteShadeAction(
  shopId: string,
  shadeId: string,
  favourite: boolean,
): Promise<CatalogueFormState> {
  const token = await requireShopSession();
  try {
    if (favourite) {
      await addFavouriteShade(token, shopId, shadeId);
    } else {
      await removeFavouriteShade(token, shopId, shadeId);
    }
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}

export async function createOwnShadeAction(
  shopId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = allValues(formData);
  const token = await requireShopSession();
  try {
    await createOwnShade(token, shopId, {
      code: values.code ?? '',
      name: values.name ?? '',
      previewHex: values.previewHex?.trim() || null,
      brandId: values.brandId?.trim() || null,
    });
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return { saved: `Shade ${(values.code ?? '').trim().toUpperCase()} added.` };
}

export async function removeOwnShadeAction(
  shopId: string,
  shadeId: string,
): Promise<CatalogueFormState> {
  const token = await requireShopSession();
  try {
    await removeOwnShade(token, shopId, shadeId);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}
