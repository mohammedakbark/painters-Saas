import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import {
  decodeCursor,
  encodeCursor,
} from '../common/pagination/keyset-cursor.js';
import { PlatformShopsService } from '../platform-shops/platform-shops.service.js';
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
  ) {}

  /** Open submissions, oldest first. */
  async queue(query: ReviewQueueQuery): Promise<ReviewQueuePage> {
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;
    const afterDate = after ? new Date(after.sortValue) : undefined;
    if (afterDate && Number.isNaN(afterDate.getTime())) {
      throw new ProblemException(HttpStatus.BAD_REQUEST, {
        detail: 'cursor must be the nextCursor of a previous page.',
        code: 'invalid_cursor',
      });
    }
    const rows = await this.prisma.shopReview.findMany({
      where: {
        openShopId: { not: null },
        ...(after && afterDate
          ? {
              OR: [
                { submittedAt: { gt: afterDate } },
                { submittedAt: afterDate, id: { gt: after.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      select: {
        id: true,
        submittedAt: true,
        submittedFrom: true,
        shop: { select: { id: true, name: true } },
      },
    });
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items: items.map((row) => ({
        reviewId: row.id,
        shopId: row.shop.id,
        shopName: row.shop.name,
        submittedAt: row.submittedAt.toISOString(),
        resubmission: row.submittedFrom === 'CHANGES_REQUESTED',
      })),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor(last.submittedAt.toISOString(), last.id)
          : null,
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
