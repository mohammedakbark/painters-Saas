import { z } from 'zod';
import { PackUnit } from '../generated/prisma/enums.js';
import {
  PackInputSchema,
  PackSchema,
  ProductSchema,
  ShadeSchema,
} from '../catalogue/catalogue.schemas.js';
import { CATALOGUE_LIMITS, SHADE_CODE } from '../catalogue/catalogue-text.js';
import {
  SHOP_CATALOGUE_LIMITS,
  UNIT_GROUP_MESSAGE,
  unitGroup,
} from './shop-catalogue-rules.js';

// Shop catalogue requests and responses (CAT-002). Money is integer paise
// everywhere; clients enter and show rupees.

const L = CATALOGUE_LIMITS;
const S = SHOP_CATALOGUE_LIMITS;

function text(label: string, min: number, max: number) {
  return z
    .string({ error: `Enter the ${label}.` })
    .trim()
    .min(min, {
      error:
        min > 1
          ? `The ${label} must be at least ${min} characters.`
          : `Enter the ${label}.`,
    })
    .max(max, { error: `The ${label} must be at most ${max} characters.` });
}

const paise = (label: string) =>
  z
    .int({ error: `Enter the ${label}.` })
    .min(1, { error: `The ${label} must be more than ₹0.` })
    .max(S.maxPaise, { error: `The ${label} is too large.` });

const priceFields = {
  mrpPaise: paise('MRP').nullable().optional().meta({
    description: 'Maximum retail price in paise; optional.',
  }),
  pricePaise: paise('price').meta({ description: 'Selling price in paise.' }),
  available: z.boolean().default(true).meta({
    description: 'Unavailable packs cannot be bought (D-029).',
  }),
};

/** The selling price may not be above the MRP (assumption, CAT-002 §5). */
function priceNotAboveMrp(pack: {
  mrpPaise?: number | null;
  pricePaise: number;
}): boolean {
  return (
    pack.mrpPaise === undefined ||
    pack.mrpPaise === null ||
    pack.pricePaise <= pack.mrpPaise
  );
}
const PRICE_ABOVE_MRP = {
  error: 'The price cannot be more than the MRP.',
  path: ['pricePaise'],
};

const description = z
  .string()
  .trim()
  .max(L.description.max, {
    error: `The description must be at most ${L.description.max} characters.`,
  })
  .nullable();

const shadeCode = z
  .string({ error: 'Enter the shade code.' })
  .trim()
  .max(L.shadeCode.max, {
    error: `The shade code must be at most ${L.shadeCode.max} characters.`,
  })
  .refine(
    (value) => SHADE_CODE.test(value.toUpperCase().replace(/\s+/g, ' ')),
    {
      error:
        'Use letters, digits, spaces, dots, dashes or slashes for the shade code.',
    },
  );

const previewHex = z
  .string()
  .regex(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    error: 'Use a colour like #E8D5B7.',
  })
  .nullable();

const atLeastOneField = (value: Record<string, unknown>) =>
  Object.values(value).some((field) => field !== undefined);

const packList = <T extends z.ZodType<object>>(
  item: T,
  key: (pack: z.infer<T>) => string,
) =>
  z
    .array(item)
    .min(1, { error: 'Choose at least one pack size.' })
    .max(L.packsPerProduct, {
      error: `Add at most ${L.packsPerProduct} pack sizes.`,
    })
    .refine((list) => new Set(list.map(key)).size === list.length, {
      error: 'Each pack size can be listed only once.',
    });

export const CataloguePackListingSchema = z
  .object({ cataloguePackId: z.uuid(), ...priceFields })
  .refine(priceNotAboveMrp, PRICE_ABOVE_MRP)
  .meta({ id: 'ShopCataloguePackListing' });

export const OwnPackListingSchema = z
  .object({ ...PackInputSchema.shape, ...priceFields })
  .refine(priceNotAboveMrp, PRICE_ABOVE_MRP)
  .meta({ id: 'ShopOwnPackListing' });

// --- Requests ----------------------------------------------------------------

const AddCatalogueProductSchema = z.object({
  source: z.literal('catalogue'),
  catalogueProductId: z.uuid({ error: 'Choose a product.' }),
  packs: packList(CataloguePackListingSchema, (p) => p.cataloguePackId),
});

const AddOwnProductSchema = z
  .object({
    source: z.literal('own'),
    name: text('product name', L.productName.min, L.productName.max),
    categoryId: z.uuid({ error: 'Choose the category.' }),
    brandId: z
      .uuid({ error: 'Choose a brand.' })
      .nullable()
      .optional()
      .meta({ description: 'A brand from the brand catalogue.' }),
    brandName: text('brand name', L.brandName.min, L.brandName.max)
      .nullable()
      .optional()
      .meta({ description: 'A brand that is not in the brand catalogue.' }),
    description: description.optional(),
    supportsShades: z.boolean().default(false),
    packs: packList(
      OwnPackListingSchema,
      (p) => `${p.unit}:${p.quantity.toFixed(3)}`,
    ),
  })
  .refine((value) => !(value.brandId && value.brandName), {
    error: 'Choose a catalogue brand or type a brand name, not both.',
    path: ['brandName'],
  })
  .refine(
    (value) =>
      new Set(value.packs.map((pack) => unitGroup(pack.unit))).size <= 1,
    { error: UNIT_GROUP_MESSAGE, path: ['packs'] },
  );

export const AddShopProductRequestSchema = z
  .discriminatedUnion('source', [
    AddCatalogueProductSchema,
    AddOwnProductSchema,
  ])
  .meta({ id: 'AddShopProductRequest' });

export const UpdateShopProductRequestSchema = z
  .object({
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
    name: text('product name', L.productName.min, L.productName.max)
      .optional()
      .meta({ description: 'Own products only.' }),
    categoryId: z
      .uuid({ error: 'Choose the category.' })
      .optional()
      .meta({ description: 'Own products only.' }),
    brandId: z.uuid({ error: 'Choose a brand.' }).nullable().optional(),
    brandName: text('brand name', L.brandName.min, L.brandName.max)
      .nullable()
      .optional(),
    description: description.optional(),
    supportsShades: z.boolean().optional(),
  })
  .refine(atLeastOneField, { error: 'Change at least one field.' })
  .refine((value) => !(value.brandId && value.brandName), {
    error: 'Choose a catalogue brand or type a brand name, not both.',
    path: ['brandName'],
  })
  .meta({ id: 'UpdateShopProductRequest' });

export const AddShopPackRequestSchema = z
  .object({
    cataloguePackId: z
      .uuid()
      .optional()
      .meta({ description: 'Products from the brand catalogue.' }),
    quantity: PackInputSchema.shape.quantity
      .optional()
      .meta({ description: 'Own products.' }),
    unit: z
      .enum(PackUnit, { error: 'Choose the pack unit.' })
      .optional()
      .meta({ description: 'Own products.' }),
    ...priceFields,
  })
  .refine(priceNotAboveMrp, PRICE_ABOVE_MRP)
  .meta({ id: 'AddShopPackRequest' });

export const UpdateShopPackRequestSchema = z
  .object({
    mrpPaise: paise('MRP').nullable().optional(),
    pricePaise: paise('price').optional(),
    available: z.boolean().optional(),
  })
  .refine(atLeastOneField, { error: 'Change at least one field.' })
  .meta({ id: 'UpdateShopPackRequest' });

export const CreateShopShadeRequestSchema = z
  .object({
    code: shadeCode,
    name: text('shade name', L.shadeName.min, L.shadeName.max),
    previewHex: previewHex.optional(),
    brandId: z.uuid({ error: 'Choose a brand.' }).nullable().optional(),
  })
  .meta({ id: 'CreateShopShadeRequest' });

export const UpdateShopShadeRequestSchema = z
  .object({
    code: shadeCode.optional(),
    name: text('shade name', L.shadeName.min, L.shadeName.max).optional(),
    previewHex: previewHex.optional(),
    brandId: z.uuid({ error: 'Choose a brand.' }).nullable().optional(),
  })
  .refine(atLeastOneField, { error: 'Change at least one field.' })
  .meta({ id: 'UpdateShopShadeRequest' });

export type AddShopProductRequest = z.infer<typeof AddShopProductRequestSchema>;
export type UpdateShopProductRequest = z.infer<
  typeof UpdateShopProductRequestSchema
>;
export type AddShopPackRequest = z.infer<typeof AddShopPackRequestSchema>;
export type UpdateShopPackRequest = z.infer<typeof UpdateShopPackRequestSchema>;
export type CreateShopShadeRequest = z.infer<
  typeof CreateShopShadeRequestSchema
>;
export type UpdateShopShadeRequest = z.infer<
  typeof UpdateShopShadeRequestSchema
>;

// --- Queries -----------------------------------------------------------------

const limit = z.coerce
  .number({ error: 'limit must be a number.' })
  .int({ error: 'limit must be a whole number.' })
  .min(1, { error: 'limit must be at least 1.' })
  .max(100, { error: 'limit must be at most 100.' })
  .default(25);

const search = z
  .string()
  .trim()
  .max(60, { error: 'Search for at most 60 characters.' })
  .optional();

const cursor = z
  .string()
  .max(400, { error: 'cursor must be the nextCursor of a previous page.' })
  .optional();

export const ShopProductListQuerySchema = z
  .object({
    q: search,
    status: z
      .enum(['ACTIVE', 'ARCHIVED'], {
        error: 'status must be ACTIVE or ARCHIVED.',
      })
      .default('ACTIVE'),
    catalogueProductId: z
      .uuid({ error: 'catalogueProductId must be a product id.' })
      .optional(),
    cursor,
    limit,
  })
  .meta({ id: 'ShopProductListQuery' });

export const BrandBrowseQuerySchema = z
  .object({
    brandId: z
      .uuid({ error: 'Choose a brand.' })
      .optional()
      .meta({ description: 'Leave out to search every brand (needs q).' }),
    q: search,
    categoryId: z
      .uuid({ error: 'categoryId must be a category id.' })
      .optional(),
    cursor,
    limit,
  })
  .refine((value) => value.brandId || (value.q?.length ?? 0) >= 2, {
    error: 'Choose a brand or search for at least 2 characters.',
    path: ['q'],
  })
  .meta({ id: 'ShopBrandBrowseQuery' });

export const BrandShadeBrowseQuerySchema = z
  .object({
    brandId: z.uuid({ error: 'Choose a brand.' }),
    q: search,
    cursor,
    limit,
  })
  .meta({ id: 'ShopBrandShadeBrowseQuery' });

export const ShopShadeListQuerySchema = z
  .object({ q: search, cursor, limit })
  .meta({ id: 'ShopShadeListQuery' });

export type ShopProductListQuery = z.infer<typeof ShopProductListQuerySchema>;
export type BrandBrowseQuery = z.infer<typeof BrandBrowseQuerySchema>;
export type ShopShadeListQuery = z.infer<typeof ShopShadeListQuerySchema>;
export type BrandShadeBrowseQuery = z.infer<typeof BrandShadeBrowseQuerySchema>;

// --- Responses ---------------------------------------------------------------

const imageUrls = z
  .object({ url: z.url(), thumbUrl: z.url(), updatedAt: z.iso.datetime() })
  .nullable();

const nextCursor = z.string().nullable().meta({
  description: 'Pass as `cursor` for the next page; null on the last page.',
});

export const ShopPackSchema = z
  .object({
    id: z.uuid(),
    cataloguePackId: z.uuid().nullable(),
    quantity: z.number(),
    unit: z.enum(PackUnit),
    label: z.string().meta({ description: 'For example "4 L".' }),
    mrpPaise: z.int().nullable(),
    pricePaise: z.int(),
    available: z.boolean(),
  })
  .meta({ id: 'ShopPack' });

export const ShopProductSchema = z
  .object({
    id: z.uuid(),
    source: z.enum(['catalogue', 'own']),
    catalogueProductId: z.uuid().nullable(),
    name: z.string(),
    brand: z
      .object({ id: z.uuid().nullable(), name: z.string() })
      .nullable()
      .meta({ description: 'id is null for a typed brand name.' }),
    category: z.object({ id: z.uuid(), name: z.string() }),
    description: z.string().nullable(),
    supportsShades: z.boolean(),
    status: z.enum(['ACTIVE', 'ARCHIVED']),
    catalogueActive: z.boolean().meta({
      description:
        'False when the platform archived the catalogue product, brand or category; always true for own products.',
    }),
    image: imageUrls,
    imageSource: z.enum(['shop', 'catalogue']).nullable(),
    packs: z.array(ShopPackSchema),
    unlistedCataloguePacks: z.array(PackSchema).meta({
      description: 'Catalogue pack sizes the shop does not sell yet.',
    }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'ShopProduct' });

export const ShopProductPageSchema = z
  .object({ items: z.array(ShopProductSchema), nextCursor })
  .meta({ id: 'ShopProductPage' });

export const BrandBrowsePageSchema = z
  .object({
    items: z.array(
      z.object({
        product: ProductSchema,
        listedProductId: z.uuid().nullable().meta({
          description: "The shop's listing of this product, if any.",
        }),
      }),
    ),
    nextCursor,
  })
  .meta({ id: 'ShopBrandBrowsePage' });

export const BrandShadeBrowsePageSchema = z
  .object({
    items: z.array(z.object({ shade: ShadeSchema, favourite: z.boolean() })),
    nextCursor,
  })
  .meta({ id: 'ShopBrandShadePage' });

export const FavouriteShadeSchema = z
  .object({
    shade: ShadeSchema,
    brand: z.object({ id: z.uuid(), name: z.string() }),
    addedAt: z.iso.datetime(),
  })
  .meta({ id: 'ShopFavouriteShade' });

export const FavouriteShadePageSchema = z
  .object({ items: z.array(FavouriteShadeSchema), nextCursor })
  .meta({ id: 'ShopFavouriteShadePage' });

export const ShopShadeSchema = z
  .object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
    previewHex: z.string().nullable(),
    brand: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  })
  .meta({ id: 'ShopShade' });

export const ShopShadePageSchema = z
  .object({ items: z.array(ShopShadeSchema), nextCursor })
  .meta({ id: 'ShopShadePage' });

export type ShopPack = z.infer<typeof ShopPackSchema>;
export type ShopProductResponse = z.infer<typeof ShopProductSchema>;
export type ShopProductPage = z.infer<typeof ShopProductPageSchema>;
export type BrandBrowsePage = z.infer<typeof BrandBrowsePageSchema>;
export type BrandShadeBrowsePage = z.infer<typeof BrandShadeBrowsePageSchema>;
export type FavouriteShade = z.infer<typeof FavouriteShadeSchema>;
export type FavouriteShadePage = z.infer<typeof FavouriteShadePageSchema>;
export type ShopShadeResponse = z.infer<typeof ShopShadeSchema>;
export type ShopShadePage = z.infer<typeof ShopShadePageSchema>;

// --- Product rows (CAT-006): one row per product, for the product list ------

export const PACK_TABS = ['ALL', 'VOLUME', 'WEIGHT', 'PIECE'] as const;
export const ROW_PAGE_SIZES = [10, 25, 50] as const;

export const ShopProductRowQuerySchema = z
  .object({
    tab: z
      .enum(PACK_TABS, { error: 'tab must be ALL, VOLUME, WEIGHT or PIECE.' })
      .default('ALL'),
    status: z
      .enum(['ACTIVE', 'ARCHIVED'], {
        error: 'status must be ACTIVE or ARCHIVED.',
      })
      .default('ACTIVE'),
    q: search,
    brand: z
      .string()
      .max(130, { error: 'brand must be a brand from the options.' })
      .optional()
      .meta({ description: 'A brand key from options.brands.' }),
    categoryId: z
      .uuid({ error: 'categoryId must be a category id.' })
      .optional(),
    size: z
      .string()
      .regex(/^\d+(\.\d+)?:(LITRE|MILLILITRE|KILOGRAM|GRAM|PIECE)$/, {
        error: 'size must look like 4:LITRE.',
      })
      .optional()
      .meta({ description: 'Products that have this pack size.' }),
    show: z
      .enum(['all', 'available', 'partly', 'none'], {
        error: 'show must be all, available, partly or none.',
      })
      .default('all')
      .meta({
        description:
          'available: every size available; partly: some not available; none: no size available.',
      }),
    sort: z
      .enum(['name', 'price', '-price'], {
        error: 'sort must be name, price or -price.',
      })
      .default('name'),
    page: z.coerce
      .number({ error: 'page must be a number.' })
      .int({ error: 'page must be a whole number.' })
      .min(1, { error: 'page must be at least 1.' })
      .default(1),
    pageSize: z.coerce
      .number({ error: 'pageSize must be a number.' })
      .refine(
        (value) => (ROW_PAGE_SIZES as readonly number[]).includes(value),
        {
          error: 'pageSize must be 10, 25 or 50.',
        },
      )
      .default(25),
  })
  .meta({ id: 'ShopProductRowQuery' });

const option = z.object({ value: z.string(), label: z.string() });

export const ShopProductRowPageSchema = z
  .object({
    items: z.array(
      z.object({
        productId: z.uuid(),
        name: z.string(),
        source: z.enum(['catalogue', 'own']),
        productStatus: z.enum(['ACTIVE', 'ARCHIVED']),
        catalogueActive: z.boolean(),
        brandName: z.string().nullable(),
        categoryName: z.string(),
        thumbUrl: z.url().nullable(),
        packs: z
          .array(
            z.object({
              id: z.uuid(),
              label: z.string(),
              pricePaise: z.int(),
              mrpPaise: z.int().nullable(),
              available: z.boolean(),
            }),
          )
          .meta({
            description: 'Pack sizes in the current tab, smallest first.',
          }),
        availableCount: z.int(),
        packCount: z.int(),
        minPricePaise: z.int(),
      }),
    ),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
    tabCounts: z.object({
      ALL: z.int(),
      VOLUME: z.int(),
      WEIGHT: z.int(),
      PIECE: z.int(),
    }),
    options: z
      .object({
        brands: z.array(option),
        categories: z.array(option),
        sizes: z.array(option),
      })
      .meta({
        description:
          'Filter values that exist in this shop for the current tab and status.',
      }),
  })
  .meta({ id: 'ShopProductRowPage' });

export type ShopProductRowQuery = z.infer<typeof ShopProductRowQuerySchema>;
export type ShopProductRowPage = z.infer<typeof ShopProductRowPageSchema>;
