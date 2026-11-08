import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';
import {
  ORDER_MANAGER_ROLES,
  ORDER_ROLES,
  requireShopRole,
} from '../shop-access/shop-roles.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import {
  buildLines,
  checkLineCount,
  lockShopForOrder,
  takeOrderNumber,
} from './order-building.js';
import { deliveryCharge, distanceKm } from './order-rules.js';
import type { RecordOrderRequest } from './orders.schemas.js';

/**
 * Orders the shop records for a customer, by phone or at the counter
 * (ORD-004, D-054, D-055). Same shop, pack and price checks as app orders.
 * "Handed over now" saves the order as completed; recording a payment with
 * it is owner only (D-053). The delivery area is not checked: the shop
 * delivers itself.
 */
@Injectable()
export class OrderRecordingService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    user: CurrentUserContext,
    shop: ShopContext,
    input: RecordOrderRequest,
  ): Promise<{ id: string; number: number }> {
    requireShopRole(shop, ORDER_ROLES);
    if (input.paymentMethod) {
      requireShopRole(shop, ORDER_MANAGER_ROLES);
    }
    checkLineCount(input.items);

    return this.prisma.$transaction(async (tx) => {
      const locked = await lockShopForOrder(tx, shop.shopId);
      const customer = await tx.shopCustomer.findFirst({
        where: { id: input.customerId, shopId: shop.shopId },
        select: { id: true },
      });
      if (!customer) {
        throw problem(
          HttpStatus.NOT_FOUND,
          'customer_not_found',
          'Customer not found.',
          'customerId',
        );
      }
      const site = input.siteId
        ? await tx.shopSite.findFirst({
            where: {
              id: input.siteId,
              shopId: shop.shopId,
              customerId: customer.id,
              archivedAt: null,
            },
            select: {
              name: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          })
        : null;
      if (input.siteId && !site) {
        throw problem(
          HttpStatus.NOT_FOUND,
          'site_not_found',
          'Site not found.',
          'siteId',
        );
      }

      const { lines, itemsPaise } = await buildLines(
        tx,
        shop.shopId,
        input.items,
      );

      let chargePaise = 0;
      let delivery = {};
      if (input.fulfilment === 'DELIVERY') {
        const address = input.deliveryAddress ?? site?.address;
        if (!address) {
          throw problem(
            HttpStatus.BAD_REQUEST,
            'delivery_address_required',
            'Enter the delivery address.',
            'deliveryAddress',
          );
        }
        if (!locked.delivery.enabled) {
          throw problem(
            HttpStatus.CONFLICT,
            'delivery_unavailable',
            'Delivery is off in your shop settings. Choose pickup or turn delivery on.',
            'fulfilment',
          );
        }
        chargePaise = deliveryCharge(locked.delivery, itemsPaise);
        // The site's pin gives the drop point when the address is the site's.
        const pin =
          !input.deliveryAddress &&
          site?.latitude &&
          site.longitude &&
          locked.latitude &&
          locked.longitude
            ? {
                latitude: site.latitude.toNumber(),
                longitude: site.longitude.toNumber(),
              }
            : null;
        delivery = {
          deliveryAddress: address,
          ...(pin
            ? {
                deliveryLatitude: pin.latitude,
                deliveryLongitude: pin.longitude,
                deliveryDistanceKm:
                  Math.round(
                    distanceKm(
                      {
                        latitude: locked.latitude!.toNumber(),
                        longitude: locked.longitude!.toNumber(),
                      },
                      pin,
                    ) * 100,
                  ) / 100,
              }
            : {}),
        };
      }

      const number = await takeOrderNumber(tx, shop.shopId, locked);
      const now = new Date();
      const order = await tx.order.create({
        data: {
          ...delivery,
          shopId: shop.shopId,
          number,
          customerId: customer.id,
          siteId: input.siteId ?? null,
          siteLabel: site?.name ?? null,
          source: 'SHOP',
          createdByUserId: user.id,
          fulfilment: input.fulfilment,
          itemsTotalPaise: itemsPaise,
          deliveryChargePaise: chargePaise,
          totalPaise: itemsPaise + chargePaise,
          ...(input.handedOver
            ? { status: 'COMPLETED', readyAt: now, completedAt: now }
            : {}),
          ...(input.paymentMethod
            ? {
                paymentStatus: 'PAID',
                paymentMethod: input.paymentMethod,
                paidAt: now,
                paidByUserId: user.id,
              }
            : {}),
          items: { create: lines },
        },
        select: { id: true, number: true },
      });
      const data = {
        items: lines.length,
        fulfilment: input.fulfilment,
        handedOver: input.handedOver,
      };
      await tx.orderEvent.create({
        data: {
          shopId: shop.shopId,
          orderId: order.id,
          type: 'recorded',
          actor: 'SHOP',
          actorUserId: user.id,
          data,
        },
      });
      if (input.paymentMethod) {
        await tx.orderEvent.create({
          data: {
            shopId: shop.shopId,
            orderId: order.id,
            type: 'paid',
            actor: 'SHOP',
            actorUserId: user.id,
            data: { method: input.paymentMethod },
          },
        });
      }
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: user.id },
        action: AuditAction.OrderRecordedByShop,
        entityType: 'order',
        entityId: order.id,
        shopId: shop.shopId,
        metadata: { ...data, paid: Boolean(input.paymentMethod) },
      });
      return order;
    });
  }
}
