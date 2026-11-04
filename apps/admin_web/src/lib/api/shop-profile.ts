import 'server-only';
import { z } from 'zod';
import type { ProfileRequestBody } from '@/lib/shops/profile';
import { apiRequest } from './client';

// Mirrors ShopProfile and ShopOnboarding in packages/api_contracts/openapi.json.
const shopProfileSchema = z.object({
  shopId: z.string(),
  shopName: z.string(),
  status: z.string(),
  supportPhone: z.string().nullable(),
  address: z
    .object({
      line1: z.string(),
      line2: z.string().nullable(),
      landmark: z.string().nullable(),
      city: z.string(),
      district: z.string(),
      stateCode: z.string(),
      stateName: z.string(),
      postalCode: z.string(),
    })
    .nullable(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      source: z.enum(['MAP_PIN', 'DEVICE_GPS']),
      updatedAt: z.string(),
    })
    .nullable(),
  updatedAt: z.string().nullable(),
});

export type ShopProfile = z.infer<typeof shopProfileSchema>;

const onboardingSchema = z.object({
  // Keys are open-ended: later features add checklist items.
  items: z.array(z.object({ key: z.string(), done: z.boolean() })),
});

export type ShopOnboarding = z.infer<typeof onboardingSchema>;

const path = (shopId: string, rest: string) =>
  `/v1/shops/${encodeURIComponent(shopId)}/${rest}`;

export function getShopProfile(
  token: string,
  shopId: string,
): Promise<ShopProfile> {
  return apiRequest(path(shopId, 'profile'), {
    token,
    schema: shopProfileSchema,
  });
}

export function updateShopProfile(
  token: string,
  shopId: string,
  body: ProfileRequestBody,
): Promise<ShopProfile> {
  return apiRequest(path(shopId, 'profile'), {
    token,
    schema: shopProfileSchema,
    method: 'PUT',
    body,
  });
}

export function getShopOnboarding(
  token: string,
  shopId: string,
): Promise<ShopOnboarding> {
  return apiRequest(path(shopId, 'onboarding'), {
    token,
    schema: onboardingSchema,
  });
}
