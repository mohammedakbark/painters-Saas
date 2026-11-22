import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import type { OrderStatus, Prisma } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type CreateCustomerSiteRequest,
  type CustomerSite,
  type CustomerSiteList,
  type CustomerSiteListQuery,
  MAX_ACTIVE_SITES,
  MAX_SPEND_ORDERS,
  type SiteSpend,
  type SiteSpendTotals,
  type UpdateCustomerSiteRequest,
} from './customer-sites.schemas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SITE_SELECT = {
  id: true,
  name: true,
  ownerName: true,
  address: true,
  latitude: true,
  longitude: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.CustomerSiteSelect;

type SiteRow = Prisma.CustomerSiteGetPayload<{ select: typeof SITE_SELECT }>;

const NO_SPEND: SiteSpendTotals = {
  totalPaise: 0,
  shopCount: 0,
  orderCount: 0,
  lastOrderAt: null,
};

/**
 * Orders that count towards a site's spend (CUS-007): the caller's own
 * orders for the site, from any shop, except cancelled ones. Keyed by the
 * caller through `shop_customers.user_id` as well as the site.
 */
function spendWhere(userId: string, siteIds: string[]): Prisma.OrderWhereInput {
  return {
    customerSiteId: { in: siteIds },
    customer: { userId },
    status: { not: 'CANCELLED' },
  };
}

type CountedStatus = SiteSpend['shops'][number]['orders'][number]['status'];

/** The spend query leaves cancelled orders out (see `spendWhere`). */
function countedStatus(status: OrderStatus): CountedStatus {
  if (status === 'CANCELLED') throw new Error('Cancelled orders are not spend');
  return status;
}

function toSite(row: SiteRow, spend: SiteSpendTotals = NO_SPEND): CustomerSite {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.ownerName,
    address: row.address,
    pin: {
      latitude: row.latitude.toNumber(),
      longitude: row.longitude.toNumber(),
    },
    archived: row.archivedAt !== null,
    spend,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const painterOnly = () =>
  new ProblemException(HttpStatus.FORBIDDEN, {
    detail:
      'Sites are for painters. Choose Painter/Contractor in your profile first.',
    code: 'painter_only',
  });

const siteNotFound = () =>
  new ProblemException(HttpStatus.NOT_FOUND, {
    detail: 'This site was not found.',
    code: 'site_not_found',
  });

const nameTaken = () =>
  new ProblemException(HttpStatus.CONFLICT, {
    detail: 'You already have a site with this name.',
    code: 'site_name_taken',
    errors: [
      { path: 'name', message: 'You already have a site with this name.' },
    ],
  });

/**
 * A painter's own work sites (CUS-005, D-049). Every query is keyed by the
 * verified caller, so one person never sees another's sites. Painters only
 * (D-036). Sites are archived and restored, never deleted (owner,
 * 2026-11-20). Audit events hold field names, never the address or pin.
 */
@Injectable()
export class CustomerSitesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: CurrentUserContext,
    query: CustomerSiteListQuery,
  ): Promise<CustomerSiteList> {
    await this.requirePainter(user);
    const rows = await this.prisma.customerSite.findMany({
      where: {
        userId: user.id,
        archivedAt: query.archived ? { not: null } : null,
      },
      orderBy: query.archived ? { archivedAt: 'desc' } : { name: 'asc' },
      select: SITE_SELECT,
    });
    const spend = await this.spendTotals(
      user,
      rows.map((row) => row.id),
    );
    return { items: rows.map((row) => toSite(row, spend.get(row.id))) };
  }

  async get(user: CurrentUserContext, siteId: string): Promise<CustomerSite> {
    await this.requirePainter(user);
    const row = await this.own(this.prisma, user, siteId);
    const spend = await this.spendTotals(user, [row.id]);
    return toSite(row, spend.get(row.id));
  }

  /**
   * A site's spend by shop (CUS-007, D-008): exact totals per shop and the
   * latest orders. Archived sites keep their history.
   */
  async spend(user: CurrentUserContext, siteId: string): Promise<SiteSpend> {
    await this.requirePainter(user);
    const site = await this.own(this.prisma, user, siteId);
    const where = spendWhere(user.id, [site.id]);
    const [groups, orders] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['shopId'],
        where,
        _sum: { totalPaise: true },
        _count: { _all: true },
        _max: { placedAt: true },
      }),
      this.prisma.order.findMany({
        where,
        orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
        take: MAX_SPEND_ORDERS,
        select: {
          id: true,
          number: true,
          placedAt: true,
          status: true,
          totalPaise: true,
          shop: { select: { id: true, name: true } },
        },
      }),
    ]);
    const names = new Map(orders.map((order) => [order.shop.id, order.shop]));
    const missing = groups
      .map((group) => group.shopId)
      .filter((shopId) => !names.has(shopId));
    if (missing.length > 0) {
      const shops = await this.prisma.shop.findMany({
        where: { id: { in: missing } },
        select: { id: true, name: true },
      });
      for (const shop of shops) names.set(shop.id, shop);
    }
    // The shop ordered from most recently first.
    const latest = (group: (typeof groups)[number]) =>
      group._max.placedAt?.getTime() ?? 0;
    const shops = [...groups]
      .sort((a, b) => latest(b) - latest(a))
      .map((group) => ({
        shop: names.get(group.shopId) ?? { id: group.shopId, name: 'Shop' },
        totalPaise: group._sum.totalPaise ?? 0,
        orderCount: group._count._all,
        orders: orders
          .filter((order) => order.shop.id === group.shopId)
          .map((order) => ({
            id: order.id,
            number: order.number,
            placedAt: order.placedAt.toISOString(),
            status: countedStatus(order.status),
            totalPaise: order.totalPaise,
          })),
      }));
    const orderCount = shops.reduce((sum, shop) => sum + shop.orderCount, 0);
    return {
      site: {
        id: site.id,
        name: site.name,
        archived: site.archivedAt !== null,
      },
      totalPaise: shops.reduce((sum, shop) => sum + shop.totalPaise, 0),
      shops,
      ordersTruncated: orderCount > orders.length,
    };
  }

  private async withSpend(
    user: CurrentUserContext,
    site: CustomerSite,
  ): Promise<CustomerSite> {
    const spend = await this.spendTotals(user, [site.id]);
    return { ...site, spend: spend.get(site.id) ?? NO_SPEND };
  }

  /** Spend totals per site, from grouped order totals (never stored). */
  private async spendTotals(
    user: CurrentUserContext,
    siteIds: string[],
  ): Promise<Map<string, SiteSpendTotals>> {
    const totals = new Map<string, SiteSpendTotals>();
    if (siteIds.length === 0) return totals;
    const groups = await this.prisma.order.groupBy({
      by: ['customerSiteId', 'shopId'],
      where: spendWhere(user.id, siteIds),
      _sum: { totalPaise: true },
      _count: { _all: true },
      _max: { placedAt: true },
    });
    for (const group of groups) {
      if (group.customerSiteId === null) continue;
      const current = totals.get(group.customerSiteId) ?? NO_SPEND;
      const last = group._max.placedAt?.toISOString() ?? null;
      totals.set(group.customerSiteId, {
        totalPaise: current.totalPaise + (group._sum.totalPaise ?? 0),
        shopCount: current.shopCount + 1,
        orderCount: current.orderCount + group._count._all,
        lastOrderAt:
          current.lastOrderAt === null ||
          (last !== null && last > current.lastOrderAt)
            ? last
            : current.lastOrderAt,
      });
    }
    return totals;
  }

  async create(
    user: CurrentUserContext,
    input: CreateCustomerSiteRequest,
  ): Promise<CustomerSite> {
    await this.requirePainter(user);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const active = await tx.customerSite.count({
          where: { userId: user.id, archivedAt: null },
        });
        if (active >= MAX_ACTIVE_SITES) {
          throw new ProblemException(HttpStatus.CONFLICT, {
            detail: `You can have up to ${MAX_ACTIVE_SITES} sites. Archive finished sites first.`,
            code: 'site_limit_reached',
          });
        }
        const row = await tx.customerSite.create({
          data: {
            userId: user.id,
            name: input.name,
            ownerName: input.ownerName ?? null,
            address: input.address,
            latitude: input.pin.latitude,
            longitude: input.pin.longitude,
          },
          select: SITE_SELECT,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.CustomerSiteCreated,
          entityType: 'customer_site',
          entityId: row.id,
        });
        return toSite(row);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  }

  async update(
    user: CurrentUserContext,
    siteId: string,
    input: UpdateCustomerSiteRequest,
  ): Promise<CustomerSite> {
    await this.requirePainter(user);
    try {
      const site = await this.prisma.$transaction(async (tx) => {
        const current = await this.own(tx, user, siteId);
        if (current.archivedAt !== null) {
          throw new ProblemException(HttpStatus.CONFLICT, {
            detail: 'Restore this site before changing it.',
            code: 'site_archived',
          });
        }
        const row = await tx.customerSite.update({
          where: { id: siteId },
          data: {
            ...(input.name === undefined ? {} : { name: input.name }),
            ...(input.ownerName === undefined
              ? {}
              : { ownerName: input.ownerName }),
            ...(input.address === undefined ? {} : { address: input.address }),
            ...(input.pin === undefined
              ? {}
              : {
                  latitude: input.pin.latitude,
                  longitude: input.pin.longitude,
                }),
          },
          select: SITE_SELECT,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.CustomerSiteUpdated,
          entityType: 'customer_site',
          entityId: siteId,
          metadata: {
            fields: Object.keys(input).filter(
              (key) => input[key as keyof typeof input] !== undefined,
            ),
          },
        });
        return toSite(row);
      });
      return await this.withSpend(user, site);
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  }

  /** Archives (true) or restores (false) a site. Repeating is fine. */
  async setArchived(
    user: CurrentUserContext,
    siteId: string,
    archived: boolean,
  ): Promise<CustomerSite> {
    await this.requirePainter(user);
    try {
      const site = await this.prisma.$transaction(async (tx) => {
        const current = await this.own(tx, user, siteId);
        if ((current.archivedAt !== null) === archived) return toSite(current);
        if (!archived) {
          const active = await tx.customerSite.count({
            where: { userId: user.id, archivedAt: null },
          });
          if (active >= MAX_ACTIVE_SITES) {
            throw new ProblemException(HttpStatus.CONFLICT, {
              detail: `You can have up to ${MAX_ACTIVE_SITES} sites. Archive finished sites first.`,
              code: 'site_limit_reached',
            });
          }
        }
        const row = await tx.customerSite.update({
          where: { id: siteId },
          data: { archivedAt: archived ? new Date() : null },
          select: SITE_SELECT,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: archived
            ? AuditAction.CustomerSiteArchived
            : AuditAction.CustomerSiteRestored,
          entityType: 'customer_site',
          entityId: siteId,
        });
        return toSite(row);
      });
      return await this.withSpend(user, site);
    } catch (error) {
      // Restoring next to an active site with the same name.
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  }

  private async requirePainter(user: CurrentUserContext): Promise<void> {
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { customerType: true },
    });
    if (row?.customerType !== 'PAINTER') throw painterOnly();
  }

  private async own(
    client: Pick<Prisma.TransactionClient, 'customerSite'>,
    user: CurrentUserContext,
    siteId: string,
  ): Promise<SiteRow> {
    const row = UUID.test(siteId)
      ? await client.customerSite.findFirst({
          where: { id: siteId, userId: user.id },
          select: SITE_SELECT,
        })
      : null;
    if (!row) throw siteNotFound();
    return row;
  }
}
