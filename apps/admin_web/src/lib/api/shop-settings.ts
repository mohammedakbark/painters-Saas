import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';

// Mirrors ShopSettings in packages/api_contracts/openapi.json (SHP-008).
const deliverySchema = z.object({
  enabled: z.boolean(),
  chargePaise: z.number().int().nullable(),
  freeAbovePaise: z.number().int().nullable(),
  radiusKm: z.number().int().nullable(),
});

export const shopSettingsSchema = z.object({
  shopId: z.string(),
  pickup: z.literal(true),
  delivery: deliverySchema,
  hasLocation: z.boolean(),
  orderMessages: z.array(z.string()),
  updatedAt: z.string().nullable(),
});

export type ShopSettings = z.infer<typeof shopSettingsSchema>;
export type DeliverySettings = z.infer<typeof deliverySchema>;

const path = (shopId: string, rest = '') =>
  `/v1/shops/${encodeURIComponent(shopId)}/settings${rest}`;

export function getShopSettings(
  token: string,
  shopId: string,
): Promise<ShopSettings> {
  return apiRequest(path(shopId), { token, schema: shopSettingsSchema });
}

export function updateDeliverySettings(
  token: string,
  shopId: string,
  body: DeliverySettings,
): Promise<ShopSettings> {
  return apiRequest(path(shopId, '/delivery'), {
    token,
    schema: shopSettingsSchema,
    method: 'PUT',
    body,
  });
}

export function updateOrderMessages(
  token: string,
  shopId: string,
  messages: string[],
): Promise<ShopSettings> {
  return apiRequest(path(shopId, '/order-messages'), {
    token,
    schema: shopSettingsSchema,
    method: 'PUT',
    body: { messages },
  });
}
