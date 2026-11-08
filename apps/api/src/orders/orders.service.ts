import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { OrderStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';
import {
  ORDER_MANAGER_ROLES,
  ORDER_ROLES,
  requireShopRole,
} from '../shop-access/shop-roles.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import { lockOrder, orderNotFound, recalculateTotals } from './order-locks.js';
import { loadSellablePack } from './order-packs.js';
import {
  canRecordPayment,
  canShopMove,
  itemsEditable,
  nextShopSteps,
  OPEN_STATUSES,
  READY_STATUSES,
} from './order-rules.js';
import type {
  MarkItemNotAvailableRequest,
  OfferSubstituteRequest,
  OrderDetail,
  OrderListPage,
  OrderListQuery,
  OrderSummary,
  RecordPaymentRequest,
  ReturnItemRequest,
  UpdateOrderStatusRequest,
} from './orders.schemas.js';

const STATUSES: readonly OrderStatus[] = [
  'NEW',
  'PACKING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
];

const DETAIL_SELECT = {
  id: true,
  number: true,
  status: true,
  fulfilment: true,
  siteLabel: true,
  source: true,
  deliveryAddress: true,
  deliveryLatitude: true,
  deliveryLongitude: true,
  deliveryDistanceKm: true,
  itemsTotalPaise: true,
  deliveryChargePaise: true,
  totalPaise: true,
  paymentStatus: true,
  paymentMethod: true,
  paidAt: true,
  cancelledBy: true,
  cancelReason: true,
  cancelledAt: true,
  placedAt: true,
  readyAt: true,
  completedAt: true,
  customer: { select: { id: true, name: true, phone: true, userId: true } },
  items: { orderBy: { position: 'asc' } },
  events: {
    orderBy: { createdAt: 'asc' },
    select: { id: true, type: true, actor: true, data: true, createdAt: true },
  },
} as const satisfies Prisma.OrderSelect;

type DetailRow = Prisma.OrderGetPayload<{ select: typeof DETAIL_SELECT }>;

const iso = (date: Date | null) => date?.toISOString() ?? null;

/**
 * The shop side of orders (ORD-001, D-045 to D-047, D-053). Every query is
 * scoped to the shop from verified membership; another shop's order is "not
 * found". Changes lock the order row, write the timeline and an audit event.
 */
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(shop: ShopContext, query: OrderListQuery): Promise<OrderListPage> {
    requireShopRole(shop, ORDER_ROLES);
    const base = this.filters(shop.shopId, query);
    const where: Prisma.OrderWhereInput = {
      ...base,
      ...(query.status === 'all'
        ? {}
        : query.status === 'open'
          ? { status: { in: [...OPEN_STATUSES] } }
          : query.status === 'ready'
            ? { status: { in: [...READY_STATUSES] } }
            : { status: query.status }),
    };

    const [total, rows, grouped] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          number: true,
          placedAt: true,
          status: true,
          fulfilment: true,
          siteLabel: true,
          source: true,
          totalPaise: true,
          paymentStatus: true,
          customer: {
            select: { id: true, name: true, phone: true, userId: true },
          },
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: base,
        _count: { _all: true },
      }),
    ]);

    const lineCounts = await this.prisma.orderItem.groupBy({
      by: ['orderId', 'status'],
      where: {
        shopId: shop.shopId,
        orderId: { in: rows.map((row) => row.id) },
        substituteForId: null,
      },
      _count: { _all: true },
    });

    const byStatus = Object.fromEntries(
      STATUSES.map((status) => [
        status,
        grouped.find((group) => group.status === status)?._count._all ?? 0,
      ]),
    ) as Record<OrderStatus, number>;

    return {
      items: rows.map((row) => {
        const lines = lineCounts.filter((line) => line.orderId === row.id);
        return {
          id: row.id,
          number: row.number,
          placedAt: row.placedAt.toISOString(),
          status: row.status,
          fulfilment: row.fulfilment,
          customer: {
            id: row.customer.id,
            name: row.customer.name,
            phone: row.customer.phone,
            hasApp: row.customer.userId !== null,
          },
          siteLabel: row.siteLabel,
          source: row.source,
          itemCount: lines.reduce((sum, line) => sum + line._count._all, 0),
          notAvailableCount:
            lines.find((line) => line.status === 'NOT_AVAILABLE')?._count
              ._all ?? 0,
          totalPaise: row.totalPaise,
          paymentStatus: row.paymentStatus,
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
      counts: {
        all: STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
        open: OPEN_STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
        ready: READY_STATUSES.reduce(
          (sum, status) => sum + byStatus[status],
          0,
        ),
        ...byStatus,
      },
    };
  }

  /**
   * Order figures for the Overview (ORD-003). "Today" is the Indian calendar
   * day; sales are the totals of orders completed today (owner, 2026-11-08).
   */
  async summary(shop: ShopContext): Promise<OrderSummary> {
    requireShopRole(shop, ORDER_ROLES);
    const [row] = await this.prisma.$queryRaw<
      {
        new: bigint;
        packing: bigint;
        ready: bigint;
        unpaid_count: bigint;
        unpaid_paise: bigint | null;
        placed_today: bigint;
        completed_today: bigint;
        sales_today: bigint | null;
      }[]
    >`
      WITH day AS (
        SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
                AT TIME ZONE 'Asia/Kolkata') AS starts
      )
      SELECT
        count(*) FILTER (WHERE o.status = 'NEW') AS new,
        count(*) FILTER (WHERE o.status = 'PACKING') AS packing,
        count(*) FILTER (WHERE o.status IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY')) AS ready,
        count(*) FILTER (WHERE o.payment_status = 'UNPAID'
          AND o.status IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED')) AS unpaid_count,
        sum(o.total_paise) FILTER (WHERE o.payment_status = 'UNPAID'
          AND o.status IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED')) AS unpaid_paise,
        count(*) FILTER (WHERE o.placed_at >= day.starts) AS placed_today,
        count(*) FILTER (WHERE o.status = 'COMPLETED' AND o.completed_at >= day.starts) AS completed_today,
        sum(o.total_paise) FILTER (WHERE o.status = 'COMPLETED' AND o.completed_at >= day.starts) AS sales_today
      FROM orders o CROSS JOIN day
      WHERE o.shop_id = ${shop.shopId}::uuid`;
    const n = (value: bigint | null | undefined) => Number(value ?? 0);
    return {
      new: n(row?.new),
      packing: n(row?.packing),
      ready: n(row?.ready),
      unpaid: { count: n(row?.unpaid_count), totalPaise: n(row?.unpaid_paise) },
      today: {
        placed: n(row?.placed_today),
        completed: n(row?.completed_today),
        salesPaise: n(row?.sales_today),
      },
    };
  }

  async detail(shop: ShopContext, orderId: string): Promise<OrderDetail> {
    requireShopRole(shop, ORDER_ROLES);
    const row = await this.prisma.order.findFirst({
      where: { id: orderId, shopId: shop.shopId },
      select: DETAIL_SELECT,
    });
    if (!row) {
      throw orderNotFound();
    }
    return toDetail(row);
  }

  async changeStatus(
    user: CurrentUserContext,
    shop: ShopContext,
    orderId: string,
    input: UpdateOrderStatusRequest,
  ): Promise<OrderDetail> {
    requireShopRole(shop, ORDER_ROLES);
    await this.prisma.$transaction(async (tx) => {
      const order = await lockOrder(tx, shop.shopId, orderId);
      if (!canShopMove(order.status, input.to, order.fulfilment)) {
        throw statusInvalid();
      }
      const now = new Date();
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: input.to,
          ...(input.to === 'READY_FOR_PICKUP' || input.to === 'OUT_FOR_DELIVERY'
            ? { readyAt: now }
            : {}),
          ...(input.to === 'COMPLETED' ? { completedAt: now } : {}),
          ...(input.to === 'CANCELLED'
            ? {
                cancelledAt: now,
                cancelledBy: 'SHOP' as const,
                cancelReason: input.reason ?? null,
              }
            : {}),
        },
      });
      await this.record(tx, user, shop, orderId, {
        type: 'status_changed',
        action: AuditAction.OrderStatusChanged,
        data: { from: order.status, to: input.to },
      });
    });
    return this.detail(shop, orderId);
  }

  async markNotAvailable(
    user: CurrentUserContext,
    shop: ShopContext,
    orderId: string,
    itemId: string,
    input: MarkItemNotAvailableRequest,
  ): Promise<OrderDetail> {
    requireShopRole(shop, ORDER_ROLES);
    await this.prisma.$transaction(async (tx) => {
      const order = await lockOrder(tx, shop.shopId, orderId);
      requireItemsEditable(order.status);
      const item = await findItem(tx, shop.shopId, orderId, itemId);
      if (item.status !== 'OK') {
        throw problem(
          HttpStatus.CONFLICT,
          'order_item_not_ok',
          'Only an item that is still in the order can be marked not available.',
        );
      }
      await tx.orderItem.update({
        where: { id: item.id },
        data: { status: 'NOT_AVAILABLE', shopNote: input.message },
      });
      await recalculateTotals(tx, shop.shopId, orderId);
      // Notifying the customer: the message is on the line and in the
      // timeline; push notifications arrive with the apps.
      await this.record(tx, user, shop, orderId, {
        type: 'item_not_available',
        action: AuditAction.OrderItemNotAvailable,
        data: { itemId: item.id },
      });
    });
    return this.detail(shop, orderId);
  }

  async offerSubstitute(
    user: CurrentUserContext,
    shop: ShopContext,
    orderId: string,
    itemId: string,
    input: OfferSubstituteRequest,
  ): Promise<OrderDetail> {
    requireShopRole(shop, ORDER_ROLES);
    await this.prisma.$transaction(async (tx) => {
      const order = await lockOrder(tx, shop.shopId, orderId);
      requireItemsEditable(order.status);
      const item = await findItem(tx, shop.shopId, orderId, itemId);
      if (item.status !== 'OK' && item.status !== 'NOT_AVAILABLE') {
        throw problem(
          HttpStatus.CONFLICT,
          'order_item_not_ok',
          'A substitute can be suggested only for an item in the order.',
        );
      }
      const open = await tx.orderItem.count({
        where: { substituteForId: item.id, status: 'SUBSTITUTE_OFFERED' },
      });
      if (open > 0) {
        throw problem(
          HttpStatus.CONFLICT,
          'substitute_already_offered',
          'A substitute is already waiting for the customer’s answer.',
        );
      }
      const note = input.message ?? item.shopNote;
      if (!note) {
        throw problem(
          HttpStatus.BAD_REQUEST,
          'message_required',
          'Enter a message for the customer.',
          'message',
        );
      }
      const pack = await loadSellablePack(
        tx,
        shop.shopId,
        input.shopProductPackId,
      );
      const last = await tx.orderItem.aggregate({
        where: { orderId },
        _max: { position: true },
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: { status: 'NOT_AVAILABLE', shopNote: note },
      });
      const offer = await tx.orderItem.create({
        data: {
          shopId: shop.shopId,
          orderId,
          position: (last._max.position ?? 0) + 1,
          shopProductPackId: pack.shopProductPackId,
          productName: pack.productName,
          brandName: pack.brandName,
          packLabel: pack.packLabel,
          shadeCode: pack.supportsShades ? (input.shadeCode ?? null) : null,
          shadeName: pack.supportsShades ? (input.shadeName ?? null) : null,
          unitPricePaise: pack.unitPricePaise,
          quantity: input.quantity,
          status: 'SUBSTITUTE_OFFERED',
          substituteForId: item.id,
        },
        select: { id: true },
      });
      await recalculateTotals(tx, shop.shopId, orderId);
      await this.record(tx, user, shop, orderId, {
        type: 'substitute_offered',
        action: AuditAction.OrderSubstituteOffered,
        data: { itemId: item.id, substituteId: offer.id },
      });
    });
    return this.detail(shop, orderId);
  }

  async recordPayment(
    user: CurrentUserContext,
    shop: ShopContext,
    orderId: string,
    input: RecordPaymentRequest,
  ): Promise<OrderDetail> {
    requireShopRole(shop, ORDER_MANAGER_ROLES);
    await this.prisma.$transaction(async (tx) => {
      const order = await lockOrder(tx, shop.shopId, orderId);
      if (order.paymentStatus === 'PAID') {
        throw problem(
          HttpStatus.CONFLICT,
          'order_already_paid',
          'This order is already marked as paid.',
        );
      }
      if (!canRecordPayment(order.status)) {
        throw problem(
          HttpStatus.CONFLICT,
          'order_payment_not_allowed',
          'Record the payment when the order is ready, out for delivery or completed.',
        );
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: input.method,
          paidAt: new Date(),
          paidByUserId: user.id,
        },
      });
      await this.record(tx, user, shop, orderId, {
        type: 'paid',
        action: AuditAction.OrderPaymentRecorded,
        data: { method: input.method },
      });
    });
    return this.detail(shop, orderId);
  }

  async returnItem(
    user: CurrentUserContext,
    shop: ShopContext,
    orderId: string,
    itemId: string,
    input: ReturnItemRequest,
  ): Promise<OrderDetail> {
    requireShopRole(shop, ORDER_MANAGER_ROLES);
    await this.prisma.$transaction(async (tx) => {
      const order = await lockOrder(tx, shop.shopId, orderId);
      if (order.status !== 'COMPLETED') {
        throw problem(
          HttpStatus.CONFLICT,
          'order_return_not_allowed',
          'Returns are recorded after the order is completed.',
        );
      }
      const item = await findItem(tx, shop.shopId, orderId, itemId);
      if (
        item.status !== 'OK' ||
        input.quantity > item.quantity - item.returnedQuantity
      ) {
        throw problem(
          HttpStatus.CONFLICT,
          'order_return_too_many',
          'You can return at most the quantity that was handed over.',
          'quantity',
        );
      }
      await tx.orderItem.update({
        where: { id: item.id },
        data: { returnedQuantity: item.returnedQuantity + input.quantity },
      });
      await recalculateTotals(tx, shop.shopId, orderId);
      // Money records (refunds, bills) follow with billing in Phase 3 (D-047).
      await this.record(tx, user, shop, orderId, {
        type: 'item_returned',
        action: AuditAction.OrderItemReturned,
        data: { itemId: item.id, quantity: input.quantity },
        reason: input.reason,
      });
    });
    return this.detail(shop, orderId);
  }

  private filters(
    shopId: string,
    query: OrderListQuery,
  ): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = { shopId };
    if (query.fulfilment) {
      where.fulfilment = query.fulfilment;
    }
    if (query.payment) {
      where.paymentStatus = query.payment;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    const q = query.q?.trim();
    if (q) {
      const digits = q.replace(/[^0-9]/g, '');
      const or: Prisma.OrderWhereInput[] = [
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
      if (digits.length > 0) {
        const number = Number(digits);
        if (digits.length <= 9 && Number.isSafeInteger(number)) {
          or.push({ number });
        }
        if (digits.length >= 4) {
          or.push({ customer: { phone: { contains: digits } } });
        }
      }
      where.OR = or;
    }
    return where;
  }

  /** Timeline entry plus audit event, in the same transaction. */
  private async record(
    tx: Prisma.TransactionClient,
    user: CurrentUserContext,
    shop: ShopContext,
    orderId: string,
    event: {
      type: string;
      action: AuditAction;
      data: Prisma.InputJsonObject;
      reason?: string;
    },
  ): Promise<void> {
    await tx.orderEvent.create({
      data: {
        shopId: shop.shopId,
        orderId,
        type: event.type,
        actor: 'SHOP',
        actorUserId: user.id,
        // The shop's own reason shows on the timeline, not in the audit log.
        data: event.reason
          ? { ...event.data, reason: event.reason }
          : event.data,
      },
    });
    await recordAuditEvent(tx, {
      actor: { type: 'USER', userId: user.id },
      action: event.action,
      entityType: 'order',
      entityId: orderId,
      shopId: shop.shopId,
      metadata: event.data,
    });
  }
}

const statusInvalid = () =>
  problem(
    HttpStatus.CONFLICT,
    'order_status_invalid',
    'The order cannot move to that step now.',
    'to',
  );

function requireItemsEditable(status: OrderStatus): void {
  if (!itemsEditable(status)) {
    throw problem(
      HttpStatus.CONFLICT,
      'order_items_locked',
      'Items can be changed only while the order is new or being packed.',
    );
  }
}

async function findItem(
  tx: Prisma.TransactionClient,
  shopId: string,
  orderId: string,
  itemId: string,
) {
  const item = await tx.orderItem.findFirst({
    where: { id: itemId, orderId, shopId },
    select: {
      id: true,
      status: true,
      quantity: true,
      returnedQuantity: true,
      shopNote: true,
    },
  });
  if (!item) {
    throw problem(
      HttpStatus.NOT_FOUND,
      'order_item_not_found',
      'Item not found.',
    );
  }
  return item;
}

function toDetail(row: DetailRow): OrderDetail {
  const delivery =
    row.fulfilment === 'DELIVERY' && row.deliveryAddress !== null
      ? {
          address: row.deliveryAddress,
          // Orders the shop records may have no map point (ORD-004).
          latitude: row.deliveryLatitude?.toNumber() ?? null,
          longitude: row.deliveryLongitude?.toNumber() ?? null,
          distanceKm: row.deliveryDistanceKm?.toNumber() ?? null,
        }
      : null;
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    fulfilment: row.fulfilment,
    customer: {
      id: row.customer.id,
      name: row.customer.name,
      phone: row.customer.phone,
      hasApp: row.customer.userId !== null,
    },
    siteLabel: row.siteLabel,
    source: row.source,
    delivery,
    items: row.items.map((item) => ({
      id: item.id,
      position: item.position,
      shopProductPackId: item.shopProductPackId,
      productName: item.productName,
      brandName: item.brandName,
      packLabel: item.packLabel,
      shadeCode: item.shadeCode,
      shadeName: item.shadeName,
      unitPricePaise: item.unitPricePaise,
      quantity: item.quantity,
      returnedQuantity: item.returnedQuantity,
      countedPaise:
        item.status === 'OK'
          ? item.unitPricePaise * (item.quantity - item.returnedQuantity)
          : 0,
      status: item.status,
      shopNote: item.shopNote,
      substituteForId: item.substituteForId,
    })),
    totals: {
      itemsPaise: row.itemsTotalPaise,
      deliveryChargePaise: row.deliveryChargePaise,
      totalPaise: row.totalPaise,
    },
    payment: {
      status: row.paymentStatus,
      method: row.paymentMethod,
      paidAt: iso(row.paidAt),
    },
    cancelled:
      row.status === 'CANCELLED' && row.cancelledBy && row.cancelledAt
        ? {
            by: row.cancelledBy,
            reason: row.cancelReason,
            at: row.cancelledAt.toISOString(),
          }
        : null,
    placedAt: row.placedAt.toISOString(),
    readyAt: iso(row.readyAt),
    completedAt: iso(row.completedAt),
    nextSteps: nextShopSteps(row.status, row.fulfilment),
    canEditItems: itemsEditable(row.status),
    canRecordPayment:
      row.paymentStatus === 'UNPAID' && canRecordPayment(row.status),
    canReturnItems: row.status === 'COMPLETED',
    events: row.events.map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor as 'CUSTOMER' | 'SHOP' | 'SYSTEM',
      data:
        event.data !== null &&
        typeof event.data === 'object' &&
        !Array.isArray(event.data)
          ? (event.data as Record<string, unknown>)
          : {},
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
