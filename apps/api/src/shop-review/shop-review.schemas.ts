import { z } from 'zod';
import { ShopReviewReason, ShopStatus } from '../generated/prisma/enums.js';
import { ShopRegistryEntrySchema } from '../platform-shops/platform-shops.schemas.js';
import { ShopProductSchema } from '../shop-catalogue/shop-catalogue.schemas.js';
import {
  OnboardingItemKey,
  ShopOnboardingResponseSchema,
  ShopProfileResponseSchema,
} from '../shops/shop-profile.schemas.js';

// Shop review (PLT-002, D-025, D-032, D-033).

export const REVIEW_NOTE_MAX = 1000;

const decidedReview = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  reasons: z.array(z.enum(ShopReviewReason)),
  note: z.string().nullable(),
  decidedAt: z.iso.datetime(),
});

/** What the owner sees: status, what is missing, the open submission and the last decision. */
export const ShopReviewStateSchema = z
  .object({
    status: z.enum(ShopStatus),
    missing: z.array(OnboardingItemKey).meta({
      description: 'Checklist items still to do; empty when complete.',
    }),
    canSubmit: z.boolean().meta({
      description:
        'The checklist is complete and the shop is a draft or has changes requested.',
    }),
    open: z
      .object({ submittedAt: z.iso.datetime() })
      .nullable()
      .meta({ description: 'The submission waiting for review, if any.' }),
    lastDecision: decidedReview
      .nullable()
      .meta({ description: 'The latest approval or change request.' }),
  })
  .meta({ id: 'ShopReviewState' });

export type ShopReviewState = z.infer<typeof ShopReviewStateSchema>;

export const ReviewDecisionRequestSchema = z
  .object({
    decision: z.enum(['APPROVED', 'CHANGES_REQUESTED'], {
      error: 'Choose approve or request changes.',
    }),
    reasons: z
      .array(z.enum(ShopReviewReason, { error: 'Choose a listed reason.' }))
      .max(Object.keys(ShopReviewReason).length)
      .default([]),
    note: z
      .string()
      .trim()
      .max(REVIEW_NOTE_MAX, {
        error: `The note must be at most ${REVIEW_NOTE_MAX} characters.`,
      })
      .nullable()
      .optional()
      .meta({ description: 'Shown to the owner. Required with OTHER.' }),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'CHANGES_REQUESTED' && value.reasons.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['reasons'],
        message: 'Choose at least one reason.',
      });
    }
    if (value.decision === 'APPROVED' && value.reasons.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['reasons'],
        message: 'An approval has no reasons.',
      });
    }
    if (value.reasons.includes('OTHER') && !value.note) {
      ctx.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Explain the other reason in the note.',
      });
    }
  })
  .meta({ id: 'ShopReviewDecisionRequest' });

export type ReviewDecisionRequest = z.infer<typeof ReviewDecisionRequestSchema>;

export const ReviewDecisionResultSchema = z
  .object({
    shopId: z.uuid(),
    status: z.enum(ShopStatus),
    decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  })
  .meta({ id: 'ShopReviewDecisionResult' });

export type ReviewDecisionResult = z.infer<typeof ReviewDecisionResultSchema>;

export const ReviewQueueQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(60, { error: 'Search for at most 60 characters.' })
      .optional()
      .meta({ description: 'Shop name, owner name or owner mobile.' }),
    sort: z
      .enum(['oldest', 'newest'], { error: 'sort must be oldest or newest.' })
      .default('oldest')
      .meta({ description: 'Oldest first is fair: shops wait the least.' }),
    page: z.coerce
      .number({ error: 'page must be a number.' })
      .int({ error: 'page must be a whole number.' })
      .min(1, { error: 'page must be at least 1.' })
      .default(1),
    pageSize: z.coerce
      .number({ error: 'pageSize must be 10, 25 or 50.' })
      .refine((value) => [10, 25, 50].includes(value), {
        error: 'pageSize must be 10, 25 or 50.',
      })
      .default(25),
  })
  .meta({ id: 'ShopReviewQueueQuery' });

export type ReviewQueueQuery = z.infer<typeof ReviewQueueQuerySchema>;

export const ReviewQueuePageSchema = z
  .object({
    items: z.array(
      z.object({
        reviewId: z.uuid(),
        shopId: z.uuid(),
        shopName: z.string(),
        photoThumbUrl: z.url().nullable(),
        ownerName: z.string().nullable(),
        ownerPhone: z.string().nullable(),
        submittedAt: z.iso.datetime(),
        resubmission: z.boolean().meta({
          description: 'Submitted again after a change request.',
        }),
      }),
    ),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
  })
  .meta({ id: 'ShopReviewQueuePage' });

export type ReviewQueuePage = z.infer<typeof ReviewQueuePageSchema>;

export const REVIEW_PRODUCT_LIMIT = 50;

/** Everything a platform admin checks before deciding (audited on every view). */
export const ShopReviewSnapshotSchema = z
  .object({
    shop: ShopRegistryEntrySchema,
    profile: ShopProfileResponseSchema,
    checklist: ShopOnboardingResponseSchema,
    products: z.object({
      activeCount: z.int(),
      items: z.array(ShopProductSchema).meta({
        description: `The newest ${REVIEW_PRODUCT_LIMIT} active products.`,
      }),
    }),
    open: z
      .object({
        reviewId: z.uuid(),
        submittedAt: z.iso.datetime(),
        resubmission: z.boolean(),
      })
      .nullable(),
    history: z
      .array(
        decidedReview.extend({
          decision: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'WITHDRAWN']),
          submittedAt: z.iso.datetime(),
        }),
      )
      .meta({ description: 'Decided submissions, newest first (up to 10).' }),
  })
  .meta({ id: 'ShopReviewSnapshot' });

export type ShopReviewSnapshot = z.infer<typeof ShopReviewSnapshotSchema>;
