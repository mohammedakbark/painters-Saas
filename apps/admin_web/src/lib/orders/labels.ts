import type { BadgeTone } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import { formatRupees } from '@/lib/money';

/** Words and colours for orders (ORD-002, D-053). Kept free of server code. */

export type OrderStatus =
  | 'NEW'
  | 'PACKING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderItemStatus =
  | 'OK'
  | 'NOT_AVAILABLE'
  | 'SUBSTITUTED'
  | 'SUBSTITUTE_OFFERED'
  | 'SUBSTITUTE_DECLINED';

/** Each status has its own colour; the words always name the step. */
export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; tone: BadgeTone }
> = {
  NEW: { label: 'New', tone: 'info' },
  PACKING: { label: 'Packing', tone: 'warning' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', tone: 'success' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'error' },
};

/** The button that moves an order to this step. */
export const STEP_ACTION: Record<OrderStatus, string> = {
  NEW: 'New',
  PACKING: 'Start packing',
  READY_FOR_PICKUP: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  COMPLETED: 'Mark completed',
  CANCELLED: 'Cancel order',
};

/** What the toast says after the step. */
export const STEP_DONE: Record<OrderStatus, string> = {
  NEW: 'Order is new.',
  PACKING: 'Packing started.',
  READY_FOR_PICKUP: 'Ready for pickup.',
  OUT_FOR_DELIVERY: 'Out for delivery.',
  COMPLETED: 'Order completed.',
  CANCELLED: 'Order cancelled.',
};

/** The next step offered on a list row: never cancelling. */
export function rowNextStep(nextSteps: readonly OrderStatus[]) {
  return nextSteps.find((step) => step !== 'CANCELLED') ?? null;
}

/** The next step of an order from its status and fulfilment. */
export function nextStepFor(
  status: OrderStatus,
  fulfilment: 'PICKUP' | 'DELIVERY',
): OrderStatus | null {
  switch (status) {
    case 'NEW':
      return 'PACKING';
    case 'PACKING':
      return fulfilment === 'PICKUP' ? 'READY_FOR_PICKUP' : 'OUT_FOR_DELIVERY';
    case 'READY_FOR_PICKUP':
    case 'OUT_FOR_DELIVERY':
      return 'COMPLETED';
    default:
      return null;
  }
}

export const ITEM_STATUS: Record<
  OrderItemStatus,
  { label: string; tone: BadgeTone } | null
> = {
  OK: null,
  NOT_AVAILABLE: { label: 'Not available', tone: 'warning' },
  SUBSTITUTED: { label: 'Replaced', tone: 'neutral' },
  SUBSTITUTE_OFFERED: { label: 'Waiting for the customer', tone: 'info' },
  SUBSTITUTE_DECLINED: { label: 'Declined by the customer', tone: 'neutral' },
};

export const FULFILMENT_LABEL = {
  PICKUP: 'Pickup',
  DELIVERY: 'Delivery',
} as const;

export const PAYMENT_METHOD_LABEL = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank transfer',
} as const;

export const orderNumber = (number: number) => `#${number}`;

export const ordersBase = (shopId: string) =>
  `/shops/${encodeURIComponent(shopId)}/orders`;

const TIME = new Intl.DateTimeFormat('en-IN', {
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});
const DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
});

/** "Today, 10:42 am", "Yesterday, 6:05 pm" or "3 Nov 2026, 9:10 am" (IST). */
export function formatOrderTime(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  const day = DAY.format(date);
  if (day === DAY.format(now)) {
    return `Today, ${TIME.format(date)}`;
  }
  if (day === DAY.format(now - 86_400_000)) {
    return `Yesterday, ${TIME.format(date)}`;
  }
  return formatDateTime(iso);
}

/** A timeline entry in plain words. */
export function eventSentence(event: {
  type: string;
  actor: 'CUSTOMER' | 'SHOP' | 'SYSTEM';
  data: Record<string, unknown>;
}): string {
  const by = event.actor === 'CUSTOMER' ? 'the customer' : 'the shop';
  const to = typeof event.data.to === 'string' ? event.data.to : null;
  switch (event.type) {
    case 'placed':
      return 'Order placed by the customer.';
    case 'status_changed':
      if (to === 'CANCELLED') {
        return `Cancelled by ${by}.`;
      }
      return to && to in ORDER_STATUS
        ? `Moved to ${ORDER_STATUS[to as OrderStatus].label.toLowerCase()}.`
        : 'Step changed.';
    case 'item_not_available':
      return 'An item was marked not available.';
    case 'substitute_offered':
      return 'A substitute was suggested.';
    case 'substitute_accepted':
      return 'The customer accepted the substitute.';
    case 'substitute_declined':
      return 'The customer declined the substitute.';
    case 'paid': {
      const method = event.data.method;
      return typeof method === 'string' && method in PAYMENT_METHOD_LABEL
        ? `Paid by ${PAYMENT_METHOD_LABEL[method as keyof typeof PAYMENT_METHOD_LABEL]}.`
        : 'Payment recorded.';
    }
    case 'item_returned': {
      const quantity = Number(event.data.quantity);
      const reason =
        typeof event.data.reason === 'string' ? ` ${event.data.reason}` : '';
      return `${quantity} ${quantity === 1 ? 'unit' : 'units'} returned.${reason ? ` Reason:${reason}` : ''}`;
    }
    default:
      return 'Order updated.';
  }
}

/** "2 × ₹450.00". */
export const quantityTimesPrice = (quantity: number, paise: number) =>
  `${quantity} × ${formatRupees(paise)}`;
