import 'server-only';
import { z } from 'zod';
import { SHOP_STATUSES } from '@/lib/shops/labels';
import { apiRequest } from './client';

// Mirrors ShopRegistryEntry / ShopRegistryPage in packages/api_contracts/openapi.json.
export const shopRegistryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(SHOP_STATUSES),
  photoThumbUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  master: z
    .object({ name: z.string().nullable(), phone: z.string().nullable() })
    .nullable(),
});

const registryPageSchema = z.object({
  items: z.array(shopRegistryEntrySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  statusCounts: z.object({
    ALL: z.number().int(),
    DRAFT: z.number().int(),
    PENDING_REVIEW: z.number().int(),
    CHANGES_REQUESTED: z.number().int(),
    ACTIVE: z.number().int(),
  }),
});

export type ShopRegistryEntry = z.infer<typeof shopRegistryEntrySchema>;
export type ShopRegistryPage = z.infer<typeof registryPageSchema>;

export const LIST_PAGE_SIZES = [10, 25, 50] as const;
export const REGISTRY_SORTS = ['newest', 'oldest', 'name'] as const;

export interface RegistryParams {
  q?: string;
  status?: (typeof SHOP_STATUSES)[number];
  sort: (typeof REGISTRY_SORTS)[number];
  page: number;
  pageSize: number;
}

export function listRegisteredShops(
  token: string,
  params: RegistryParams,
): Promise<ShopRegistryPage> {
  const query = new URLSearchParams({
    sort: params.sort,
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) {
    query.set('q', params.q);
  }
  if (params.status) {
    query.set('status', params.status);
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

// Mirrors PlatformSummary in packages/api_contracts/openapi.json (UX-003).
const platformSummarySchema = z.object({
  reviews: z.object({
    waiting: z.number().int(),
    oldestSubmittedAt: z.string().nullable(),
  }),
  shops: z.object({
    live: z.number().int(),
    inReview: z.number().int(),
    changesRequested: z.number().int(),
    draft: z.number().int(),
  }),
  catalogue: z.object({
    brands: z.number().int(),
    products: z.number().int(),
    shades: z.number().int(),
  }),
});

export type PlatformSummary = z.infer<typeof platformSummarySchema>;

/** Counts for the platform Overview and the Reviews menu badge. */
export function getPlatformSummary(token: string): Promise<PlatformSummary> {
  return apiRequest('/v1/platform/summary', {
    token,
    schema: platformSummarySchema,
  });
}
