import 'server-only';
import { z } from 'zod';
import { SHOP_STATUSES } from '@/lib/shops/labels';
import { apiRequest } from './client';

// Mirrors ShopRegistryEntry / ShopRegistryPage in packages/api_contracts/openapi.json.
export const shopRegistryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(SHOP_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
  master: z
    .object({ name: z.string().nullable(), phone: z.string().nullable() })
    .nullable(),
});

const registryPageSchema = z.object({
  items: z.array(shopRegistryEntrySchema),
  nextCursor: z.string().nullable(),
});

export type ShopRegistryEntry = z.infer<typeof shopRegistryEntrySchema>;
export type ShopRegistryPage = z.infer<typeof registryPageSchema>;

export const REGISTRY_PAGE_SIZE = 20;

export function listRegisteredShops(
  token: string,
  cursor?: string,
): Promise<ShopRegistryPage> {
  const query = new URLSearchParams({ limit: String(REGISTRY_PAGE_SIZE) });
  if (cursor) {
    query.set('cursor', cursor);
  }
  return apiRequest(`/v1/platform/shops?${query.toString()}`, {
    token,
    schema: registryPageSchema,
  });
}

export function getRegisteredShop(
  token: string,
  shopId: string,
): Promise<ShopRegistryEntry> {
  return apiRequest(`/v1/platform/shops/${encodeURIComponent(shopId)}`, {
    token,
    schema: shopRegistryEntrySchema,
  });
}
