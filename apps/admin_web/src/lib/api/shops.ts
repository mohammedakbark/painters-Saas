import 'server-only';
import { z } from 'zod';
import { SHOP_STATUSES } from '@/lib/shops/labels';
import { apiRequest } from './client';

// Mirrors MyShop in packages/api_contracts/openapi.json.
const myShopSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(SHOP_STATUSES),
  myRole: z.enum(['MASTER']),
  createdAt: z.string(),
});

export type MyShop = z.infer<typeof myShopSchema>;

/** A shop the caller is a member of. The API answers 404 for any other shop. */
export function getMyShop(token: string, shopId: string): Promise<MyShop> {
  return apiRequest(`/v1/shops/${encodeURIComponent(shopId)}`, {
    token,
    schema: myShopSchema,
  });
}

export function registerShop(
  token: string,
  input: { shopName: string; ownerName: string },
): Promise<MyShop> {
  return apiRequest('/v1/shops', {
    token,
    schema: myShopSchema,
    method: 'POST',
    body: input,
  });
}
