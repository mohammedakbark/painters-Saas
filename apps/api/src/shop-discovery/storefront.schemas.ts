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
