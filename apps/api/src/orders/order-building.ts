import { HttpStatus } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import { loadSellablePack } from './order-packs.js';
import { type DeliverySettings, itemsTotal } from './order-rules.js';
import { ORDER_LIMITS } from './orders.schemas.js';

/**
 * Steps shared by app orders (OrderPlacementService) and orders the shop
 * records (ORD-004): the same checks on the shop, packs and prices.
 */

export interface OrderLineInput {
  shopProductPackId: string;
  quantity: number;
  shadeCode?: string;
  shadeName?: string;
}

export interface ShopForOrder {
  status: string;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  delivery: DeliverySettings;
  nextOrderNumber: number;
}

/** 1 to 50 lines, each 1 to 999 units. */
export function checkLineCount(items: readonly OrderLineInput[]): void {
  if (items.length < 1 || items.length > ORDER_LIMITS.maxItems) {
    throw problem(
      HttpStatus.BAD_REQUEST,
      'order_items_invalid',
      'An order has 1 to 50 items.',
      'items',
    );
  }
  for (const item of items) {
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
}

/**
 * Locks the shop row for the order number and settings, and checks that the
 * shop is Live. Only Live shops take orders.
 */
export async function lockShopForOrder(
  tx: Prisma.TransactionClient,
  shopId: string,
): Promise<ShopForOrder> {
  const [shop] = await tx.$queryRaw<
    {
      status: string;
      latitude: Prisma.Decimal | null;
      longitude: Prisma.Decimal | null;
      delivery_enabled: boolean;
      delivery_charge_paise: number | null;
      free_delivery_above_paise: number | null;
      delivery_radius_km: number | null;
      next_order_number: number;
    }[]
  >`
    SELECT status, latitude, longitude, delivery_enabled,
           delivery_charge_paise, free_delivery_above_paise,
           delivery_radius_km, next_order_number
    FROM shops WHERE id = ${shopId}::uuid FOR UPDATE`;
  if (!shop) {
    throw problem(HttpStatus.NOT_FOUND, 'shop_not_found', 'Shop not found.');
  }
  if (shop.status !== 'ACTIVE') {
    throw problem(
      HttpStatus.CONFLICT,
      'shop_not_accepting_orders',
      'This shop is not taking orders yet.',
    );
  }
  return {
    status: shop.status,
    latitude: shop.latitude,
    longitude: shop.longitude,
    delivery: {
      enabled: shop.delivery_enabled,
      chargePaise: shop.delivery_charge_paise,
      freeAbovePaise: shop.free_delivery_above_paise,
      radiusKm: shop.delivery_radius_km,
    },
    nextOrderNumber: shop.next_order_number,
  };
}

/** Copies product, pack, shade and the current price into order lines. */
export async function buildLines(
  tx: Prisma.TransactionClient,
  shopId: string,
  items: readonly OrderLineInput[],
) {
  const lines = [];
  for (const [index, item] of items.entries()) {
    const pack = await loadSellablePack(tx, shopId, item.shopProductPackId);
    const withShade = pack.supportsShades && item.shadeCode?.trim();
    lines.push({
      position: index + 1,
      shopProductPackId: pack.shopProductPackId,
      productName: pack.productName,
      brandName: pack.brandName,
      packLabel: pack.packLabel,
      shadeCode: withShade ? item.shadeCode!.trim() : null,
      shadeName: withShade ? item.shadeName?.trim() || null : null,
      unitPricePaise: pack.unitPricePaise,
      quantity: item.quantity,
      status: 'OK' as const,
      returnedQuantity: 0,
    });
  }
  return { lines, itemsPaise: itemsTotal(lines) };
}

/** Takes the shop's next order number (the shop row is already locked). */
export async function takeOrderNumber(
  tx: Prisma.TransactionClient,
  shopId: string,
  shop: ShopForOrder,
): Promise<number> {
  const number = shop.nextOrderNumber;
  await tx.shop.update({
    where: { id: shopId },
    data: { nextOrderNumber: number + 1 },
  });
  return number;
}
