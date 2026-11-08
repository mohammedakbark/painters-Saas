import type {
  OrderFulfilment,
  OrderItemStatus,
  OrderStatus,
} from '../generated/prisma/enums.js';

/**
 * Order rules (ORD-001, D-045 to D-047, D-053). Pure functions so the service,
 * the seed script and unit tests share one definition.
 */

/** Steps a shop may move an order to, from each status. */
const SHOP_STEPS: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ['PACKING', 'CANCELLED'],
  PACKING: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_PICKUP: ['COMPLETED'],
  OUT_FOR_DELIVERY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Whether the shop may move an order from `from` to `to`. */
export function canShopMove(
  from: OrderStatus,
  to: OrderStatus,
  fulfilment: OrderFulfilment,
): boolean {
  if (!SHOP_STEPS[from].includes(to)) {
    return false;
  }
  if (to === 'READY_FOR_PICKUP') {
    return fulfilment === 'PICKUP';
  }
  if (to === 'OUT_FOR_DELIVERY') {
    return fulfilment === 'DELIVERY';
  }
  return true;
}

/** The next steps a shop can take, for the order screen. */
export function nextShopSteps(
  from: OrderStatus,
  fulfilment: OrderFulfilment,
): OrderStatus[] {
  return SHOP_STEPS[from].filter((to) => canShopMove(from, to, fulfilment));
}

/** The customer can cancel until the order is ready or dispatched (D-047). */
export function customerCanCancel(status: OrderStatus): boolean {
  return status === 'NEW' || status === 'PACKING';
}

/** Items can be marked not available or substituted while being prepared. */
export function itemsEditable(status: OrderStatus): boolean {
  return status === 'NEW' || status === 'PACKING';
}

/** Payment is recorded once the order is ready, dispatched or completed. */
export function canRecordPayment(status: OrderStatus): boolean {
  return (
    status === 'READY_FOR_PICKUP' ||
    status === 'OUT_FOR_DELIVERY' ||
    status === 'COMPLETED'
  );
}

/** Statuses counted as "open" (still to be handed over). */
/** Ready for the customer: waiting at the shop or on the way. */
export const READY_STATUSES: readonly OrderStatus[] = [
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
];

export const OPEN_STATUSES: readonly OrderStatus[] = [
  'NEW',
  'PACKING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
];

export interface CountableItem {
  status: OrderItemStatus;
  unitPricePaise: number;
  quantity: number;
  returnedQuantity: number;
}

/** Only OK lines count; returned units are taken off. */
export function itemsTotal(items: readonly CountableItem[]): number {
  return items.reduce(
    (sum, item) =>
      item.status === 'OK'
        ? sum + item.unitPricePaise * (item.quantity - item.returnedQuantity)
        : sum,
    0,
  );
}

export interface DeliverySettings {
  enabled: boolean;
  chargePaise: number | null;
  freeAbovePaise: number | null;
  radiusKm: number | null;
}

/**
 * The delivery charge when the order is placed (D-046): the flat charge, or
 * free from the free-delivery amount. It stays fixed afterwards so a missing
 * item never makes the customer pay more.
 */
export function deliveryCharge(
  settings: DeliverySettings,
  itemsTotalPaise: number,
): number {
  const charge = settings.chargePaise ?? 0;
  if (
    settings.freeAbovePaise !== null &&
    itemsTotalPaise >= settings.freeAbovePaise
  ) {
    return 0;
  }
  return charge;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km (D-049: delivery area is a radius). */
export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(to.latitude - from.latitude);
  const dLng = rad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.latitude)) *
      Math.cos(rad(to.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}
