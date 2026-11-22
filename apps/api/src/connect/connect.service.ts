import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { lockBill, settleBill } from '../bills/bill-ledger.js';
import type { Prisma } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';
import { requireShopPermission } from '../shop-access/shop-permissions.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import type {
  ConnectDecision,
  ConnectRequestList,
  MyConnectRequest,
} from './connect.schemas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const shopNotFound = () =>
  problem(HttpStatus.NOT_FOUND, 'shop_not_found', 'Shop not found.');
const requestNotFound = () =>
  problem(
    HttpStatus.NOT_FOUND,
    'connect_request_not_found',
    'This request was not found or is already answered.',
  );

/**
 * Connecting a shop's records to a person's app account (CON-001, D-054,
 * D-063). The person asks in the Customer App; the shop approves on the
 * record of the same verified mobile. The person is never told whether a
 * record exists. Approving links the record, or, when the person already
 * orders there in the app, moves its orders, bill entries and sites to that
 * record in one transaction (amounts never change) and keeps the old record
 * as merged.
 */
@Injectable()
export class ConnectService {
  constructor(private readonly prisma: PrismaService) {}

  // --- The person (Customer App) -------------------------------------------

  async myRequest(
    user: CurrentUserContext,
    shopId: string,
  ): Promise<MyConnectRequest> {
    if (!UUID.test(shopId)) throw shopNotFound();
    const latest = await this.prisma.customerConnectRequest.findFirst({
      where: { shopId, userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { status: true, createdAt: true },
    });
    return latest
      ? { status: latest.status, requestedAt: latest.createdAt.toISOString() }
      : { status: 'NONE', requestedAt: null };
  }

  /** Asks again only when the last request is answered; repeating is fine. */
  async ask(
    user: CurrentUserContext,
    shopId: string,
  ): Promise<MyConnectRequest> {
    if (!UUID.test(shopId)) throw shopNotFound();
    const [shop, account] = await Promise.all([
      this.prisma.shop.findFirst({
        where: { id: shopId, status: 'ACTIVE' },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { phone: true },
      }),
    ]);
    if (!shop) throw shopNotFound();
    const phone = account?.phone;
    if (!phone) {
      throw problem(
        HttpStatus.CONFLICT,
        'phone_required',
        'Sign in with your mobile number first.',
      );
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        const open = await tx.customerConnectRequest.findFirst({
          where: { shopId, userId: user.id, status: 'PENDING' },
          select: { id: true },
        });
        if (open) return;
        const created = await tx.customerConnectRequest.create({
          data: { shopId, userId: user.id, phone },
          select: { id: true },
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.ConnectRequested,
          entityType: 'connect_request',
          entityId: created.id,
          shopId,
        });
      });
    } catch (error) {
      // Two taps at once: the other one made the request.
      if (!isUniqueViolation(error)) throw error;
    }
    return this.myRequest(user, shopId);
  }

  // --- The shop (web and Shop App) -----------------------------------------

  /** Open requests whose mobile matches one of the shop's own records. */
  async list(shop: ShopContext): Promise<ConnectRequestList> {
    requireShopPermission(shop, 'customers.manage');
    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        created_at: Date;
        customer_id: string;
        name: string;
        phone: string;
        kind: 'PAINTER' | 'CUSTOMER';
        has_app_record: boolean;
      }[]
    >`
      SELECT r.id, r.created_at, c.id AS customer_id, c.name, c.phone, c.kind,
             EXISTS (
               SELECT 1 FROM shop_customers a
               WHERE a.shop_id = r.shop_id AND a.user_id = r.user_id
             ) AS has_app_record
      FROM customer_connect_requests r
      JOIN shop_customers c
        ON c.shop_id = r.shop_id AND c.phone = r.phone
       AND c.user_id IS NULL AND c.merged_into_id IS NULL
      WHERE r.shop_id = ${shop.shopId}::uuid AND r.status = 'PENDING'
      ORDER BY r.created_at
      LIMIT 100`;
    return {
      items: rows.map((row) => ({
        id: row.id,
        requestedAt: row.created_at.toISOString(),
        customer: {
          id: row.customer_id,
          name: row.name,
          phone: row.phone,
          kind: row.kind,
        },
        mergesIntoAppRecord: row.has_app_record,
      })),
    };
  }

  async approve(
    user: CurrentUserContext,
    shop: ShopContext,
    requestId: string,
  ): Promise<ConnectDecision> {
    requireShopPermission(shop, 'customers.manage');
    return this.prisma.$transaction(async (tx) => {
      const request = await this.lockRequest(tx, shop.shopId, requestId);
      const recorded = await tx.shopCustomer.findFirst({
        where: {
          shopId: shop.shopId,
          phone: request.phone,
          userId: null,
          mergedIntoId: null,
        },
        select: { id: true },
      });
      if (!recorded) throw requestNotFound();
      if (!(await lockBill(tx, shop.shopId, recorded.id))) {
        throw requestNotFound();
      }
      const app = await tx.shopCustomer.findFirst({
        where: { shopId: shop.shopId, userId: request.userId },
        select: { id: true },
      });

      let target: string;
      let moved = { orders: 0, entries: 0, sites: 0 };
      if (!app) {
        // Nothing to merge: the shop's record becomes the person's.
        await tx.shopCustomer.update({
          where: { id: recorded.id },
          data: { userId: request.userId },
        });
        target = recorded.id;
      } else {
        await lockBill(tx, shop.shopId, app.id);
        target = app.id;
        moved = await this.moveRecords(tx, shop.shopId, recorded.id, app.id);
        await settleBill(tx, shop.shopId, app.id, { userId: user.id });
      }

      await tx.customerConnectRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          customerId: target,
          decidedAt: new Date(),
          decidedById: user.id,
        },
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: user.id },
        action: AuditAction.ConnectApproved,
        entityType: 'shop_customer',
        entityId: target,
        shopId: shop.shopId,
        metadata: {
          requestId: request.id,
          mergedFrom: app ? recorded.id : null,
          ...moved,
        },
      });
      return { customerId: target, merged: app !== null };
    });
  }

  async decline(
    user: CurrentUserContext,
    shop: ShopContext,
    requestId: string,
  ): Promise<void> {
    requireShopPermission(shop, 'customers.manage');
    await this.prisma.$transaction(async (tx) => {
      const request = await this.lockRequest(tx, shop.shopId, requestId);
      await tx.customerConnectRequest.update({
        where: { id: request.id },
        data: {
          status: 'DECLINED',
          decidedAt: new Date(),
          decidedById: user.id,
        },
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: user.id },
        action: AuditAction.ConnectDeclined,
        entityType: 'connect_request',
        entityId: request.id,
        shopId: shop.shopId,
      });
    });
  }

  /**
   * Moves the shop record's orders, bill entries and sites to the person's
   * app record. Bill entries keep every amount; only the record they belong
   * to changes, which the append-only trigger allows inside this
   * transaction alone (`paintshop.bill_merge`).
   */
  private async moveRecords(
    tx: Prisma.TransactionClient,
    shopId: string,
    from: string,
    to: string,
  ): Promise<{ orders: number; entries: number; sites: number }> {
    await tx.$executeRaw`SELECT set_config('paintshop.bill_merge', 'on', true)`;
    const entries = await tx.billEntry.updateMany({
      where: { shopId, customerId: from },
      data: { customerId: to },
    });
    await tx.$executeRaw`SELECT set_config('paintshop.bill_merge', 'off', true)`;
    const orders = await tx.order.updateMany({
      where: { shopId, customerId: from },
      data: { customerId: to },
    });
    const sites = await tx.shopSite.updateMany({
      where: { shopId, customerId: from },
      data: { customerId: to },
    });
    await tx.shopCustomer.update({
      where: { id: from },
      data: { mergedIntoId: to, mergedAt: new Date() },
    });
    return { orders: orders.count, entries: entries.count, sites: sites.count };
  }

  private async lockRequest(
    tx: Prisma.TransactionClient,
    shopId: string,
    requestId: string,
  ): Promise<{ id: string; userId: string; phone: string }> {
    if (!UUID.test(requestId)) throw requestNotFound();
    const [row] = await tx.$queryRaw<
      { id: string; user_id: string; phone: string }[]
    >`
      SELECT id, user_id, phone FROM customer_connect_requests
      WHERE id = ${requestId}::uuid AND shop_id = ${shopId}::uuid
        AND status = 'PENDING'
      FOR UPDATE`;
    if (!row) throw requestNotFound();
    return { id: row.id, userId: row.user_id, phone: row.phone };
  }
}
