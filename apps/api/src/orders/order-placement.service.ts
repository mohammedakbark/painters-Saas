import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { OrderFulfilment } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import { loadSellablePack } from './order-packs.js';
import {
  customerCanCancel,
  deliveryCharge,
  distanceKm,
  itemsTotal,
} from './order-rules.js';
import { lockOrder, orderNotFound, recalculateTotals } from './order-locks.js';
import { ORDER_LIMITS } from './orders.schemas.js';

export interface PlaceOrderInput {
  shopId: string;
  /** The signed-in app customer. */
  userId: string;
  fulfilment: OrderFulfilment;
  siteLabel?: string;
  items: {
    shopProductPackId: string;
    quantity: number;
    shadeCode?: string;
    shadeName?: string;
  }[];
  delivery?: { address: string; latitude: number; longitude: number };
}

interface ShopForOrder {
  status: string;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  delivery_enabled: boolean;
  delivery_charge_paise: number | null;
  free_delivery_above_paise: number | null;
  delivery_radius_km: number | null;
  next_order_number: number;
}

/**
 * The customer side of an order (ORD-001). Used by the test-order script now
 * and by the Customer App's endpoints later; there are no customer routes
 * yet (D-053). Every step re-checks the shop, packs and delivery area on the
 * server.
 */
@Injectable()
export class OrderPlacementService {
  constructor(private readonly prisma: PrismaService) {}

  async place(input: PlaceOrderInput): Promise<{ id: string; number: number }> {
    if (input.items.length < 1 || input.items.length > ORDER_LIMITS.maxItems) {
      throw problem(
        HttpStatus.BAD_REQUEST,
        'order_items_invalid',
        'An order has 1 to 50 items.',
        'items',
      );
    }
    for (const item of input.items) {
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > ORDER_LIMITS.maxQuantity
      ) {
        throw problem(
          HttpStatus.BAD_REQUEST,
          'order_items_invalid',
          'Each quantity must be from 1 to 999.',
          'items',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Locks the shop row: the order number and settings stay consistent.
      const [shop] = await tx.$queryRaw<ShopForOrder[]>`
        SELECT status, latitude, longitude, delivery_enabled,
               delivery_charge_paise, free_delivery_above_paise,
               delivery_radius_km, next_order_number
        FROM shops WHERE id = ${input.shopId}::uuid FOR UPDATE`;
      if (!shop) {
        throw problem(
          HttpStatus.NOT_FOUND,
          'shop_not_found',
          'Shop not found.',
        );
      }
      if (shop.status !== 'ACTIVE') {
        throw problem(
          HttpStatus.CONFLICT,
          'shop_not_accepting_orders',
          'This shop is not taking orders yet.',
        );
      }

      const customerId = await this.customerFor(tx, input.shopId, input.userId);

      const lines = [];
      for (const [index, item] of input.items.entries()) {
        const pack = await loadSellablePack(
          tx,
          input.shopId,
          item.shopProductPackId,
        );
        const withShade = pack.supportsShades && item.shadeCode;
        lines.push({
          shopId: input.shopId,
          position: index + 1,
          shopProductPackId: pack.shopProductPackId,
          productName: pack.productName,
          brandName: pack.brandName,
          packLabel: pack.packLabel,
          shadeCode: withShade ? item.shadeCode?.trim() : null,
          shadeName: withShade ? (item.shadeName?.trim() ?? null) : null,
          unitPricePaise: pack.unitPricePaise,
          quantity: item.quantity,
          status: 'OK' as const,
          returnedQuantity: 0,
        });
      }
      const itemsPaise = itemsTotal(lines);

      let delivery: Pick<
        Prisma.OrderUncheckedCreateInput,
        | 'deliveryAddress'
        | 'deliveryLatitude'
        | 'deliveryLongitude'
        | 'deliveryDistanceKm'
      > = {};
      let chargePaise = 0;
      if (input.fulfilment === 'DELIVERY') {
        const settings = {
          enabled: shop.delivery_enabled,
          chargePaise: shop.delivery_charge_paise,
          freeAbovePaise: shop.free_delivery_above_paise,
          radiusKm: shop.delivery_radius_km,
        };
        if (
          !input.delivery ||
          !settings.enabled ||
          settings.radiusKm === null ||
          shop.latitude === null ||
          shop.longitude === null
        ) {
          throw problem(
            HttpStatus.CONFLICT,
            'delivery_unavailable',
            'This shop does not deliver. Choose pickup.',
            'fulfilment',
          );
        }
        const km = distanceKm(
          {
            latitude: Number(shop.latitude),
            longitude: Number(shop.longitude),
          },
          input.delivery,
        );
        if (km > settings.radiusKm) {
          throw problem(
            HttpStatus.CONFLICT,
            'delivery_out_of_range',
            `This shop delivers up to ${settings.radiusKm} km away.`,
            'delivery',
          );
        }
        chargePaise = deliveryCharge(settings, itemsPaise);
        delivery = {
          deliveryAddress: input.delivery.address.trim(),
          deliveryLatitude: input.delivery.latitude,
          deliveryLongitude: input.delivery.longitude,
          deliveryDistanceKm: Math.round(km * 100) / 100,
        };
      }

      const number = shop.next_order_number;
      await tx.shop.update({
        where: { id: input.shopId },
        data: { nextOrderNumber: number + 1 },
      });
      const order = await tx.order.create({
        data: {
          ...delivery,
          shopId: input.shopId,
          number,
          customerId,
          siteLabel: input.siteLabel?.trim() || null,
          fulfilment: input.fulfilment,
          itemsTotalPaise: itemsPaise,
          deliveryChargePaise: chargePaise,
          totalPaise: itemsPaise + chargePaise,
          items: { create: lines.map(({ shopId: _shop, ...line }) => line) },
        },
        select: { id: true, number: true },
      });
      await tx.orderEvent.create({
        data: {
          shopId: input.shopId,
          orderId: order.id,
          type: 'placed',
          actor: 'CUSTOMER',
          data: { items: lines.length, fulfilment: input.fulfilment },
        },
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: input.userId },
        action: AuditAction.OrderPlaced,
        entityType: 'order',
        entityId: order.id,
        shopId: input.shopId,
        metadata: { items: lines.length, fulfilment: input.fulfilment },
      });
      return order;
    });
  }

  /** The customer cancels before the order is ready or dispatched (D-047). */
  async cancelByCustomer(
    shopId: string,
    userId: string,
    orderId: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await this.lockCustomerOrder(tx, shopId, userId, orderId);
      if (!customerCanCancel(order.status)) {
        throw problem(
          HttpStatus.CONFLICT,
          'order_status_invalid',
          'This order can no longer be cancelled.',
        );
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledBy: 'CUSTOMER',
          cancelReason: reason?.trim() || null,
          cancelledAt: new Date(),
        },
      });
      await tx.orderEvent.create({
        data: {
          shopId,
          orderId,
          type: 'status_changed',
          actor: 'CUSTOMER',
          data: { from: order.status, to: 'CANCELLED' },
        },
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId },
        action: AuditAction.OrderCancelledByCustomer,
        entityType: 'order',
        entityId: orderId,
        shopId,
        metadata: { from: order.status },
      });
    });
  }

  /** The customer accepts or declines a suggested substitute (D-045). */
  async answerSubstitute(
    shopId: string,
    userId: string,
    orderId: string,
    itemId: string,
    accept: boolean,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await this.lockCustomerOrder(tx, shopId, userId, orderId);
      const offer = await tx.orderItem.findFirst({
        where: { id: itemId, orderId, shopId, status: 'SUBSTITUTE_OFFERED' },
        select: { id: true, substituteForId: true },
      });
      if (!offer || order.status === 'CANCELLED') {
        throw problem(
          HttpStatus.CONFLICT,
          'substitute_not_open',
          'This suggestion is no longer open.',
        );
      }
      await tx.orderItem.update({
        where: { id: offer.id },
        data: { status: accept ? 'OK' : 'SUBSTITUTE_DECLINED' },
      });
      if (accept && offer.substituteForId) {
        await tx.orderItem.update({
          where: { id: offer.substituteForId },
          data: { status: 'SUBSTITUTED' },
        });
      }
      await recalculateTotals(tx, shopId, orderId);
      await tx.orderEvent.create({
        data: {
          shopId,
          orderId,
          type: accept ? 'substitute_accepted' : 'substitute_declined',
          actor: 'CUSTOMER',
          data: { itemId: offer.id },
        },
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId },
        action: AuditAction.OrderSubstituteAnswered,
        entityType: 'order',
        entityId: orderId,
        shopId,
        metadata: { itemId: offer.id, accepted: accept },
      });
    });
  }

  private async lockCustomerOrder(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    orderId: string,
  ) {
    const order = await lockOrder(tx, shopId, orderId);
    const owner = await tx.shopCustomer.findFirst({
      where: { id: order.customerId, shopId, userId },
      select: { id: true },
    });
    if (!owner) {
      throw orderNotFound();
    }
    return order;
  }

  /**
   * The shop's record of this app customer (D-054), created on the first
   * order. A shop-recorded customer with the same mobile is linked only after
   * the person connects with an OTP (ORD-004), never automatically.
   */
  private async customerFor(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
  ): Promise<string> {
    const linked = await tx.shopCustomer.findUnique({
      where: { shopId_userId: { shopId, userId } },
      select: { id: true },
    });
    if (linked) {
      return linked.id;
    }
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { phone: true, displayName: true },
    });
    if (!user?.phone) {
      throw problem(
        HttpStatus.CONFLICT,
        'customer_needs_phone',
        'Add your mobile number before ordering.',
      );
    }
    const recorded = await tx.shopCustomer.findUnique({
      where: { shopId_phone: { shopId, phone: user.phone } },
      select: { id: true },
    });
    if (recorded) {
      throw problem(
        HttpStatus.CONFLICT,
        'customer_link_needed',
        'This shop already has a record for your number. Ask the shop to connect it.',
      );
    }
    const created = await tx.shopCustomer.create({
      data: {
        shopId,
        userId,
        phone: user.phone,
        name: user.displayName?.trim().slice(0, 120) || 'Customer',
      },
      select: { id: true },
    });
    return created.id;
  }
}
