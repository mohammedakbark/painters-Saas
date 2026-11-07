import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import { PlatformShopsService } from '../platform-shops/platform-shops.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ImageStore } from '../media/image-store.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { shopNotFound } from '../shop-access/shop-access.guard.js';
import { ShopProductsService } from '../shop-catalogue/shop-products.service.js';
import { lockShopStatus } from '../shops/shop-edit-lock.js';
import { ShopProfileService } from '../shops/shop-profile.service.js';
import {
  REVIEW_PRODUCT_LIMIT,
  type ReviewDecisionRequest,
  type ReviewDecisionResult,
  type ReviewQueuePage,
  type ReviewQueueQuery,
  type ShopReviewSnapshot,
} from './shop-review.schemas.js';

const shopIdSchema = z.uuid();

function reviewNotPending(): ProblemException {
  return new ProblemException(HttpStatus.CONFLICT, {
    detail:
      'This shop is not waiting for review (it may have been decided or withdrawn).',
    code: 'review_not_pending',
  });
}

/**
 * The platform side of the shop review (PLT-002): the queue, the shop
 * snapshot an admin checks, and the decision (D-025, D-032). Platform access
 * to a shop's private data (support mobile, address, products and prices) is
 * audited on every snapshot view.
 */
@Injectable()
export class PlatformReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PlatformShopsService,
    private readonly profiles: ShopProfileService,
    private readonly products: ShopProductsService,
    private readonly images: ImageStore,
  ) {}

  /**
   * Open submissions (PLT-003): oldest first by default, with search and
   * numbered pages. Paged in the database.
   */
  async queue(query: ReviewQueueQuery): Promise<ReviewQueuePage> {
    const where: Prisma.ShopReviewWhereInput = {
      openShopId: { not: null },
      ...(query.q
        ? {
            shop: {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                {
                  memberships: {
                    some: {
                      role: 'MASTER',
                      user: {
                        OR: [
                          {
                            displayName: {
                              contains: query.q,
                              mode: 'insensitive',
                            },
                          },
                          {
                            phone: { contains: query.q.replace(/[\s+-]/g, '') },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          }
        : {}),
    };
    const direction = query.sort === 'newest' ? 'desc' : 'asc';
    const [rows, total] = await Promise.all([
      this.prisma.shopReview.findMany({
        where,
        orderBy: [{ submittedAt: direction }, { id: direction }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          submittedAt: true,
          submittedFrom: true,
          shop: {
            select: {
              id: true,
              name: true,
              photoKey: true,
              photoUpdatedAt: true,
              memberships: {
                where: { role: 'MASTER' },
                take: 1,
                select: {
                  user: { select: { displayName: true, phone: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.shopReview.count({ where }),
    ]);
    return {
      items: rows.map((row) => {
        const owner = row.shop.memberships[0]?.user;
        return {
          reviewId: row.id,
          shopId: row.shop.id,
          shopName: row.shop.name,
          photoThumbUrl:
            this.images.urls(row.shop.photoKey, row.shop.photoUpdatedAt)
              ?.thumbUrl ?? null,
          ownerName: owner?.displayName ?? null,
          ownerPhone: owner?.phone ?? null,
          submittedAt: row.submittedAt.toISOString(),
          resubmission: row.submittedFrom === 'CHANGES_REQUESTED',
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** The whole shop as the owner submitted it. Audited: it shows tenant data. */
  async snapshot(
    admin: CurrentUserContext,
    shopId: string,
  ): Promise<ShopReviewSnapshot> {
    if (!shopIdSchema.safeParse(shopId).success) {
      throw shopNotFound();
    }
    const shop = await this.registry.get(shopId);
    const [profile, checklist, products, open, history] = await Promise.all([
      this.profiles.profileOf(shopId),
      this.profiles.onboardingOf(shopId),
      this.products.activeForReview(shopId, REVIEW_PRODUCT_LIMIT),
      this.prisma.shopReview.findUnique({
        where: { openShopId: shopId },
        select: { id: true, submittedAt: true, submittedFrom: true },
      }),
      this.prisma.shopReview.findMany({
        where: { shopId, decision: { not: null } },
        orderBy: { decidedAt: 'desc' },
        take: 10,
        select: {
          decision: true,
          reasons: true,
          note: true,
          submittedAt: true,
          decidedAt: true,
        },
      }),
    ]);
    await recordAuditEvent(this.prisma, {
      actor: { type: 'USER', userId: admin.id },
      action: AuditAction.PlatformShopReviewViewed,
      entityType: 'shop',
      entityId: shopId,
      shopId,
    });
    return {
      shop,
      profile,
      checklist,
      products: { activeCount: products.total, items: products.items },
      open: open
        ? {
            reviewId: open.id,
            submittedAt: open.submittedAt.toISOString(),
            resubmission: open.submittedFrom === 'CHANGES_REQUESTED',
          }
        : null,
      history: history.flatMap((row) =>
        row.decision && row.decidedAt
          ? [
              {
                decision: row.decision,
                reasons: row.reasons,
                note: row.note,
                submittedAt: row.submittedAt.toISOString(),
                decidedAt: row.decidedAt.toISOString(),
              },
            ]
          : [],
      ),
    };
  }

  /**
   * Approves (the shop goes live) or requests changes with reasons. Exactly
   * one decision per submission: a second one gets 409 review_not_pending.
   */
  async decide(
    admin: CurrentUserContext,
    shopId: string,
    input: ReviewDecisionRequest,
  ): Promise<ReviewDecisionResult> {
    if (!shopIdSchema.safeParse(shopId).success) {
      throw shopNotFound();
    }
    const reasons = [...new Set(input.reasons)];
    const note = input.note?.trim() ? input.note.trim() : null;
    const status =
      input.decision === 'APPROVED' ? 'ACTIVE' : 'CHANGES_REQUESTED';

    await this.prisma.$transaction(async (tx) => {
      const current = await lockShopStatus(tx, shopId);
      const open = await tx.shopReview.findUnique({
        where: { openShopId: shopId },
        select: { id: true },
      });
      if (current !== 'PENDING_REVIEW' || !open) {
        throw reviewNotPending();
      }
      await tx.shopReview.update({
        where: { id: open.id },
        data: {
          decision: input.decision,
          decidedByUserId: admin.id,
          decidedAt: new Date(),
          openShopId: null,
          reasons,
          note,
        },
      });
      await tx.shop.update({ where: { id: shopId }, data: { status } });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: admin.id },
        action: AuditAction.ShopReviewDecided,
        entityType: 'shop_review',
        entityId: open.id,
        shopId,
        // Reason codes only; the note's text is not copied into the audit trail.
        metadata: { decision: input.decision, reasons, note: note !== null },
      });
    });
    return { shopId, status, decision: input.decision };
  }
}
