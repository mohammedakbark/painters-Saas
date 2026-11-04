import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import type { ShopStatus } from '../generated/prisma/enums.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ShopContext,
  shopNotFound,
} from '../shop-access/shop-access.guard.js';
import {
  PROFILE_MANAGER_ROLES,
  requireShopRole,
} from '../shop-access/shop-roles.js';
import { lockShopStatus } from '../shops/shop-edit-lock.js';
import { ShopProfileService } from '../shops/shop-profile.service.js';
import type { ShopReviewState } from './shop-review.schemas.js';

/** Statuses a shop can be submitted from (D-025, D-032). */
const SUBMITTABLE: readonly ShopStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];

/** Checklist item names used in messages. */
const ITEM_NAMES: Record<string, string> = {
  address: 'shop address',
  location: 'map location',
  support_phone: 'support mobile',
  photo: 'shop photo',
  products: '10 products',
};

/**
 * The owner's side of the shop review (PLT-002): submit a complete shop,
 * withdraw a submission to edit it again (D-033). Status changes run under a
 * row lock on the shop, so they serialize with profile edits and decisions.
 */
@Injectable()
export class ShopReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ShopProfileService,
  ) {}

  async state(shop: ShopContext): Promise<ShopReviewState> {
    const [row, checklist, open, last] = await Promise.all([
      this.prisma.shop.findUnique({
        where: { id: shop.shopId },
        select: { status: true },
      }),
      this.profiles.onboardingOf(shop.shopId),
      this.prisma.shopReview.findUnique({
        where: { openShopId: shop.shopId },
        select: { submittedAt: true },
      }),
      this.prisma.shopReview.findFirst({
        where: {
          shopId: shop.shopId,
          decision: { in: ['APPROVED', 'CHANGES_REQUESTED'] },
        },
        orderBy: { decidedAt: 'desc' },
        select: { decision: true, reasons: true, note: true, decidedAt: true },
      }),
    ]);
    if (!row) {
      throw shopNotFound();
    }
    const missing = checklist.items
      .filter((item) => !item.done)
      .map((item) => item.key);
    return {
      status: row.status,
      missing,
      canSubmit: SUBMITTABLE.includes(row.status) && missing.length === 0,
      open: open ? { submittedAt: open.submittedAt.toISOString() } : null,
      lastDecision:
        last?.decision === 'APPROVED' || last?.decision === 'CHANGES_REQUESTED'
          ? {
              decision: last.decision,
              reasons: last.reasons,
              note: last.note,
              decidedAt: (last.decidedAt ?? new Date(0)).toISOString(),
            }
          : null,
    };
  }

  async submit(
    user: CurrentUserContext,
    shop: ShopContext,
  ): Promise<ShopReviewState> {
    requireShopRole(shop, PROFILE_MANAGER_ROLES);
    try {
      await this.prisma.$transaction(async (tx) => {
        const status = await lockShopStatus(tx, shop.shopId);
        if (!SUBMITTABLE.includes(status)) {
          throw new ProblemException(HttpStatus.CONFLICT, {
            detail:
              status === 'PENDING_REVIEW'
                ? 'Your shop is already waiting for review.'
                : 'Your shop is already live.',
            code: 'review_not_allowed',
          });
        }
        const checklist = await this.profiles.onboardingOf(shop.shopId);
        const missing = checklist.items.filter((item) => !item.done);
        if (missing.length > 0) {
          throw new ProblemException(HttpStatus.CONFLICT, {
            detail: `Complete these first: ${missing
              .map((item) => ITEM_NAMES[item.key] ?? item.key)
              .join(', ')}.`,
            code: 'onboarding_incomplete',
          });
        }
        const review = await tx.shopReview.create({
          data: {
            shopId: shop.shopId,
            openShopId: shop.shopId,
            submittedFrom: status,
            submittedByUserId: user.id,
          },
          select: { id: true },
        });
        await tx.shop.update({
          where: { id: shop.shopId },
          data: { status: 'PENDING_REVIEW' },
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.ShopReviewSubmitted,
          entityType: 'shop_review',
          entityId: review.id,
          shopId: shop.shopId,
          metadata: { resubmission: status === 'CHANGES_REQUESTED' },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ProblemException(HttpStatus.CONFLICT, {
          detail: 'Your shop is already waiting for review.',
          code: 'review_not_allowed',
        });
      }
      throw error;
    }
    return this.state(shop);
  }

  /** Back to the status the shop was submitted from, so the owner can edit. */
  async withdraw(
    user: CurrentUserContext,
    shop: ShopContext,
  ): Promise<ShopReviewState> {
    requireShopRole(shop, PROFILE_MANAGER_ROLES);
    await this.prisma.$transaction(async (tx) => {
      await lockShopStatus(tx, shop.shopId);
      const open = await tx.shopReview.findUnique({
        where: { openShopId: shop.shopId },
        select: { id: true, submittedFrom: true },
      });
      if (!open) {
        throw new ProblemException(HttpStatus.CONFLICT, {
          detail: 'Your shop is not waiting for review.',
          code: 'review_not_pending',
        });
      }
      await tx.shopReview.update({
        where: { id: open.id },
        data: {
          decision: 'WITHDRAWN',
          decidedByUserId: user.id,
          decidedAt: new Date(),
          openShopId: null,
        },
      });
      await tx.shop.update({
        where: { id: shop.shopId },
        data: { status: open.submittedFrom },
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: user.id },
        action: AuditAction.ShopReviewWithdrawn,
        entityType: 'shop_review',
        entityId: open.id,
        shopId: shop.shopId,
      });
    });
    return this.state(shop);
  }
}
