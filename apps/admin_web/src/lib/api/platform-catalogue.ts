import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';

// Mirrors the CAT-001 schemas in packages/api_contracts/openapi.json.

export const PACK_UNITS = [
  'LITRE',
  'MILLILITRE',
  'KILOGRAM',
  'GRAM',
  'PIECE',
] as const;
export type PackUnit = (typeof PACK_UNITS)[number];

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  active: z.boolean(),
});
export const brandSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  productCount: z.number(),
  shadeCount: z.number(),
});
export const packSchema = z.object({
  id: z.string(),
  quantity: z.number(),
  unit: z.enum(PACK_UNITS),
  label: z.string(),
});
export const productSchema = z.object({
  id: z.string(),
  brand: z.object({ id: z.string(), name: z.string() }),
  category: z.object({ id: z.string(), name: z.string() }),
  name: z.string(),
  description: z.string().nullable(),
  supportsShades: z.boolean(),
  active: z.boolean(),
  image: z
    .object({ url: z.string(), thumbUrl: z.string(), updatedAt: z.string() })
    .nullable(),
  packs: z.array(packSchema),
});
export const shadeSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  code: z.string(),
  name: z.string(),
  previewHex: z.string().nullable(),
  active: z.boolean(),
});
export const page = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });
const importResultSchema = z.object({
  kind: z.enum(['shades', 'products']),
  dryRun: z.boolean(),
  applied: z.boolean(),
  rows: z.number(),
  created: z.number(),
  updated: z.number(),
  unchanged: z.number(),
  errors: z.array(z.object({ row: z.number(), message: z.string() })),
  errorCount: z.number(),
});

export type Category = z.infer<typeof categorySchema>;
export type Brand = z.infer<typeof brandSchema>;
export type CatalogueProduct = z.infer<typeof productSchema>;
export type Shade = z.infer<typeof shadeSchema>;
export type ImportResult = z.infer<typeof importResultSchema>;
export type Page<T> = { items: T[]; nextCursor: string | null };

const base = '/v1/platform/catalogue';
const enc = encodeURIComponent;

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

// --- Categories --------------------------------------------------------------

export async function listCategories(token: string): Promise<Category[]> {
  const result = await apiRequest(`${base}/categories`, {
    token,
    schema: z.object({ items: z.array(categorySchema) }),
  });
  return result.items;
}

export function createCategory(
  token: string,
  body: { name: string; sortOrder?: number },
): Promise<Category> {
  return apiRequest(`${base}/categories`, {
    token,
    schema: categorySchema,
    method: 'POST',
    body,
  });
}

export function updateCategory(
  token: string,
  categoryId: string,
  body: { name?: string; sortOrder?: number; active?: boolean },
): Promise<Category> {
  return apiRequest(`${base}/categories/${enc(categoryId)}`, {
    token,
    schema: categorySchema,
    method: 'PATCH',
    body,
  });
}

// --- Brands ------------------------------------------------------------------

/** A numbered page with its total (PLT-003). */
const numberedPage = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });

export type NumberedPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListStatus = 'active' | 'archived' | 'all';

export function listBrands(
  token: string,
  params: { q?: string; status: ListStatus; page: number; pageSize: number },
): Promise<NumberedPage<Brand>> {
  return apiRequest(
    `${base}/brands${query({
      q: params.q,
      status: params.status,
      page: String(params.page),
      pageSize: String(params.pageSize),
    })}`,
    { token, schema: numberedPage(brandSchema) },
  );
}

export function getBrand(token: string, brandId: string): Promise<Brand> {
  return apiRequest(`${base}/brands/${enc(brandId)}`, {
    token,
    schema: brandSchema,
  });
}

export function createBrand(
  token: string,
  body: { name: string },
): Promise<Brand> {
  return apiRequest(`${base}/brands`, {
    token,
    schema: brandSchema,
    method: 'POST',
    body,
  });
}

export function updateBrand(
  token: string,
  brandId: string,
  body: { name?: string; active?: boolean },
): Promise<Brand> {
  return apiRequest(`${base}/brands/${enc(brandId)}`, {
    token,
    schema: brandSchema,
    method: 'PATCH',
    body,
  });
}

// --- Products ----------------------------------------------------------------

export interface ProductBody {
  name: string;
  categoryId: string;
  description: string | null;
  supportsShades: boolean;
  packs: { quantity: number; unit: PackUnit }[];
  active?: boolean;
}

export function listProducts(
  token: string,
  brandId: string,
  params: {
    q?: string;
    categoryId?: string;
    status: ListStatus;
    page: number;
    pageSize: number;
  },
): Promise<NumberedPage<CatalogueProduct>> {
  return apiRequest(
    `${base}/brands/${enc(brandId)}/products${query({
      q: params.q,
      categoryId: params.categoryId,
      status: params.status,
      page: String(params.page),
      pageSize: String(params.pageSize),
    })}`,
    { token, schema: numberedPage(productSchema) },
  );
}

export function getProduct(
  token: string,
  productId: string,
): Promise<CatalogueProduct> {
  return apiRequest(`${base}/products/${enc(productId)}`, {
    token,
    schema: productSchema,
  });
}

export function createProduct(
  token: string,
  brandId: string,
  body: ProductBody,
): Promise<CatalogueProduct> {
  return apiRequest(`${base}/brands/${enc(brandId)}/products`, {
    token,
    schema: productSchema,
    method: 'POST',
    body,
  });
}

export function updateProduct(
  token: string,
  productId: string,
  body: Partial<ProductBody>,
): Promise<CatalogueProduct> {
  return apiRequest(`${base}/products/${enc(productId)}`, {
    token,
    schema: productSchema,
    method: 'PATCH',
    body,
  });
}

export function uploadProductImage(
  token: string,
  productId: string,
  image: File,
): Promise<CatalogueProduct> {
  const body = new FormData();
  body.append('image', image, image.name || 'image');
  return apiRequest(`${base}/products/${enc(productId)}/image`, {
    token,
    schema: productSchema,
    method: 'PUT',
    body,
  });
}

// --- Shades ------------------------------------------------------------------

export function listShades(
  token: string,
  brandId: string,
  params: { q?: string; cursor?: string },
): Promise<Page<Shade>> {
  return apiRequest(
    `${base}/brands/${enc(brandId)}/shades${query({ ...params, limit: '50' })}`,
    { token, schema: page(shadeSchema) },
  );
}

export function createShade(
  token: string,
  brandId: string,
  body: { code: string; name: string; previewHex: string | null },
): Promise<Shade> {
  return apiRequest(`${base}/brands/${enc(brandId)}/shades`, {
    token,
    schema: shadeSchema,
    method: 'POST',
    body,
  });
}

export function updateShade(
  token: string,
  shadeId: string,
  body: { active?: boolean },
): Promise<Shade> {
  return apiRequest(`${base}/shades/${enc(shadeId)}`, {
    token,
    schema: shadeSchema,
    method: 'PATCH',
    body,
  });
}

// --- Import ------------------------------------------------------------------

export function importCatalogue(
  token: string,
  brandId: string,
  kind: 'shades' | 'products',
  file: File,
  dryRun: boolean,
): Promise<ImportResult> {
  const body = new FormData();
  body.append('file', file, file.name || `${kind}.csv`);
  return apiRequest(
    `${base}/brands/${enc(brandId)}/imports/${kind}?dryRun=${dryRun}`,
    { token, schema: importResultSchema, method: 'POST', body },
  );
}
