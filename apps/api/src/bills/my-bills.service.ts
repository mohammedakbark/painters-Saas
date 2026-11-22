import { HttpStatus, Injectable } from '@nestjs/common';
import type { CurrentUserContext } from '../auth/current-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import { BILL_ENTRIES_PAGE_SIZE } from './bills.schemas.js';
import {
  MY_BILLS_MAX_SHOPS,
  type MyBill,
  type MyBillList,
  type MyBillQuery,
} from './my-bills.schemas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const billNotFound = () =>
  problem(HttpStatus.NOT_FOUND, 'bill_not_found', 'No bill with this shop.');

/**
 * "What I owe" in the Customer App (BIL-003, D-062): the caller's own
 * running bills, found only through their verified account
 * (`shop_customers.user_id`). A shop's record of the same mobile that is not
 * connected to the account is not theirs to see (D-054). Read only.
 */
@Injectable()
export class MyBillsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUserContext): Promise<MyBillList> {
    const rows = await this.prisma.$queryRaw<
      {
        shop_id: string;
        shop_name: string;
        balance: number;
        last_entry_at: Date;
      }[]
    >`
      SELECT s.id AS shop_id, s.name AS shop_name,
             sum(e.amount_paise)::int AS balance,
             max(e.created_at) AS last_entry_at
      FROM shop_customers c
      JOIN bill_entries e ON e.shop_id = c.shop_id AND e.customer_id = c.id
      JOIN shops s ON s.id = c.shop_id
      WHERE c.user_id = ${user.id}::uuid
      GROUP BY s.id
      ORDER BY sum(e.amount_paise) DESC, max(e.created_at) DESC
      LIMIT ${MY_BILLS_MAX_SHOPS}`;
    return {
      items: rows.map((row) => ({
        shop: { id: row.shop_id, name: row.shop_name },
        balancePaise: row.balance,
        lastEntryAt: row.last_entry_at.toISOString(),
      })),
    };
  }

  async bill(
    user: CurrentUserContext,
    shopId: string,
    query: MyBillQuery,
  ): Promise<MyBill> {
    const customer = UUID.test(shopId)
      ? await this.prisma.shopCustomer.findFirst({
          where: { shopId, userId: user.id },
          select: { id: true, shop: { select: { id: true, name: true } } },
        })
      : null;
    if (!customer) throw billNotFound();
    const where = { shopId, customerId: customer.id };
    const [sum, sites, entries] = await Promise.all([
      this.prisma.billEntry.aggregate({ where, _sum: { amountPaise: true } }),
      this.prisma.$queryRaw<
        { label: string; billed: number; orders: number }[]
      >`
        SELECT o.site_label AS label, sum(o.total_paise)::int AS billed,
               count(*)::int AS orders
        FROM orders o
        WHERE o.shop_id = ${shopId}::uuid
          AND o.customer_id = ${customer.id}::uuid
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
          order: { select: { id: true, number: true, siteLabel: true } },
        },
      }),
    ]);
    return {
      shop: customer.shop,
      balancePaise: sum._sum.amountPaise ?? 0,
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
        })),
        page: query.page,
        hasMore: entries.length > BILL_ENTRIES_PAGE_SIZE,
      },
    };
  }
}
