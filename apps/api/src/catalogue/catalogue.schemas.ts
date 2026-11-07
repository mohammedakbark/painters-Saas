import { z } from 'zod';
import { PackUnit } from '../generated/prisma/enums.js';
import { CATALOGUE_LIMITS, SHADE_CODE } from './catalogue-text.js';

// Requests are validated here; values are normalised (trimmed, collapsed,
// upper-cased codes) by the services, so CSV imports follow the same rules.

const L = CATALOGUE_LIMITS;

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

export const PackInputSchema = z
  .object({
    quantity: z
      .number({ error: 'Enter the pack quantity.' })
      .positive({ error: 'The pack quantity must be more than 0.' })
      .max(L.maxPackQuantity, { error: 'The pack quantity is too large.' })
      .refine(
        (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6,
        {
          error: 'Use at most 3 decimals for the pack quantity.',
        },
      ),
    unit: z.enum(PackUnit, { error: 'Choose the pack unit.' }),
  })
  .meta({ id: 'CataloguePackInput' });

const packs = z
  .array(PackInputSchema)
  .min(1, { error: 'Add at least one pack size.' })
  .max(L.packsPerProduct, {
    error: `Add at most ${L.packsPerProduct} pack sizes.`,
  })
  .refine(
    (list) =>
      new Set(list.map((p) => `${p.unit}:${p.quantity.toFixed(3)}`)).size ===
      list.length,
    { error: 'Each pack size can be listed only once.' },
  );

// --- Requests ----------------------------------------------------------------

export const CreateCategoryRequestSchema = z
  .object({
    name: text('category name', L.categoryName.min, L.categoryName.max),
    sortOrder: z.int().min(0).max(999).optional(),
  })
  .meta({ id: 'CreateCatalogueCategoryRequest' });

export const UpdateCategoryRequestSchema = z
  .object({
    name: text(
      'category name',
      L.categoryName.min,
      L.categoryName.max,
    ).optional(),
    sortOrder: z.int().min(0).max(999).optional(),
    active: z.boolean().optional(),
  })
  .refine(atLeastOneField, { error: 'Change at least one field.' })
  .meta({ id: 'UpdateCatalogueCategoryRequest' });

export const CreateBrandRequestSchema = z
  .object({ name: text('brand name', L.brandName.min, L.brandName.max) })
  .meta({ id: 'CreateBrandRequest' });

export const UpdateBrandRequestSchema = z
  .object({
    name: text('brand name', L.brandName.min, L.brandName.max).optional(),
    active: z.boolean().optional(),
  })
  .refine(atLeastOneField, { error: 'Change at least one field.' })
  .meta({ id: 'UpdateBrandRequest' });

export const CreateProductRequestSchema = z
  .object({
    name: text('product name', L.productName.min, L.productName.max),
    categoryId: z.uuid({ error: 'Choose the category.' }),
    description: description.optional(),
    supportsShades: z.boolean().default(false),
    packs,
  })
  .meta({ id: 'CreateCatalogueProductRequest' });

export const UpdateProductRequestSchema = z
  .object({
    name: text('product name', L.productName.min, L.productName.max).optional(),
    categoryId: z.uuid({ error: 'Choose the category.' }).optional(),
    description: description.optional(),
    supportsShades: z.boolean().optional(),
    active: z.boolean().optional(),
    packs: packs.optional().meta({
      description:
        'Replaces the pack sizes. A pack used by a shop listing cannot be removed (409 pack_in_use).',
    }),
  })
  .refine(atLeastOneField, { error: 'Change at least one field.' })
  .meta({ id: 'UpdateCatalogueProductRequest' });

export const CreateShadeRequestSchema = z
  .object({
    code: shadeCode,
    name: text('shade name', L.shadeName.min, L.shadeName.max),
    previewHex: previewHex.optional(),
  })
  .meta({ id: 'CreateShadeRequest' });

export const UpdateShadeRequestSchema = z
  .object({
    code: shadeCode.optional(),
    name: text('shade name', L.shadeName.min, L.shadeName.max).optional(),
    previewHex: previewHex.optional(),
    active: z.boolean().optional(),
  })
  .refine(atLeastOneField, { error: 'Change at least one field.' })
  .meta({ id: 'UpdateShadeRequest' });

export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequestSchema>;
export type CreateBrandRequest = z.infer<typeof CreateBrandRequestSchema>;
export type UpdateBrandRequest = z.infer<typeof UpdateBrandRequestSchema>;
export type PackInput = z.infer<typeof PackInputSchema>;
export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;
export type CreateShadeRequest = z.infer<typeof CreateShadeRequestSchema>;
export type UpdateShadeRequest = z.infer<typeof UpdateShadeRequestSchema>;

const limit = z.coerce
  .number({ error: 'limit must be a whole number from 1 to 50.' })
  .int({ error: 'limit must be a whole number from 1 to 50.' })
  .min(1, { error: 'limit must be a whole number from 1 to 50.' })
  .max(50, { error: 'limit must be a whole number from 1 to 50.' })
  .default(20);

const search = z
  .string()
  .trim()
  .max(60, { error: 'Search for at most 60 characters.' })
  .optional();

const cursor = z
  .string()
  .max(400, { error: 'cursor must be the nextCursor of a previous page.' })
  .optional();

export const CatalogueListQuerySchema = z
  .object({ q: search, cursor, limit })
  .meta({ id: 'CatalogueListQuery' });

export const ProductListQuerySchema = z
  .object({
    q: search,
    categoryId: z
      .uuid({ error: 'categoryId must be a category id.' })
      .optional(),
    cursor,
    limit,
  })
  .meta({ id: 'CatalogueProductListQuery' });

export type CatalogueListQuery = z.infer<typeof CatalogueListQuerySchema>;
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

export const ImportQuerySchema = z
  .object({
    dryRun: z
      .enum(['true', 'false'], { error: 'dryRun must be true or false.' })
      .default('true')
      .meta({ description: 'true (default) only checks the file.' }),
  })
  .meta({ id: 'CatalogueImportQuery' });

export type ImportQuery = z.infer<typeof ImportQuerySchema>;

// --- Responses ---------------------------------------------------------------

export const CategorySchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    sortOrder: z.int(),
    active: z.boolean(),
  })
  .meta({ id: 'CatalogueCategory' });

export const CategoryListSchema = z
  .object({ items: z.array(CategorySchema) })
  .meta({ id: 'CatalogueCategoryList' });

export const BrandSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    active: z.boolean(),
    productCount: z.int().meta({ description: 'Active products.' }),
    shadeCount: z.int().meta({ description: 'Active shades.' }),
  })
  .meta({ id: 'Brand' });

export const PackSchema = z
  .object({
    id: z.uuid(),
    quantity: z.number(),
    unit: z.enum(PackUnit),
    label: z.string().meta({ description: 'For example "4 L".' }),
  })
  .meta({ id: 'CataloguePack' });

const imageUrls = z
  .object({ url: z.url(), thumbUrl: z.url(), updatedAt: z.iso.datetime() })
  .nullable();

export const ProductSchema = z
  .object({
    id: z.uuid(),
    brand: z.object({ id: z.uuid(), name: z.string() }),
    category: z.object({ id: z.uuid(), name: z.string() }),
    name: z.string(),
    description: z.string().nullable(),
    supportsShades: z.boolean(),
    active: z.boolean(),
    image: imageUrls,
    packs: z.array(PackSchema),
  })
  .meta({ id: 'CatalogueProduct' });

export const ShadeSchema = z
  .object({
    id: z.uuid(),
    brandId: z.uuid(),
    code: z.string(),
    name: z.string(),
    previewHex: z
      .string()
      .nullable()
      .meta({ description: 'Indicative screen colour, #RRGGBB.' }),
    active: z.boolean(),
  })
  .meta({ id: 'Shade' });

const nextCursor = z.string().nullable().meta({
  description: 'Pass as `cursor` for the next page; null on the last page.',
});

export const BrandPageSchema = z
  .object({ items: z.array(BrandSchema), nextCursor })
  .meta({ id: 'BrandPage' });
export const ProductPageSchema = z
  .object({ items: z.array(ProductSchema), nextCursor })
  .meta({ id: 'CatalogueProductPage' });
export const ShadePageSchema = z
  .object({ items: z.array(ShadeSchema), nextCursor })
  .meta({ id: 'ShadePage' });

export const ImportResultSchema = z
  .object({
    kind: z.enum(['shades', 'products']),
    dryRun: z.boolean(),
    applied: z.boolean().meta({
      description: 'False for a dry run or when any row has an error.',
    }),
    rows: z.int(),
    created: z.int(),
    updated: z.int(),
    unchanged: z.int(),
    errors: z.array(z.object({ row: z.int(), message: z.string() })).meta({
      description: 'Row 1 is the first data row. At most 100 are listed.',
    }),
    errorCount: z.int(),
  })
  .meta({ id: 'CatalogueImportResult' });

export type Category = z.infer<typeof CategorySchema>;
export type CategoryList = z.infer<typeof CategoryListSchema>;
export type BrandResponse = z.infer<typeof BrandSchema>;
export type ProductResponse = z.infer<typeof ProductSchema>;
export type ShadeResponse = z.infer<typeof ShadeSchema>;
export type BrandPage = z.infer<typeof BrandPageSchema>;
export type ProductPage = z.infer<typeof ProductPageSchema>;
export type ShadePage = z.infer<typeof ShadePageSchema>;
export type ImportResult = z.infer<typeof ImportResultSchema>;

// --- Platform lists (PLT-003): numbered pages with totals ---------------------

const listStatus = z
  .enum(['active', 'archived', 'all'], {
    error: 'status must be active, archived or all.',
  })
  .default('all');
const listPage = z.coerce
  .number({ error: 'page must be a number.' })
  .int({ error: 'page must be a whole number.' })
  .min(1, { error: 'page must be at least 1.' })
  .default(1);
const listPageSize = z.coerce
  .number({ error: 'pageSize must be 10, 25 or 50.' })
  .refine((value) => [10, 25, 50].includes(value), {
    error: 'pageSize must be 10, 25 or 50.',
  })
  .default(25);

export const PlatformBrandListQuerySchema = z
  .object({
    q: search,
    status: listStatus,
    page: listPage,
    pageSize: listPageSize,
  })
  .meta({ id: 'PlatformBrandListQuery' });

export const PlatformProductListQuerySchema = z
  .object({
    q: search,
    categoryId: z
      .uuid({ error: 'categoryId must be a category id.' })
      .optional(),
    status: listStatus,
    page: listPage,
    pageSize: listPageSize,
  })
  .meta({ id: 'PlatformProductListQuery' });

export const PlatformBrandPageSchema = z
  .object({
    items: z.array(BrandSchema),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
  })
  .meta({ id: 'PlatformBrandPage' });

export const PlatformProductPageSchema = z
  .object({
    items: z.array(ProductSchema),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
  })
  .meta({ id: 'PlatformProductPage' });

export type PlatformBrandListQuery = z.infer<
  typeof PlatformBrandListQuerySchema
>;
export type PlatformProductListQuery = z.infer<
  typeof PlatformProductListQuerySchema
>;
export type PlatformBrandPage = z.infer<typeof PlatformBrandPageSchema>;
export type PlatformProductPage = z.infer<typeof PlatformProductPageSchema>;
