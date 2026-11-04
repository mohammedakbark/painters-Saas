import 'server-only';
import { z } from 'zod';
import { SHOP_STATUSES } from '@/lib/shops/labels';
import { REVIEW_REASONS } from '@/lib/shops/review';
import { apiRequest } from './client';
import { shopRegistryEntrySchema } from './platform-shops';
import { shopProfileSchema, onboardingSchema } from './shop-profile';
import { shopProductSchema } from './shop-catalogue';

// Mirrors the PLT-002 schemas in packages/api_contracts/openapi.json.

const decided = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  reasons: z.array(z.enum(REVIEW_REASONS)),
  note: z.string().nullable(),
  decidedAt: z.string(),
});

const reviewStateSchema = z.object({
  status: z.enum(SHOP_STATUSES),
  missing: z.array(z.string()),
  canSubmit: z.boolean(),
  open: z.object({ submittedAt: z.string() }).nullable(),
  lastDecision: decided.nullable(),
});

export type ShopReviewState = z.infer<typeof reviewStateSchema>;

const queueSchema = z.object({
  items: z.array(
    z.object({
      reviewId: z.string(),
      shopId: z.string(),
      shopName: z.string(),
      submittedAt: z.string(),
      resubmission: z.boolean(),
    }),
  ),
  nextCursor: z.string().nullable(),
});

export type ReviewQueuePage = z.infer<typeof queueSchema>;

const snapshotSchema = z.object({
  shop: shopRegistryEntrySchema,
  profile: shopProfileSchema,
  checklist: onboardingSchema,
  products: z.object({
    activeCount: z.number(),
    items: z.array(shopProductSchema),
  }),
  open: z
    .object({
      reviewId: z.string(),
      submittedAt: z.string(),
      resubmission: z.boolean(),
    })
    .nullable(),
  history: z.array(
    decided.extend({
      decision: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'WITHDRAWN']),
      submittedAt: z.string(),
    }),
  ),
});

export type ShopReviewSnapshot = z.infer<typeof snapshotSchema>;

const enc = encodeURIComponent;

// --- Shop owner --------------------------------------------------------------

export function getShopReview(
  token: string,
  shopId: string,
): Promise<ShopReviewState> {
  return apiRequest(`/v1/shops/${enc(shopId)}/review`, {
    token,
    schema: reviewStateSchema,
  });
}

export function submitShopForReview(
  token: string,
  shopId: string,
): Promise<ShopReviewState> {
  return apiRequest(`/v1/shops/${enc(shopId)}/review-submission`, {
    token,
    schema: reviewStateSchema,
    method: 'POST',
  });
}

export function withdrawShopReview(
  token: string,
  shopId: string,
): Promise<ShopReviewState> {
  return apiRequest(`/v1/shops/${enc(shopId)}/review-submission/withdraw`, {
    token,
    schema: reviewStateSchema,
    method: 'POST',
  });
}

// --- Platform ----------------------------------------------------------------

export function listReviewQueue(
  token: string,
  cursor?: string,
): Promise<ReviewQueuePage> {
  const query = cursor ? `?cursor=${enc(cursor)}` : '';
  return apiRequest(`/v1/platform/reviews${query}`, {
    token,
    schema: queueSchema,
  });
}

/** Audited by the API: every call records that an admin viewed the shop. */
export function getShopReviewSnapshot(
  token: string,
  shopId: string,
): Promise<ShopReviewSnapshot> {
  return apiRequest(`/v1/platform/shops/${enc(shopId)}/review`, {
    token,
    schema: snapshotSchema,
  });
}

export function decideShopReview(
  token: string,
  shopId: string,
  body: {
    decision: 'APPROVED' | 'CHANGES_REQUESTED';
    reasons: string[];
    note: string | null;
  },
): Promise<{ shopId: string; status: string; decision: string }> {
  return apiRequest(`/v1/platform/shops/${enc(shopId)}/review/decision`, {
    token,
    schema: z.object({
      shopId: z.string(),
      status: z.string(),
      decision: z.string(),
    }),
    method: 'POST',
    body,
  });
}
