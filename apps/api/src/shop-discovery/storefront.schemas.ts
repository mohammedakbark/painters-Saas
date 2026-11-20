import { z } from 'zod';
import { PackUnit } from '../generated/prisma/enums.js';

export const STOREFRONT_PAGE_SIZE_MAX = 50;

export const StorefrontQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(60, { error: 'Search can be at most 60 characters.' })
      .optional()
      .meta({ description: 'Part of the product or brand name.' }),
    categoryId: z
      .uuid({ error: 'categoryId must be an id.' })
      .optional()
      .meta({ description: 'Only products in this category.' }),
    page: z.coerce
      .number({ error: 'page must be a number.' })
      .int({ error: 'page must be a whole number.' })
      .min(1, { error: 'page must be at least 1.' })
      .default(1),
    pageSize: z.coerce
      .number({ error: 'pageSize must be a number.' })
      .int({ error: 'pageSize must be a whole number.' })
      .min(1, { error: 'pageSize must be at least 1.' })
      .max(STOREFRONT_PAGE_SIZE_MAX, {
        error: `pageSize can be at most ${STOREFRONT_PAGE_SIZE_MAX}.`,
      })
      .default(20),
  })
  .meta({ id: 'StorefrontQuery' });

export type StorefrontQuery = z.infer<typeof StorefrontQuerySchema>;

/**
 * A pack size as customers see it (CUS-003): the shop's price and whether
 * it can be bought (D-029). No MRP (question 59), no catalogue ids.
 */
export const StorefrontPackSchema = z
  .object({
    id: z.uuid(),
    quantity: z.number(),
    unit: z.enum(PackUnit),
    label: z.string().meta({ description: 'For example "4 L".' }),
    pricePaise: z.int(),
    available: z.boolean(),
  })
  .meta({ id: 'StorefrontPack' });

/**
 * A product in a Live shop's storefront (CUS-003): an allow-list of public
 * fields. Never the product's status, internal ids, MRP or catalogue packs
 * the shop does not sell.
 */
export const StorefrontProductSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    brand: z.string().nullable(),
    category: z.object({ id: z.uuid(), name: z.string() }),
    description: z.string().nullable(),
    supportsShades: z.boolean(),
    image: z
      .object({
        url: z.url().meta({ description: 'WebP, at most 1600 px.' }),
        thumbUrl: z.url().meta({ description: 'WebP, at most 480 px.' }),
      })
      .nullable(),
    packs: z.array(StorefrontPackSchema).meta({
      description: 'Smallest first; unavailable packs included (D-029).',
    }),
    available: z
      .boolean()
      .meta({ description: 'At least one pack can be bought.' }),
    fromPricePaise: z.int().meta({
      description:
        'Lowest price among the available packs, or among all packs when none is available.',
    }),
  })
  .meta({ id: 'StorefrontProduct' });

export type StorefrontProduct = z.infer<typeof StorefrontProductSchema>;

export const StorefrontPageSchema = z
  .object({
    items: z.array(StorefrontProductSchema),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
  })
  .meta({ id: 'StorefrontPage' });

export type StorefrontPage = z.infer<typeof StorefrontPageSchema>;

export const StorefrontCategoriesSchema = z
  .object({
    items: z.array(
      z.object({ id: z.uuid(), name: z.string(), productCount: z.int() }),
    ),
  })
  .meta({ id: 'StorefrontCategories' });

export type StorefrontCategories = z.infer<typeof StorefrontCategoriesSchema>;

export const ProductShadesQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(40, { error: 'Search can be at most 40 characters.' })
      .optional()
      .meta({ description: 'Part of the shade code or name.' }),
  })
  .meta({ id: 'ProductShadesQuery' });

export type ProductShadesQuery = z.infer<typeof ProductShadesQuerySchema>;

export const PRODUCT_SHADES_MAX = 60;

/**
 * Shades a customer can pick for a product (CUS-004): the shop's favourite
 * brand shades first, then the brand's shade card and the shop's own codes.
 * At most 60; search to narrow. Colours are indicative only.
 */
export const ProductShadesSchema = z
  .object({
    items: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        previewHex: z.string().nullable(),
        favourite: z
          .boolean()
          .meta({ description: 'The shop marked it as a favourite.' }),
      }),
    ),
    more: z
      .boolean()
      .meta({ description: 'More shades match; search to narrow.' }),
  })
  .meta({ id: 'ProductShades' });

export type ProductShades = z.infer<typeof ProductShadesSchema>;

export const CartCheckRequestSchema = z
  .object({
    packIds: z
      .array(z.uuid({ error: 'Each pack must be an id.' }))
      .min(1, { error: 'Send at least one pack.' })
      .max(50, { error: 'A cart can have at most 50 lines.' }),
  })
  .meta({ id: 'CartCheckRequest' });

export type CartCheckRequest = z.infer<typeof CartCheckRequestSchema>;

/**
 * Today's price and availability of the packs in a cart (CUS-004). Packs
 * that are no longer sold (removed, archived or hidden) are left out.
 */
export const CartCheckSchema = z
  .object({
    packs: z.array(
      z.object({
        packId: z.uuid(),
        productId: z.uuid(),
        productName: z.string(),
        brand: z.string().nullable(),
        label: z.string(),
        pricePaise: z.int(),
        available: z.boolean(),
        supportsShades: z.boolean(),
      }),
    ),
  })
  .meta({ id: 'CartCheck' });

export type CartCheck = z.infer<typeof CartCheckSchema>;
