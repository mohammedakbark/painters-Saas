import { HttpStatus } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  OrderFulfilment,
  OrderPaymentStatus,
  OrderStatus,
} from '../generated/prisma/enums.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import { itemsTotal } from './order-rules.js';

export const orderNotFound = () =>
  problem(HttpStatus.NOT_FOUND, 'order_not_found', 'Order not found.');

export interface LockedOrder {
  id: string;
  customerId: string;
  status: OrderStatus;
  fulfilment: OrderFulfilment;
  paymentStatus: OrderPaymentStatus;
}

/**
 * Locks this shop's order row for the rest of the transaction, so two changes
 * to one order run one after the other. Another shop's order is not found.
 */
export async function lockOrder(
  tx: Prisma.TransactionClient,
  shopId: string,
  orderId: string,
): Promise<LockedOrder> {
  const [order] = await tx.$queryRaw<
    {
      id: string;
      customer_id: string;
      status: OrderStatus;
      fulfilment: OrderFulfilment;
      payment_status: OrderPaymentStatus;
    }[]
  >`
    SELECT id, customer_id, status, fulfilment, payment_status
    FROM orders
    WHERE id = ${orderId}::uuid AND shop_id = ${shopId}::uuid
    FOR UPDATE`;
  if (!order) {
    throw orderNotFound();
  }
  return {
    id: order.id,
    customerId: order.customer_id,
    status: order.status,
    fulfilment: order.fulfilment,
    paymentStatus: order.payment_status,
  };
}

/** Recomputes the totals from the lines; the delivery charge stays fixed. */
export async function recalculateTotals(
  tx: Prisma.TransactionClient,
  shopId: string,
  orderId: string,
): Promise<void> {
  // One connection per transaction: run the reads one after the other.
  const items = await tx.orderItem.findMany({
    where: { orderId, shopId },
    select: {
      status: true,
      unitPricePaise: true,
      quantity: true,
      returnedQuantity: true,
    },
  });
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { deliveryChargePaise: true },
  });
  const itemsPaise = itemsTotal(items);
  await tx.order.update({
    where: { id: orderId },
    data: {
      itemsTotalPaise: itemsPaise,
      totalPaise: itemsPaise + order.deliveryChargePaise,
    },
  });
}
