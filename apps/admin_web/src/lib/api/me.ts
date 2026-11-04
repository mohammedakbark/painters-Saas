import 'server-only';
import { z } from 'zod';
import { SHOP_STATUSES } from '@/lib/shops/labels';
import { apiRequest } from './client';

// Mirrors MeResponse in packages/api_contracts/openapi.json.
const meSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  displayName: z.string().nullable(),
  platformRole: z.enum(['SUPER_ADMIN']).nullable(),
  shopMemberships: z.array(
    z.object({
      shopId: z.string(),
      shopName: z.string(),
      shopStatus: z.enum(SHOP_STATUSES),
      role: z.enum(['MASTER']),
    }),
  ),
});

export type Me = z.infer<typeof meSchema>;

export function getMe(token: string): Promise<Me> {
  return apiRequest('/v1/me', { token, schema: meSchema });
}
