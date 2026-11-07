import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';

// Mirrors ShopCatalogueSummary in packages/api_contracts/openapi.json (WEB-008).
const summarySchema = z.object({
  products: z.object({
    active: z.number().int(),
    archived: z.number().int(),
    allAvailable: z.number().int(),
    partlyAvailable: z.number().int(),
    noneAvailable: z.number().int(),
    ownWithoutPhoto: z.number().int(),
  }),
  shades: z.object({ favourites: z.number().int(), own: z.number().int() }),
  ownCategories: z.number().int(),
});

export type ShopCatalogueSummary = z.infer<typeof summarySchema>;

export function getCatalogueSummary(
  token: string,
  shopId: string,
): Promise<ShopCatalogueSummary> {
  return apiRequest(
    `/v1/shops/${encodeURIComponent(shopId)}/catalogue/summary`,
    { token, schema: summarySchema },
  );
}
