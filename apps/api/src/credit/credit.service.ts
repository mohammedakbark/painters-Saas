import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { lockBill } from '../bills/bill-ledger.js';
import { customerNotFound } from '../bills/bills.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';
import {
  requireAnyShopPermission,
  requireShopPermission,
} from '../shop-access/shop-permissions.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import { creditOwed, readCredit } from './credit-ledger.js';
import {
  CREDIT_EVENTS_PAGE_SIZE,
  type Credit,
  type CreditChangeRequest,
  type CreditQuery,
  type IdCheckRequest,
} from './credit.schemas.js';

const memberName = (user: {
  displayName: string | null;
  phone: string | null;
}) => user.displayName ?? user.phone ?? 'A shop member';

const requestReused = () =>
  problem(
    HttpStatus.CONFLICT,
    'request_id_reused',
    'This request was already used for something else.',
  );

/**
 * Shop credit (CRD-001, D-064): each shop's own ID check, approval and limit
 * for one customer. Keyed by the verified shop (`ShopContext`), so a shop
 * never reads or changes another shop's credit. Reading needs credit or
 * money-figure permission; changing needs `credit.manage`.
 */
@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  async credit(
    shop: ShopContext,
    customerId: string,
    query: CreditQuery,
  ): Promise<Credit> {
    requireAnyShopPermission(shop, ['credit.manage', 'reports.view']);
    const customer = await this.prisma.shopCustomer.findFirst({
      where: { id: customerId, shopId: shop.shopId, mergedIntoId: null },
      select: { userId: true },
    });
    if (!customer) throw customerNotFound();
    const where = { shopId: shop.shopId, customerId };
    const by = { select: { displayName: true, phone: true } } as const;
    const [credit, owedPaise, idCheck, events] = await Promise.all([
      readCredit(this.prisma, shop.shopId, customerId),
      creditOwed(this.prisma, shop.shopId, customerId),
      this.prisma.creditEvent.findFirst({
        where: { ...where, kind: 'ID_CHECKED' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { idType: true, idLast4: true, createdAt: true, createdBy: by },
      }),
      this.prisma.creditEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * CREDIT_EVENTS_PAGE_SIZE,
        take: CREDIT_EVENTS_PAGE_SIZE + 1,
        select: {
          id: true,
          kind: true,
          limitPaise: true,
          previousPaise: true,
          owedPaise: true,
          idType: true,
          idLast4: true,
          reason: true,
          createdAt: true,
          order: { select: { id: true, number: true } },
          createdBy: by,
        },
      }),
    ]);
    const eligible = customer.userId !== null;
    return {
      customerId,
      status: credit.status,
      limitPaise: credit.limitPaise,
      owedPaise,
      leftPaise:
        credit.limitPaise === null ? null : credit.limitPaise - owedPaise,
      idCheck:
        idCheck?.idType && idCheck.idLast4
          ? {
              type: idCheck.idType,
              last4: idCheck.idLast4,
              checkedBy: memberName(idCheck.createdBy),
              checkedAt: idCheck.createdAt.toISOString(),
            }
          : null,
      eligible,
      ineligibleReason: eligible ? null : 'no_app_account',
      events: {
        items: events.slice(0, CREDIT_EVENTS_PAGE_SIZE).map((event) => ({
          id: event.id,
          kind: event.kind,
          limitPaise: event.limitPaise,
          previousPaise: event.previousPaise,
          owedPaise: event.owedPaise,
          idType: event.idType,
          idLast4: event.idLast4,
          reason: event.reason,
          order: event.order,
          by: memberName(event.createdBy),
          at: event.createdAt.toISOString(),
        })),
        page: query.page,
        hasMore: events.length > CREDIT_EVENTS_PAGE_SIZE,
      },
    };
  }

  /** Records that the shop saw the original ID (type and last 4 only). */
  checkId(
    user: CurrentUserContext,
    shop: ShopContext,
    customerId: string,
    input: IdCheckRequest,
  ): Promise<Credit> {
    return this.change(
      user,
      shop,
      customerId,
      input.clientRequestId,
      async (tx) => {
        const event = await tx.creditEvent.create({
          data: {
            shopId: shop.shopId,
            customerId,
            kind: 'ID_CHECKED',
            idType: input.type,
            idLast4: input.last4,
            clientRequestId: input.clientRequestId,
            createdByUserId: user.id,
          },
          select: { id: true },
        });
        return {
          id: event.id,
          kind: 'ID_CHECKED' as const,
          action: AuditAction.CreditIdChecked,
          // The document type only, never its digits.
          metadata: { customerId, type: input.type },
        };
      },
    );
  }

  /** Gives credit, changes the limit or stops credit (D-064 rule 5). */
  changeCredit(
    user: CurrentUserContext,
    shop: ShopContext,
    customerId: string,
    input: CreditChangeRequest,
  ): Promise<Credit> {
    return this.change(
      user,
      shop,
      customerId,
      input.clientRequestId,
      async (tx) => {
        const current = await readCredit(tx, shop.shopId, customerId);
        let data: Prisma.CreditEventUncheckedCreateInput;
        let action: string;
        if (input.action === 'stop') {
          if (current.status !== 'active') throw creditNotActive();
          data = {
            shopId: shop.shopId,
            customerId,
            kind: 'STOPPED',
            previousPaise: current.limitPaise,
            reason: input.reason,
            clientRequestId: input.clientRequestId,
            createdByUserId: user.id,
          };
          action = AuditAction.CreditStopped;
        } else if (input.action === 'change') {
          if (current.status !== 'active') throw creditNotActive();
          data = {
            shopId: shop.shopId,
            customerId,
            kind: 'LIMIT_CHANGED',
            limitPaise: input.limitPaise,
            previousPaise: current.limitPaise,
            reason: input.reason,
            clientRequestId: input.clientRequestId,
            createdByUserId: user.id,
          };
          action = AuditAction.CreditLimitChanged;
        } else {
          if (current.status === 'active') {
            throw problem(
              HttpStatus.CONFLICT,
              'credit_already_active',
              'This customer already has credit. Change the limit instead.',
            );
          }
          const customer = await tx.shopCustomer.findUniqueOrThrow({
            where: { id: customerId },
            select: { userId: true },
          });
          if (customer.userId === null) {
            throw problem(
              HttpStatus.CONFLICT,
              'credit_needs_app_account',
              'Credit needs the customer to use the app with this mobile number and be connected to your shop.',
            );
          }
          const checked = await tx.creditEvent.findFirst({
            where: { shopId: shop.shopId, customerId, kind: 'ID_CHECKED' },
            select: { id: true },
          });
          if (!checked) {
            throw problem(
              HttpStatus.CONFLICT,
              'credit_needs_id_check',
              'Check the customer’s ID before giving credit.',
            );
          }
          data = {
            shopId: shop.shopId,
            customerId,
            kind: 'GIVEN',
            limitPaise: input.limitPaise,
            reason: input.reason,
            clientRequestId: input.clientRequestId,
            createdByUserId: user.id,
          };
          action = AuditAction.CreditGiven;
        }
        const event = await tx.creditEvent.create({
          data,
          select: { id: true },
        });
        return {
          id: event.id,
          kind: data.kind,
          action,
          // Limits only, never the reason text.
          metadata: {
            customerId,
            limitPaise: data.limitPaise ?? null,
            previousPaise: data.previousPaise ?? null,
          },
        };
      },
    );
  }

  /**
   * One credit change: locks the customer's bill row, skips a repeated
   * request, writes the event and its audit record in one transaction.
   */
  private async change(
    user: CurrentUserContext,
    shop: ShopContext,
    customerId: string,
    clientRequestId: string,
    write: (tx: Prisma.TransactionClient) => Promise<{
      id: string;
      kind: string;
      action: string;
      metadata: Prisma.InputJsonObject;
    }>,
  ): Promise<Credit> {
    requireShopPermission(shop, 'credit.manage');
    try {
      await this.prisma.$transaction(async (tx) => {
        if (!(await lockBill(tx, shop.shopId, customerId))) {
          throw customerNotFound();
        }
        const merged = await tx.shopCustomer.findUniqueOrThrow({
          where: { id: customerId },
          select: { mergedIntoId: true },
        });
        if (merged.mergedIntoId !== null) throw customerNotFound();
        const repeat = await tx.creditEvent.findFirst({
          where: { shopId: shop.shopId, clientRequestId },
          select: { customerId: true },
        });
        if (repeat) {
          if (repeat.customerId !== customerId) throw requestReused();
          return;
        }
        const event = await write(tx);
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: event.action as AuditAction,
          entityType: 'credit_event',
          entityId: event.id,
          shopId: shop.shopId,
          metadata: event.metadata,
        });
      });
    } catch (error) {
      // Two identical requests at once: the second finds the first's event.
      if (!isUniqueViolation(error)) throw error;
    }
    return this.credit(shop, customerId, { page: 1 });
  }
}

const creditNotActive = () =>
  problem(
    HttpStatus.CONFLICT,
    'credit_not_active',
    'This customer has no credit now.',
  );
