import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';

// Mirrors ShopCategory in packages/api_contracts/openapi.json (CAT-007).
const shopCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  active: z.boolean(),
  own: z.boolean(),
  productCount: z.number().int(),
});

export type ShopCategory = z.infer<typeof shopCategorySchema>;

const path = (shopId: string, rest = '') =>
  `/v1/shops/${encodeURIComponent(shopId)}/catalogue/categories${rest}`;

/** Active platform categories and all of the shop's own. */
export async function listShopCategories(
  token: string,
  shopId: string,
): Promise<ShopCategory[]> {
  const result = await apiRequest(path(shopId), {
    token,
    schema: z.object({ items: z.array(shopCategorySchema) }),
  });
  return result.items;
}

export function createShopCategory(
  token: string,
  shopId: string,
  name: string,
): Promise<ShopCategory> {
  return apiRequest(path(shopId), {
    token,
    schema: shopCategorySchema,
    method: 'POST',
    body: { name },
  });
}

export function updateShopCategory(
  token: string,
  shopId: string,
  categoryId: string,
  body: { name?: string; active?: boolean },
): Promise<ShopCategory> {
  return apiRequest(path(shopId, `/${encodeURIComponent(categoryId)}`), {
    token,
    schema: shopCategorySchema,
    method: 'PATCH',
    body,
  });
}

/**
 * Categories for a product's category select: the active ones, plus the
 * product's current category when it has since been archived.
 */
export function categoryChoices(
  categories: readonly ShopCategory[],
  currentId?: string,
): { id: string; name: string }[] {
  return categories
    .filter((category) => category.active || category.id === currentId)
    .map((category) => ({
      id: category.id,
      name: category.active ? category.name : `${category.name} (archived)`,
    }));
}
