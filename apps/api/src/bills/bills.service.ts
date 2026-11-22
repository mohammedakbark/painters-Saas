import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { Prisma } from '../generated/prisma/client.js';
import type { CustomerKind } from '../generated/prisma/enums.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';
import {
  requireAnyShopPermission,
  requireShopPermission,
} from '../shop-access/shop-permissions.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import { billBalance, lockBill, settleBill } from './bill-ledger.js';
import {
  BILL_ENTRIES_PAGE_SIZE,
  type Bill,
  type BillListPage,
  type BillListQuery,
  type BillMoneyRequest,
  type BillQuery,
} from './bills.schemas.js';

export const customerNotFound = () =>
  problem(HttpStatus.NOT_FOUND, 'customer_not_found', 'Customer not found.');

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * Running bills (BIL-001, D-062): each shop's bill with each of its
 * customers. Everything is keyed by the verified shop (`ShopContext`), so a
 * shop never reads or changes another shop's bills. Reading needs the
 * payments or money-figures permission; recording needs payments (D-056).
 */
@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(shop: ShopContext, query: BillListQuery): Promise<BillListPage> {
    requireAnyShopPermission(shop, ['orders.payments', 'reports.view']);
    const conditions: Prisma.Sql[] = [
      Prisma.sql`c.shop_id = ${shop.shopId}::uuid`,
    ];
    if (query.kind) {
      conditions.push(Prisma.sql`c.kind = ${query.kind}::customer_kind`);
    }
    const q = query.q?.trim();
    if (q) {
      const digits = q.replace(/[^0-9]/g, '');
      const name = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      conditions.push(
        digits.length >= 4
          ? Prisma.sql`(c.name ILIKE ${name} OR c.phone LIKE ${`%${digits}%`})`
          : Prisma.sql`c.name ILIKE ${name}`,
      );
    }
    const having =
      query.status === 'owing'
        ? Prisma.sql`HAVING sum(e.amount_paise) > 0`
        : query.status === 'shop_owes'
          ? Prisma.sql`HAVING sum(e.amount_paise) < 0`
          : query.status === 'settled'
            ? Prisma.sql`HAVING sum(e.amount_paise) = 0`
            : Prisma.empty;
    const balances = Prisma.sql`
      SELECT c.id, c.name, c.phone, c.kind,
             sum(e.amount_paise)::int AS balance,
             max(e.created_at) AS last_entry_at
      FROM shop_customers c
      JOIN bill_entries e ON e.shop_id = c.shop_id AND e.customer_id = c.id
      WHERE ${Prisma.join(conditions, ' AND ')}
      GROUP BY c.id
      ${having}`;
    const [rows, counts] = await Promise.all([
      this.prisma.$queryRaw<
        {
          id: string;
          name: string;
          phone: string;
          kind: CustomerKind;
          balance: number;
          last_entry_at: Date;
        }[]
      >`
        ${balances}
        ORDER BY sum(e.amount_paise) DESC, c.name, c.id
        LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
      this.prisma.$queryRaw<
        { total: number; owing: number; shop_owes: number }[]
      >`
        SELECT count(*)::int AS total,
               coalesce(sum(balance) FILTER (WHERE balance > 0), 0)::int AS owing,
               coalesce(-sum(balance) FILTER (WHERE balance < 0), 0)::int AS shop_owes
        FROM (${balances}) b`,
    ]);
    const count = counts[0] ?? { total: 0, owing: 0, shop_owes: 0 };
    return {
      items: rows.map((row) => ({
        customer: {
          id: row.id,
          name: row.name,
          phone: row.phone,
          kind: row.kind,
        },
        balancePaise: row.balance,
        lastEntryAt: row.last_entry_at.toISOString(),
      })),
      totals: { owingPaise: count.owing, shopOwesPaise: count.shop_owes },
      total: count.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async bill(
    shop: ShopContext,
    customerId: string,
    query: BillQuery,
  ): Promise<Bill> {
    requireAnyShopPermission(shop, ['orders.payments', 'reports.view']);
    const customer = await this.prisma.shopCustomer.findFirst({
      where: { id: customerId, shopId: shop.shopId, mergedIntoId: null },
      select: { id: true },
    });
    if (!customer) throw customerNotFound();
    const where = { shopId: shop.shopId, customerId };
    const [balancePaise, sites, entries] = await Promise.all([
      billBalance(this.prisma, shop.shopId, customerId),
      // What each site was billed: the orders' totals now (charges plus
      // adjustments), for orders on the bill.
      this.prisma.$queryRaw<
        { label: string; billed: number; orders: number }[]
      >`
        SELECT o.site_label AS label, sum(o.total_paise)::int AS billed,
               count(*)::int AS orders
        FROM orders o
        WHERE o.shop_id = ${shop.shopId}::uuid
          AND o.customer_id = ${customerId}::uuid
          AND o.charged_at IS NOT NULL AND o.site_label IS NOT NULL
        GROUP BY o.site_label
        ORDER BY max(o.charged_at) DESC`,
      this.prisma.billEntry.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * BILL_ENTRIES_PAGE_SIZE,
        take: BILL_ENTRIES_PAGE_SIZE + 1,
        select: {
          id: true,
          kind: true,
          amountPaise: true,
          createdAt: true,
          method: true,
          note: true,
          order: { select: { id: true, number: true, siteLabel: true } },
        },
      }),
    ]);
    return {
      customerId,
      balancePaise,
      sites: sites.map((site) => ({
        label: site.label,
        billedPaise: site.billed,
        orderCount: site.orders,
      })),
      entries: {
        items: entries.slice(0, BILL_ENTRIES_PAGE_SIZE).map((entry) => ({
          id: entry.id,
          kind: entry.kind,
          amountPaise: entry.amountPaise,
          createdAt: entry.createdAt.toISOString(),
          order: entry.order,
          method: entry.method,
          note: entry.note,
        })),
        page: query.page,
        hasMore: entries.length > BILL_ENTRIES_PAGE_SIZE,
      },
    };
  }

  /** A payment against the running bill, at most what the customer owes. */
  pay(
    user: CurrentUserContext,
    shop: ShopContext,
    customerId: string,
    input: BillMoneyRequest,
  ): Promise<Bill> {
    return this.recordMoney(user, shop, customerId, input, 'PAYMENT');
  }

  /** Money paid back, at most what the shop owes (after a return). */
  refund(
    user: CurrentUserContext,
    shop: ShopContext,
    customerId: string,
    input: BillMoneyRequest,
  ): Promise<Bill> {
    return this.recordMoney(user, shop, customerId, input, 'REFUND');
  }

  private async recordMoney(
    user: CurrentUserContext,
    shop: ShopContext,
    customerId: string,
    input: BillMoneyRequest,
    kind: 'PAYMENT' | 'REFUND',
  ): Promise<Bill> {
    requireShopPermission(shop, 'orders.payments');
    try {
      await this.prisma.$transaction(async (tx) => {
        if (!(await lockBill(tx, shop.shopId, customerId))) {
          throw customerNotFound();
        }
        // A repeated request (same key) records nothing more.
        const repeat = await tx.billEntry.findFirst({
          where: {
            shopId: shop.shopId,
            clientRequestId: input.clientRequestId,
          },
          select: { customerId: true, kind: true },
        });
        if (repeat) {
          if (repeat.customerId !== customerId || repeat.kind !== kind) {
            throw problem(
              HttpStatus.CONFLICT,
              'request_id_reused',
              'This request was already used for something else.',
            );
          }
          return;
        }
        const balance = await billBalance(tx, shop.shopId, customerId);
        const limit = kind === 'PAYMENT' ? balance : -balance;
        if (input.amountPaise > limit) {
          throw kind === 'PAYMENT'
            ? problem(
                HttpStatus.CONFLICT,
                limit <= 0 ? 'bill_nothing_owed' : 'payment_exceeds_balance',
                limit <= 0
                  ? 'This customer owes nothing now.'
                  : `The customer owes ${rupees(limit)}. Enter at most that.`,
                'amountPaise',
              )
            : problem(
                HttpStatus.CONFLICT,
                limit <= 0 ? 'bill_nothing_owed' : 'refund_exceeds_owed',
                limit <= 0
                  ? 'The shop owes this customer nothing now.'
                  : `The shop owes ${rupees(limit)}. Enter at most that.`,
                'amountPaise',
              );
        }
        const entry = await tx.billEntry.create({
          data: {
            shopId: shop.shopId,
            customerId,
            kind,
            amountPaise:
              kind === 'PAYMENT' ? -input.amountPaise : input.amountPaise,
            method: input.method,
            note: input.note ?? null,
            clientRequestId: input.clientRequestId,
            createdByUserId: user.id,
          },
          select: { id: true },
        });
        await settleBill(tx, shop.shopId, customerId, {
          userId: user.id,
          method: input.method,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action:
            kind === 'PAYMENT'
              ? AuditAction.BillPaymentRecorded
              : AuditAction.BillRefundRecorded,
          entityType: 'bill_entry',
          entityId: entry.id,
          shopId: shop.shopId,
          // The amount and method, never the note.
          metadata: {
            customerId,
            amountPaise: input.amountPaise,
            method: input.method,
          },
        });
      });
    } catch (error) {
      // Two identical requests at once: the second finds the first's entry.
      if (!isUniqueViolation(error)) throw error;
    }
    return this.bill(shop, customerId, { page: 1 });
  }
}
