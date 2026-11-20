import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { OrderFulfilment } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import {
  buildLines,
  checkLineCount,
  lockShopForOrder,
  takeOrderNumber,
} from './order-building.js';
import {
  customerCanCancel,
  deliveryCharge,
  distanceKm,
} from './order-rules.js';
import { lockOrder, orderNotFound, recalculateTotals } from './order-locks.js';

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
  /** The painter's own site (CUS-006, D-049); checked by the caller. */
  customerSiteId?: string;
  /** The app's key for this checkout: a repeat returns the same order. */
  clientRequestId?: string;
  /**
   * The total the person saw at checkout. When today's prices or the
   * delivery charge give another total, nothing is placed (409).
   */
  expectedTotalPaise?: number;
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
    checkLineCount(input.items);
    const repeated = await this.earlierPlacement(input);
    if (repeated) return repeated;
    try {
      return await this.placeOnce(input);
    } catch (error) {
      // Two identical requests at once: the second finds the first's order.
      if (isUniqueViolation(error)) {
        const first = await this.earlierPlacement(input);
        if (first) return first;
      }
      throw error;
    }
  }

  /** The order an earlier request with the same key placed, if any. */
  private async earlierPlacement(
    input: PlaceOrderInput,
  ): Promise<{ id: string; number: number } | null> {
    if (!input.clientRequestId) return null;
    return this.prisma.order.findFirst({
      where: {
        shopId: input.shopId,
        clientRequestId: input.clientRequestId,
        customer: { userId: input.userId },
      },
      select: { id: true, number: true },
    });
  }

  private placeOnce(
    input: PlaceOrderInput,
  ): Promise<{ id: string; number: number }> {
    return this.prisma.$transaction(async (tx) => {
      const shop = await lockShopForOrder(tx, input.shopId);
      const customerId = await this.customerFor(tx, input.shopId, input.userId);
      const { lines, itemsPaise } = await buildLines(
        tx,
        input.shopId,
        input.items,
      );

      let delivery: Pick<
        Prisma.OrderUncheckedCreateInput,
        | 'deliveryAddress'
        | 'deliveryLatitude'
        | 'deliveryLongitude'
        | 'deliveryDistanceKm'
      > = {};
      let chargePaise = 0;
      if (input.fulfilment === 'DELIVERY') {
        const settings = shop.delivery;
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

      if (
        input.expectedTotalPaise !== undefined &&
        input.expectedTotalPaise !== itemsPaise + chargePaise
      ) {
        throw problem(
          HttpStatus.CONFLICT,
          'order_total_changed',
          'Prices, availability or the delivery charge changed. Check your cart and try again.',
        );
      }

      const number = await takeOrderNumber(tx, input.shopId, shop);
      const order = await tx.order.create({
        data: {
          ...delivery,
          shopId: input.shopId,
          number,
          customerId,
          siteLabel: input.siteLabel?.trim() || null,
          customerSiteId: input.customerSiteId ?? null,
          clientRequestId: input.clientRequestId ?? null,
          fulfilment: input.fulfilment,
          itemsTotalPaise: itemsPaise,
          deliveryChargePaise: chargePaise,
          totalPaise: itemsPaise + chargePaise,
          items: { create: lines },
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
   * order. A record the shop made for the same mobile stays separate and
   * private; it is linked only after the person connects with an OTP, never
   * automatically (D-055).
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
