import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { parseIndianMobile } from '../common/phone/indian-mobile.js';
import type { Prisma } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';
import { ORDER_ROLES, requireShopRole } from '../shop-access/shop-roles.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import {
  type CreateCustomerRequest,
  type CreateSiteRequest,
  CUSTOMER_LIMITS,
  type CustomerDetail,
  type CustomerListPage,
  type CustomerListQuery,
  type SiteResponse,
  type UpdateCustomerRequest,
  type UpdateSiteRequest,
} from './customers.schemas.js';

export const customerNotFound = () =>
  problem(HttpStatus.NOT_FOUND, 'customer_not_found', 'Customer not found.');
export const siteNotFound = () =>
  problem(HttpStatus.NOT_FOUND, 'site_not_found', 'Site not found.');

const SITE_SELECT = {
  id: true,
  name: true,
  ownerName: true,
  address: true,
  latitude: true,
  longitude: true,
  archivedAt: true,
} as const satisfies Prisma.ShopSiteSelect;

type SiteRow = Prisma.ShopSiteGetPayload<{ select: typeof SITE_SELECT }>;

function toSite(row: SiteRow): SiteResponse {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.ownerName,
    address: row.address,
    pin:
      row.latitude !== null && row.longitude !== null
        ? {
            latitude: row.latitude.toNumber(),
            longitude: row.longitude.toNumber(),
          }
        : null,
    archived: row.archivedAt !== null,
  };
}

function phoneOrError(input: string): string {
  const phone = parseIndianMobile(input);
  if (!phone) {
    throw problem(
      HttpStatus.BAD_REQUEST,
      'phone_invalid',
      'Enter a 10-digit Indian mobile number.',
      'phone',
    );
  }
  return phone;
}

const phoneTaken = () =>
  problem(
    HttpStatus.CONFLICT,
    'customer_phone_taken',
    'This mobile number is already in your customers.',
    'phone',
  );

/**
 * The shop's customers and painters' sites (ORD-004, D-054, D-055). Records
 * are private to the shop; a record the shop makes is never linked to an app
 * account automatically. Every shop member may record customers. Audit
 * events hold field names only, never names, numbers or addresses.
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    shop: ShopContext,
    query: CustomerListQuery,
  ): Promise<CustomerListPage> {
    requireShopRole(shop, ORDER_ROLES);
    const where: Prisma.ShopCustomerWhereInput = { shopId: shop.shopId };
    if (query.kind) {
      where.kind = query.kind;
    }
    const q = query.q?.trim();
    if (q) {
      const digits = q.replace(/[^0-9]/g, '');
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.shopCustomer.count({ where }),
      this.prisma.shopCustomer.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          name: true,
          phone: true,
          kind: true,
          userId: true,
          _count: {
            select: { sites: { where: { archivedAt: null } }, orders: true },
          },
          orders: {
            orderBy: { placedAt: 'desc' },
            take: 1,
            select: { placedAt: true },
          },
        },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        kind: row.kind,
        hasApp: row.userId !== null,
        siteCount: row._count.sites,
        orderCount: row._count.orders,
        lastOrderAt: row.orders[0]?.placedAt.toISOString() ?? null,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async detail(shop: ShopContext, customerId: string): Promise<CustomerDetail> {
    requireShopRole(shop, ORDER_ROLES);
    const row = await this.prisma.shopCustomer.findFirst({
      where: { id: customerId, shopId: shop.shopId },
      select: {
        id: true,
        name: true,
        phone: true,
        kind: true,
        userId: true,
        createdAt: true,
        _count: { select: { orders: true } },
        sites: {
          orderBy: [
            { archivedAt: { sort: 'asc', nulls: 'first' } },
            { name: 'asc' },
          ],
          select: SITE_SELECT,
        },
      },
    });
    if (!row) {
      throw customerNotFound();
    }
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      kind: row.kind,
      hasApp: row.userId !== null,
      sites: row.sites.map(toSite),
      orderCount: row._count.orders,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async create(
    user: CurrentUserContext,
    shop: ShopContext,
    input: CreateCustomerRequest,
  ): Promise<CustomerDetail> {
    requireShopRole(shop, ORDER_ROLES);
    const phone = phoneOrError(input.phone);
    let id: string;
    try {
      id = await this.prisma.$transaction(async (tx) => {
        const created = await tx.shopCustomer.create({
          data: {
            shopId: shop.shopId,
            name: input.name,
            phone,
            kind: input.kind,
          },
          select: { id: true },
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.ShopCustomerCreated,
          entityType: 'shop_customer',
          entityId: created.id,
          shopId: shop.shopId,
          metadata: { kind: input.kind },
        });
        return created.id;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw phoneTaken();
      }
      throw error;
    }
    return this.detail(shop, id);
  }

  async update(
    user: CurrentUserContext,
    shop: ShopContext,
    customerId: string,
    input: UpdateCustomerRequest,
  ): Promise<CustomerDetail> {
    requireShopRole(shop, ORDER_ROLES);
    const current = await this.prisma.shopCustomer.findFirst({
      where: { id: customerId, shopId: shop.shopId },
      select: { id: true, userId: true },
    });
    if (!current) {
      throw customerNotFound();
    }
    let phone: string | undefined;
    if (input.phone !== undefined) {
      if (current.userId !== null) {
        throw problem(
          HttpStatus.CONFLICT,
          'customer_phone_from_app',
          'This customer uses the app; their mobile comes from their account.',
          'phone',
        );
      }
      phone = phoneOrError(input.phone);
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.shopCustomer.update({
          where: { id: customerId },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.kind !== undefined ? { kind: input.kind } : {}),
            ...(phone !== undefined ? { phone } : {}),
          },
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.ShopCustomerUpdated,
          entityType: 'shop_customer',
          entityId: customerId,
          shopId: shop.shopId,
          metadata: { fields: Object.keys(input).sort() },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw phoneTaken();
      }
      throw error;
    }
    return this.detail(shop, customerId);
  }

  async createSite(
    user: CurrentUserContext,
    shop: ShopContext,
    customerId: string,
    input: CreateSiteRequest,
  ): Promise<SiteResponse> {
    requireShopRole(shop, ORDER_ROLES);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockPainter(tx, shop.shopId, customerId);
        await this.requireRoom(tx, shop.shopId, customerId);
        const site = await tx.shopSite.create({
          data: {
            shopId: shop.shopId,
            customerId,
            name: input.name,
            ownerName: input.ownerName ?? null,
            address: input.address,
            latitude: input.pin?.latitude ?? null,
            longitude: input.pin?.longitude ?? null,
          },
          select: SITE_SELECT,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.ShopSiteCreated,
          entityType: 'shop_site',
          entityId: site.id,
          shopId: shop.shopId,
          metadata: { customerId, pin: input.pin ? true : false },
        });
        return toSite(site);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw siteNameTaken();
      }
      throw error;
    }
  }

  async updateSite(
    user: CurrentUserContext,
    shop: ShopContext,
    customerId: string,
    siteId: string,
    input: UpdateSiteRequest,
  ): Promise<SiteResponse> {
    requireShopRole(shop, ORDER_ROLES);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockPainter(tx, shop.shopId, customerId, false);
        const site = await tx.shopSite.findFirst({
          where: { id: siteId, customerId, shopId: shop.shopId },
          select: { id: true, archivedAt: true },
        });
        if (!site) {
          throw siteNotFound();
        }
        if (input.archived === false && site.archivedAt !== null) {
          await this.requireRoom(tx, shop.shopId, customerId);
        }
        const updated = await tx.shopSite.update({
          where: { id: siteId },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.ownerName !== undefined
              ? { ownerName: input.ownerName }
              : {}),
            ...(input.address !== undefined ? { address: input.address } : {}),
            ...(input.pin !== undefined
              ? {
                  latitude: input.pin?.latitude ?? null,
                  longitude: input.pin?.longitude ?? null,
                }
              : {}),
            ...(input.archived !== undefined
              ? { archivedAt: input.archived ? new Date() : null }
              : {}),
          },
          select: SITE_SELECT,
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.ShopSiteUpdated,
          entityType: 'shop_site',
          entityId: siteId,
          shopId: shop.shopId,
          metadata: { fields: Object.keys(input).sort() },
        });
        return toSite(updated);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw siteNameTaken();
      }
      throw error;
    }
  }

  /**
   * Sites belong to painters the shop recorded (D-055). Locks the customer
   * row so the site limit holds under concurrent requests.
   */
  private async lockPainter(
    tx: Prisma.TransactionClient,
    shopId: string,
    customerId: string,
    mustBePainter = true,
  ): Promise<void> {
    const [row] = await tx.$queryRaw<
      { kind: string; user_id: string | null }[]
    >`
      SELECT kind, user_id FROM shop_customers
      WHERE id = ${customerId}::uuid AND shop_id = ${shopId}::uuid
      FOR UPDATE`;
    if (!row) {
      throw customerNotFound();
    }
    if (mustBePainter && (row.kind !== 'PAINTER' || row.user_id !== null)) {
      throw problem(
        HttpStatus.CONFLICT,
        'sites_for_painters_only',
        'Sites can be added for painters you recorded.',
      );
    }
  }

  private async requireRoom(
    tx: Prisma.TransactionClient,
    shopId: string,
    customerId: string,
  ): Promise<void> {
    const active = await tx.shopSite.count({
      where: { shopId, customerId, archivedAt: null },
    });
    if (active >= CUSTOMER_LIMITS.maxActiveSites) {
      throw problem(
        HttpStatus.CONFLICT,
        'site_limit',
        'A customer can have at most 50 active sites. Archive one first.',
      );
    }
  }
}

const siteNameTaken = () =>
  problem(
    HttpStatus.CONFLICT,
    'site_name_taken',
    'This customer already has a site with this name.',
    'name',
  );
