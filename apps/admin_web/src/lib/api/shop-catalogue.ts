import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';
import {
  brandSchema,
  categorySchema,
  PACK_UNITS,
  type Page,
  packSchema,
  page,
  productSchema,
  shadeSchema,
} from './platform-catalogue';

// Mirrors the CAT-002 schemas in packages/api_contracts/openapi.json, plus the
// read-only brand catalogue (/v1/catalogue) that shops choose from.

const shopPackSchema = z.object({
  id: z.string(),
  cataloguePackId: z.string().nullable(),
  quantity: z.number(),
  unit: z.enum(PACK_UNITS),
  label: z.string(),
  mrpPaise: z.number().nullable(),
  pricePaise: z.number(),
  available: z.boolean(),
});

export const shopProductSchema = z.object({
  id: z.string(),
  source: z.enum(['catalogue', 'own']),
  catalogueProductId: z.string().nullable(),
  name: z.string(),
  brand: z.object({ id: z.string().nullable(), name: z.string() }).nullable(),
  category: z.object({ id: z.string(), name: z.string() }),
  description: z.string().nullable(),
  supportsShades: z.boolean(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  catalogueActive: z.boolean(),
  image: z
    .object({ url: z.string(), thumbUrl: z.string(), updatedAt: z.string() })
    .nullable(),
  imageSource: z.enum(['shop', 'catalogue']).nullable(),
  packs: z.array(shopPackSchema),
  unlistedCataloguePacks: z.array(packSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const shopShadeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  previewHex: z.string().nullable(),
  brand: z.object({ id: z.string(), name: z.string() }).nullable(),
});

const favouriteSchema = z.object({
  shade: shadeSchema,
  brand: z.object({ id: z.string(), name: z.string() }),
  addedAt: z.string(),
});

export type ShopPack = z.infer<typeof shopPackSchema>;
export type ShopProduct = z.infer<typeof shopProductSchema>;
export type ShopShade = z.infer<typeof shopShadeSchema>;
export type FavouriteShade = z.infer<typeof favouriteSchema>;
export type CatalogueBrand = z.infer<typeof brandSchema>;
export type CatalogueCategory = z.infer<typeof categorySchema>;
export type CatalogueProductView = z.infer<typeof productSchema>;
export type BrandProductItem = {
  product: CatalogueProductView;
  listedProductId: string | null;
};
export type BrandShadeItem = {
  shade: z.infer<typeof shadeSchema>;
  favourite: boolean;
};

export interface PackPriceBody {
  mrpPaise: number | null;
  pricePaise: number;
  available: boolean;
}

export type AddShopProductBody =
  | {
      source: 'catalogue';
      catalogueProductId: string;
      packs: (PackPriceBody & { cataloguePackId: string })[];
    }
  | {
      source: 'own';
      name: string;
      categoryId: string;
      brandId: string | null;
      brandName: string | null;
      description: string | null;
      supportsShades: boolean;
      packs: (PackPriceBody & {
        quantity: number;
        unit: (typeof PACK_UNITS)[number];
      })[];
    };

export interface UpdateShopProductBody {
  status?: 'ACTIVE' | 'ARCHIVED';
  name?: string;
  categoryId?: string;
  brandId?: string | null;
  brandName?: string | null;
  description?: string | null;
  supportsShades?: boolean;
}

const enc = encodeURIComponent;
const base = (shopId: string) => `/v1/shops/${enc(shopId)}/catalogue`;

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

// --- Brand catalogue (read only) --------------------------------------------

export async function listCatalogueCategories(
  token: string,
): Promise<CatalogueCategory[]> {
  const result = await apiRequest('/v1/catalogue/categories', {
    token,
    schema: z.object({ items: z.array(categorySchema) }),
  });
  return result.items;
}

/** Brand pages read for a select: 50 per page (the API's maximum), 10 pages. */
const BRAND_PAGES = 10;

/** Active brands by name, for brand selects (follows the cursor). */
export async function listCatalogueBrands(
  token: string,
): Promise<CatalogueBrand[]> {
  const brands: CatalogueBrand[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < BRAND_PAGES; i += 1) {
    const result = await apiRequest(
      `/v1/catalogue/brands${query({ limit: '50', cursor })}`,
      { token, schema: page(brandSchema) },
    );
    brands.push(...result.items);
    if (!result.nextCursor) {
      break;
    }
    cursor = result.nextCursor;
  }
  return brands;
}

export function getCatalogueProduct(
  token: string,
  productId: string,
): Promise<CatalogueProductView> {
  return apiRequest(`/v1/catalogue/products/${enc(productId)}`, {
    token,
    schema: productSchema,
  });
}

// --- Shop products -----------------------------------------------------------

export function listShopProducts(
  token: string,
  shopId: string,
  params: {
    q?: string;
    status?: 'ACTIVE' | 'ARCHIVED';
    catalogueProductId?: string;
    cursor?: string;
    limit?: number;
  } = {},
): Promise<Page<ShopProduct>> {
  return apiRequest(
    `${base(shopId)}/products${query({
      q: params.q,
      status: params.status,
      catalogueProductId: params.catalogueProductId,
      cursor: params.cursor,
      limit: params.limit ? String(params.limit) : undefined,
    })}`,
    { token, schema: page(shopProductSchema) },
  );
}

// --- Pack rows (CAT-003): the catalogue table ---------------------------------

export const PACK_TABS = ['ALL', 'VOLUME', 'WEIGHT', 'PIECE'] as const;
export type PackTab = (typeof PACK_TABS)[number];
export const PACK_ROW_SORTS = ['name', '-name', 'price', '-price'] as const;
export type PackRowSort = (typeof PACK_ROW_SORTS)[number];
export const PACK_ROW_PAGE_SIZES = [10, 25, 50] as const;

const optionSchema = z.object({ value: z.string(), label: z.string() });

const packRowPageSchema = z.object({
  items: z.array(
    z.object({
      packId: z.string(),
      productId: z.string(),
      productName: z.string(),
      source: z.enum(['catalogue', 'own']),
      productStatus: z.enum(['ACTIVE', 'ARCHIVED']),
      catalogueActive: z.boolean(),
      brandName: z.string().nullable(),
      categoryName: z.string(),
      sizeLabel: z.string(),
      quantity: z.number(),
      unit: z.enum(PACK_UNITS),
      pricePaise: z.number().int(),
      mrpPaise: z.number().int().nullable(),
      available: z.boolean(),
    }),
  ),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  tabCounts: z.object({
    ALL: z.number().int(),
    VOLUME: z.number().int(),
    WEIGHT: z.number().int(),
    PIECE: z.number().int(),
  }),
  options: z.object({
    brands: z.array(optionSchema),
    categories: z.array(optionSchema),
    sizes: z.array(optionSchema),
  }),
});

export type PackRowPage = z.infer<typeof packRowPageSchema>;
export type PackRow = PackRowPage['items'][number];

export interface PackRowParams {
  tab: PackTab;
  status: 'ACTIVE' | 'ARCHIVED';
  q?: string;
  brand?: string;
  categoryId?: string;
  size?: string;
  available?: 'true' | 'false';
  sort: PackRowSort;
  page: number;
  pageSize: number;
}

export function listPackRows(
  token: string,
  shopId: string,
  params: PackRowParams,
): Promise<PackRowPage> {
  return apiRequest(
    `${base(shopId)}/pack-rows${query({
      tab: params.tab,
      status: params.status,
      q: params.q,
      brand: params.brand,
      categoryId: params.categoryId,
      size: params.size,
      available: params.available,
      sort: params.sort,
      page: String(params.page),
      pageSize: String(params.pageSize),
    })}`,
    { token, schema: packRowPageSchema },
  );
}

export function getShopProduct(
  token: string,
  shopId: string,
  productId: string,
): Promise<ShopProduct> {
  return apiRequest(`${base(shopId)}/products/${enc(productId)}`, {
    token,
    schema: shopProductSchema,
  });
}

export function addShopProduct(
  token: string,
  shopId: string,
  body: AddShopProductBody,
): Promise<ShopProduct> {
  return apiRequest(`${base(shopId)}/products`, {
    token,
    schema: shopProductSchema,
    method: 'POST',
    body,
  });
}

export function updateShopProduct(
  token: string,
  shopId: string,
  productId: string,
  body: UpdateShopProductBody,
): Promise<ShopProduct> {
  return apiRequest(`${base(shopId)}/products/${enc(productId)}`, {
    token,
    schema: shopProductSchema,
    method: 'PATCH',
    body,
  });
}

export function uploadShopProductImage(
  token: string,
  shopId: string,
  productId: string,
  image: File,
): Promise<ShopProduct> {
  const body = new FormData();
  body.append('image', image, image.name || 'image');
  return apiRequest(`${base(shopId)}/products/${enc(productId)}/image`, {
    token,
    schema: shopProductSchema,
    method: 'PUT',
    body,
  });
}

export function addShopPack(
  token: string,
  shopId: string,
  productId: string,
  body: PackPriceBody &
    (
      | { cataloguePackId: string }
      | { quantity: number; unit: (typeof PACK_UNITS)[number] }
    ),
): Promise<ShopProduct> {
  return apiRequest(`${base(shopId)}/products/${enc(productId)}/packs`, {
    token,
    schema: shopProductSchema,
    method: 'POST',
    body,
  });
}

export function updateShopPack(
  token: string,
  shopId: string,
  productId: string,
  packId: string,
  body: Partial<PackPriceBody>,
): Promise<ShopProduct> {
  return apiRequest(
    `${base(shopId)}/products/${enc(productId)}/packs/${enc(packId)}`,
    { token, schema: shopProductSchema, method: 'PATCH', body },
  );
}

export function removeShopPack(
  token: string,
  shopId: string,
  productId: string,
  packId: string,
): Promise<ShopProduct> {
  return apiRequest(
    `${base(shopId)}/products/${enc(productId)}/packs/${enc(packId)}`,
    { token, schema: shopProductSchema, method: 'DELETE' },
  );
}

export function browseBrandProducts(
  token: string,
  shopId: string,
  /** Without brandId, searches every brand (q of at least 2 characters). */
  params: { brandId?: string; q?: string; cursor?: string },
): Promise<Page<BrandProductItem>> {
  return apiRequest(`${base(shopId)}/brand-products${query(params)}`, {
    token,
    schema: page(
      z.object({
        product: productSchema,
        listedProductId: z.string().nullable(),
      }),
    ),
  });
}

// --- Shades ------------------------------------------------------------------

export function browseBrandShades(
  token: string,
  shopId: string,
  /** Without brandId, searches every brand (q of at least 2 characters). */
  params: { brandId?: string; q?: string; cursor?: string },
): Promise<Page<BrandShadeItem>> {
  return apiRequest(`${base(shopId)}/brand-shades${query(params)}`, {
    token,
    schema: page(z.object({ shade: shadeSchema, favourite: z.boolean() })),
  });
}

export function listFavouriteShades(
  token: string,
  shopId: string,
  params: { q?: string; cursor?: string } = {},
): Promise<Page<FavouriteShade>> {
  return apiRequest(
    `${base(shopId)}/favourite-shades${query({ ...params, limit: '100' })}`,
    { token, schema: page(favouriteSchema) },
  );
}

export function addFavouriteShade(
  token: string,
  shopId: string,
  shadeId: string,
): Promise<FavouriteShade> {
  return apiRequest(`${base(shopId)}/favourite-shades/${enc(shadeId)}`, {
    token,
    schema: favouriteSchema,
    method: 'PUT',
  });
}

export function removeFavouriteShade(
  token: string,
  shopId: string,
  shadeId: string,
): Promise<void> {
  return apiRequest(`${base(shopId)}/favourite-shades/${enc(shadeId)}`, {
    token,
    schema: z.undefined(),
    method: 'DELETE',
  });
}

export function listOwnShades(
  token: string,
  shopId: string,
  params: { q?: string; cursor?: string } = {},
): Promise<Page<ShopShade>> {
  return apiRequest(
    `${base(shopId)}/shades${query({ ...params, limit: '100' })}`,
    { token, schema: page(shopShadeSchema) },
  );
}

export function createOwnShade(
  token: string,
  shopId: string,
  body: {
    code: string;
    name: string;
    previewHex: string | null;
    brandId: string | null;
  },
): Promise<ShopShade> {
  return apiRequest(`${base(shopId)}/shades`, {
    token,
    schema: shopShadeSchema,
    method: 'POST',
    body,
  });
}

export function removeOwnShade(
  token: string,
  shopId: string,
  shadeId: string,
): Promise<void> {
  return apiRequest(`${base(shopId)}/shades/${enc(shadeId)}`, {
    token,
    schema: z.undefined(),
    method: 'DELETE',
  });
}

/** One result of the Add product search (CAT-005). */
export interface BrandSearchResult {
  id: string;
  name: string;
  brandName: string;
  categoryName: string;
  packs: { id: string; label: string }[];
  listedProductId: string | null;
}
