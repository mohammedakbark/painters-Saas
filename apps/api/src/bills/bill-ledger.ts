import type { Prisma } from '../generated/prisma/client.js';
import type { PaymentMethod } from '../generated/prisma/enums.js';
import {
  lockOrder,
  type LockedOrder,
  orderNotFound,
} from '../orders/order-locks.js';

/**
 * The running bill (BIL-001, D-062). Bill entries are the record: the
 * balance is their sum, never a stored number. Each order's `paid_paise`
 * says which charged orders the payments cover, oldest first, so an order's
 * Paid / Part paid state always matches the bill.
 *
 * Every change locks the customer's bill row first and then the order, in
 * that order everywhere, so concurrent payments and order changes run one
 * after the other without deadlocks.
 */

/** Locks one shop customer's bill for the rest of the transaction. */
export async function lockBill(
  tx: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM shop_customers
    WHERE id = ${customerId}::uuid AND shop_id = ${shopId}::uuid
    FOR UPDATE`;
  return rows.length > 0;
}

/**
 * Locks the order's customer bill, then the order. Use for every order
 * change that can touch the bill (completing, paying, returns).
 */
export async function lockOrderAndBill(
  tx: Prisma.TransactionClient,
  shopId: string,
  orderId: string,
): Promise<LockedOrder> {
  const owner = await tx.order.findFirst({
    where: { id: orderId, shopId },
    select: { customerId: true },
  });
  if (!owner) throw orderNotFound();
  await lockBill(tx, shopId, owner.customerId);
  return lockOrder(tx, shopId, orderId);
}

/** The balance: positive, the customer owes; negative, the shop owes. */
export async function billBalance(
  tx: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
): Promise<number> {
  const sum = await tx.billEntry.aggregate({
    where: { shopId, customerId },
    _sum: { amountPaise: true },
  });
  return sum._sum.amountPaise ?? 0;
}

/**
 * Puts the order on the bill at its total, once: when it is completed, or
 * earlier when it is paid on the order itself. Returns false when it was
 * already charged.
 */
export async function chargeOrder(
  tx: Prisma.TransactionClient,
  shopId: string,
  orderId: string,
  at: Date,
): Promise<boolean> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { customerId: true, totalPaise: true, chargedAt: true },
  });
  if (order.chargedAt !== null) return false;
  await tx.billEntry.create({
    data: {
      shopId,
      customerId: order.customerId,
      kind: 'CHARGE',
      amountPaise: order.totalPaise,
      orderId,
      createdAt: at,
    },
  });
  await tx.order.update({ where: { id: orderId }, data: { chargedAt: at } });
  return true;
}

/**
 * Records a change of a charged order's total, such as a return
 * (`newTotal - oldTotal`). Nothing for an order that is not on the bill yet.
 */
export async function adjustOrder(
  tx: Prisma.TransactionClient,
  input: {
    shopId: string;
    orderId: string;
    deltaPaise: number;
    reason: string;
    userId: string;
  },
): Promise<void> {
  if (input.deltaPaise === 0) return;
  const order = await tx.order.findUniqueOrThrow({
    where: { id: input.orderId },
    select: { customerId: true, chargedAt: true },
  });
  if (order.chargedAt === null) return;
  await tx.billEntry.create({
    data: {
      shopId: input.shopId,
      customerId: order.customerId,
      kind: 'ADJUSTMENT',
      amountPaise: input.deltaPaise,
      orderId: input.orderId,
      note: input.reason,
      createdByUserId: input.userId,
    },
  });
}

export interface PaidBy {
  userId: string;
  method: PaymentMethod;
}

/**
 * Pays what is left on one order, on the order itself (the order page's
 * "Mark paid"). Charges it first. Returns the amount paid, 0 when nothing
 * was left.
 */
export async function payOrder(
  tx: Prisma.TransactionClient,
  shopId: string,
  orderId: string,
  by: PaidBy,
): Promise<number> {
  const now = new Date();
  await chargeOrder(tx, shopId, orderId, now);
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { customerId: true, totalPaise: true, paidPaise: true },
  });
  const left = order.totalPaise - order.paidPaise;
  if (left > 0) {
    await tx.billEntry.create({
      data: {
        shopId,
        customerId: order.customerId,
        kind: 'PAYMENT',
        amountPaise: -left,
        orderId,
        method: by.method,
        createdByUserId: by.userId,
        createdAt: now,
      },
    });
  }
  await tx.order.update({
    where: { id: orderId },
    data: {
      paidPaise: order.totalPaise,
      paymentStatus: 'PAID',
      paymentMethod: by.method,
      paidAt: now,
      paidByUserId: by.userId,
    },
  });
  await settleBill(tx, shopId, order.customerId, by);
  return Math.max(left, 0);
}

/**
 * Spreads the payments that no order holds yet over the customer's charged
 * orders, oldest first, and takes back what an order holds beyond its total
 * (after a return). Run after every bill change; running it again changes
 * nothing. [by] names who paid for orders that become fully paid.
 */
export async function settleBill(
  tx: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
  by?: { userId: string; method?: PaymentMethod },
): Promise<void> {
  const charged = { shopId, customerId, chargedAt: { not: null } } as const;
  const [paid, refunded, held] = await Promise.all([
    tx.billEntry.aggregate({
      where: { shopId, customerId, kind: 'PAYMENT' },
      _sum: { amountPaise: true },
    }),
    tx.billEntry.aggregate({
      where: { shopId, customerId, kind: 'REFUND' },
      _sum: { amountPaise: true },
    }),
    tx.order.aggregate({ where: charged, _sum: { paidPaise: true } }),
  ]);
  const open = await tx.$queryRaw<
    { id: string; total_paise: number; paid_paise: number }[]
  >`
    SELECT id, total_paise, paid_paise FROM orders
    WHERE shop_id = ${shopId}::uuid AND customer_id = ${customerId}::uuid
      AND charged_at IS NOT NULL AND paid_paise <> total_paise
    ORDER BY charged_at, number
    FOR UPDATE`;

  // Payments (negative entries) minus refunds, less what orders already hold.
  let free =
    -(paid._sum.amountPaise ?? 0) -
    (refunded._sum.amountPaise ?? 0) -
    (held._sum.paidPaise ?? 0);
  const next = new Map<string, number>();
  for (const order of open) {
    if (order.paid_paise > order.total_paise) {
      free += order.paid_paise - order.total_paise;
      next.set(order.id, order.total_paise);
    }
  }
  for (const order of open) {
    if (free <= 0) break;
    const current = next.get(order.id) ?? order.paid_paise;
    const take = Math.min(free, order.total_paise - current);
    if (take <= 0) continue;
    next.set(order.id, current + take);
    free -= take;
  }

  const now = new Date();
  // An order paid from money the shop already held takes the method of the
  // customer's latest payment (a paid order always names one).
  let heldMethod: PaymentMethod | undefined = by?.method;
  const methodOfHeld = async (): Promise<PaymentMethod> => {
    if (heldMethod) return heldMethod;
    const last = await tx.billEntry.findFirst({
      where: { shopId, customerId, kind: 'PAYMENT' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { method: true },
    });
    heldMethod = last?.method ?? 'CASH';
    return heldMethod;
  };
  for (const order of open) {
    const paidPaise = next.get(order.id);
    if (paidPaise === undefined || paidPaise === order.paid_paise) continue;
    const full = paidPaise >= order.total_paise;
    // A return trims an order that was already paid; it stays paid as it was.
    const newlyPaid = full && order.paid_paise < order.total_paise;
    await tx.order.update({
      where: { id: order.id },
      data: {
        paidPaise,
        paymentStatus: full ? 'PAID' : 'UNPAID',
        ...(newlyPaid
          ? {
              paidAt: now,
              ...(by?.userId ? { paidByUserId: by.userId } : {}),
              paymentMethod: await methodOfHeld(),
            }
          : {}),
      },
    });
    await tx.orderEvent.create({
      data: {
        shopId,
        orderId: order.id,
        type: 'bill_applied',
        actor: by ? 'SHOP' : 'SYSTEM',
        actorUserId: by?.userId ?? null,
        data: { paidPaise, totalPaise: order.total_paise },
      },
    });
  }
}
