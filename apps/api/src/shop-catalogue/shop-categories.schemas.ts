import { z } from 'zod';
import { CATALOGUE_LIMITS } from '../catalogue/catalogue-text.js';

// Shop categories (CAT-007, D-048). Name limits match the platform's.

const L = CATALOGUE_LIMITS.categoryName;

/** At most this many own categories per shop, archived ones included. */
export const MAX_SHOP_CATEGORIES = 50;

const name = z
  .string({ error: 'Enter the category name.' })
  .trim()
  .min(L.min, {
    error: `The category name needs at least ${L.min} characters.`,
  })
  .max(L.max, {
    error: `The category name can be at most ${L.max} characters.`,
  });

export const CreateShopCategoryRequestSchema = z
  .object({ name })
  .meta({ id: 'CreateShopCategoryRequest' });

export const UpdateShopCategoryRequestSchema = z
  .object({ name: name.optional(), active: z.boolean().optional() })
  .refine((value) => value.name !== undefined || value.active !== undefined, {
    error: 'Change the name or the status.',
  })
  .meta({ id: 'UpdateShopCategoryRequest' });

export const ShopCategorySchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    sortOrder: z.int(),
    active: z.boolean(),
    own: z.boolean().meta({
      description:
        "True for the shop's own category, false for a platform one.",
    }),
    productCount: z.int().meta({
      description: "The shop's products in this category (all statuses).",
    }),
  })
  .meta({ id: 'ShopCategory' });

export const ShopCategoryListSchema = z
  .object({ items: z.array(ShopCategorySchema) })
  .meta({ id: 'ShopCategoryList' });

export type CreateShopCategoryRequest = z.infer<
  typeof CreateShopCategoryRequestSchema
>;
export type UpdateShopCategoryRequest = z.infer<
  typeof UpdateShopCategoryRequestSchema
>;
export type ShopCategoryResponse = z.infer<typeof ShopCategorySchema>;
export type ShopCategoryList = z.infer<typeof ShopCategoryListSchema>;
