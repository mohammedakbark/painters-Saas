'use server';

import { refresh } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import {
  createBrand,
  createCategory,
  createProduct,
  createShade,
  importCatalogue,
  type ProductBody,
  updateBrand,
  updateCategory,
  updateProduct,
  updateShade,
  uploadProductImage,
} from '@/lib/api/platform-catalogue';
import { ApiError } from '@/lib/api/problem';
import {
  PLATFORM_NO_ACCESS_PATH,
  PLATFORM_SIGN_IN_PATH,
  requirePlatformAdmin,
} from '@/lib/auth/platform-access';
import {
  CATALOGUE_MESSAGES,
  type CatalogueFormState,
  catalogueFieldErrors,
  formValues,
  type ImportFormState,
} from '@/lib/catalogue/form-state';
import { parsePackList } from '@/lib/catalogue/packs';
import {
  checkImageFile,
  type ImageFormState,
  imageMessages,
  imageUploadError,
} from '@/lib/media/image-file';

/*
 * Platform catalogue Server Actions (CAT-001). Every action re-checks platform
 * admin access through requirePlatformAdmin(); bound ids are only requests,
 * the API authorizes each call.
 */

/** Turns an API failure into form state (or a redirect for auth problems). */
function failure(
  error: unknown,
  values?: Record<string, string>,
): CatalogueFormState {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      redirect(PLATFORM_SIGN_IN_PATH);
    }
    if (error.status === 403) {
      redirect(PLATFORM_NO_ACCESS_PATH);
    }
    if (error.code === 'validation_failed') {
      return {
        values,
        fieldErrors: catalogueFieldErrors(error.problem?.errors ?? []),
      };
    }
    if (error.status === 404 && error.code === 'brand_not_found') {
      notFound();
    }
    if (
      error.problem?.detail &&
      (error.status === 409 || error.status === 404)
    ) {
      return { values, error: error.problem.detail };
    }
  }
  return { values, error: CATALOGUE_MESSAGES.unavailable };
}

// --- Brands ------------------------------------------------------------------

export async function createBrandAction(
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const { token } = await requirePlatformAdmin();
  const values = formValues(formData, ['name']);
  let brandId: string;
  try {
    brandId = (await createBrand(token, { name: values.name })).id;
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return {
    saved: `Brand "${String(formData.get('name') ?? '').trim()}" added.`,
    savedLink: {
      href: `/platform/catalogue/brands/${brandId}`,
      label: 'Open brand',
    },
  };
}

export async function updateBrandAction(
  brandId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const { token } = await requirePlatformAdmin();
  const intent = String(formData.get('intent') ?? 'rename');
  const values = formValues(formData, ['brandName']);
  try {
    if (intent === 'archive' || intent === 'restore') {
      await updateBrand(token, brandId, { active: intent === 'restore' });
    } else {
      await updateBrand(token, brandId, { name: values.brandName });
    }
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return {
    saved:
      intent === 'archive'
        ? 'Brand archived. Shops no longer see it.'
        : intent === 'restore'
          ? 'Brand restored.'
          : 'Brand renamed.',
  };
}

// --- Categories --------------------------------------------------------------

export async function createCategoryAction(
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const { token } = await requirePlatformAdmin();
  const values = formValues(formData, ['name', 'sortOrder']);
  const sortOrder =
    values.sortOrder.trim() === '' ? undefined : Number(values.sortOrder);
  if (
    sortOrder !== undefined &&
    !(Number.isInteger(sortOrder) && sortOrder >= 0 && sortOrder <= 999)
  ) {
    return {
      values,
      fieldErrors: { sortOrder: 'Use a whole number from 0 to 999.' },
    };
  }
  try {
    await createCategory(token, { name: values.name, sortOrder });
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return { saved: `Category "${values.name.trim()}" added.` };
}

export async function updateCategoryAction(
  categoryId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const { token } = await requirePlatformAdmin();
  const intent = String(formData.get('intent') ?? 'save');
  // Each category row names its fields after the category (unique ids on the page).
  const values = {
    name: String(formData.get(`name-${categoryId}`) ?? ''),
    sortOrder: String(formData.get(`sortOrder-${categoryId}`) ?? ''),
  };
  try {
    if (intent === 'archive' || intent === 'restore') {
      await updateCategory(token, categoryId, { active: intent === 'restore' });
    } else {
      const sortOrder = Number(values.sortOrder);
      if (!(
        Number.isInteger(sortOrder) &&
        sortOrder >= 0 &&
        sortOrder <= 999
      )) {
        return {
          values,
          fieldErrors: { sortOrder: 'Use a whole number from 0 to 999.' },
        };
      }
      await updateCategory(token, categoryId, { name: values.name, sortOrder });
    }
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return {
    saved:
      intent === 'archive'
        ? 'Category archived.'
        : intent === 'restore'
          ? 'Category restored.'
          : 'Category saved.',
  };
}

// --- Products ----------------------------------------------------------------

const PRODUCT_FIELDS = [
  'name',
  'categoryId',
  'description',
  'packs',
  'supportsShades',
] as const;

function productBody(
  values: Record<string, string>,
): { body: ProductBody } | { fieldErrors: Record<string, string> } {
  const packs = parsePackList(values.packs);
  if (!packs.ok) {
    return { fieldErrors: { packs: packs.message } };
  }
  return {
    body: {
      name: values.name,
      categoryId: values.categoryId,
      description: values.description.trim() === '' ? null : values.description,
      supportsShades: values.supportsShades === 'on',
      packs: packs.packs,
    },
  };
}

export async function createProductAction(
  brandId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const { token } = await requirePlatformAdmin();
  const values = formValues(formData, PRODUCT_FIELDS);
  const parsed = productBody(values);
  if ('fieldErrors' in parsed) {
    return { values, fieldErrors: parsed.fieldErrors };
  }
  let productId: string;
  try {
    productId = (await createProduct(token, brandId, parsed.body)).id;
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return {
    saved: `Product "${String(formData.get('name') ?? '').trim()}" added.`,
    savedLink: {
      href: `/platform/catalogue/products/${productId}`,
      label: 'Open product',
    },
  };
}

export async function updateProductAction(
  productId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const { token } = await requirePlatformAdmin();
  const values = formValues(formData, PRODUCT_FIELDS);
  const parsed = productBody(values);
  if ('fieldErrors' in parsed) {
    return { values, fieldErrors: parsed.fieldErrors };
  }
  try {
    await updateProduct(token, productId, parsed.body);
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return { saved: 'Product saved.' };
}

export async function setProductActiveAction(
  productId: string,
  active: boolean,
): Promise<CatalogueFormState> {
  const { token } = await requirePlatformAdmin();
  try {
    await updateProduct(token, productId, { active });
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {
    saved: active
      ? 'Product restored.'
      : 'Product archived. Shops no longer see it.',
  };
}

export async function uploadProductImageAction(
  productId: string,
  _previous: ImageFormState,
  formData: FormData,
): Promise<ImageFormState> {
  const { token } = await requirePlatformAdmin();
  const value = formData.get('image');
  const file = value instanceof File ? value : null;
  const problem = checkImageFile(file, 'image');
  if (problem || !file) {
    return { error: problem ?? imageMessages('image').required };
  }
  try {
    await uploadProductImage(token, productId, file);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirect(PLATFORM_SIGN_IN_PATH);
      }
      return { error: imageUploadError(error, 'image') };
    }
    return { error: imageUploadError({ status: 0, problem: null }, 'image') };
  }
  refresh();
  return {};
}

// --- Shades ------------------------------------------------------------------

export async function createShadeAction(
  brandId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const { token } = await requirePlatformAdmin();
  const values = formValues(formData, ['code', 'name', 'previewHex']);
  try {
    await createShade(token, brandId, {
      code: values.code,
      name: values.name,
      previewHex:
        values.previewHex.trim() === '' ? null : values.previewHex.trim(),
    });
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return { saved: `Shade ${values.code.trim().toUpperCase()} added.` };
}

export async function setShadeActiveAction(
  shadeId: string,
  active: boolean,
): Promise<CatalogueFormState> {
  const { token } = await requirePlatformAdmin();
  try {
    await updateShade(token, shadeId, { active });
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}

// --- Import ------------------------------------------------------------------

export async function importCatalogueAction(
  brandId: string,
  _previous: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const { token } = await requirePlatformAdmin();
  const kind = formData.get('kind') === 'products' ? 'products' : 'shades';
  const dryRun = formData.get('intent') !== 'import';
  const value = formData.get('file');
  const file = value instanceof File && value.size > 0 ? value : null;
  if (!file) {
    return { error: 'Choose a CSV file.' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'The CSV file must be 2 MB or smaller.' };
  }
  try {
    const result = await importCatalogue(token, brandId, kind, file, dryRun);
    if (result.applied) {
      refresh();
    }
    return { result };
  } catch (error) {
    const state = failure(error);
    return { error: state.error ?? CATALOGUE_MESSAGES.unavailable };
  }
}
