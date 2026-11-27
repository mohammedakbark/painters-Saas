import { HttpStatus } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import { billBalance } from '../bills/bill-ledger.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';
import { hasShopPermission } from '../shop-access/shop-permissions.js';
import { problem } from '../shop-catalogue/shop-catalogue-mapping.js';
import {
  type CreditStatus,
  type CreditWarning,
  creditState,
  creditWarning,
} from './credit-rules.js';

/**
 * Credit in the database (CRD-001, D-064). Callers lock the customer's bill
 * row first (`lockBill`), so a limit change, an order acceptance and a
 * payment run one after the other.
 */

/** The customer's credit with this shop now, from its events. */
export async function readCredit(
  tx: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
): Promise<{ status: CreditStatus; limitPaise: number | null }> {
  const events = await tx.creditEvent.findMany({
    where: {
      shopId,
      customerId,
      kind: { in: ['GIVEN', 'LIMIT_CHANGED', 'STOPPED'] },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { kind: true, limitPaise: true },
  });
  return creditState(events);
}

/**
 * What the customer owes with their accepted orders: the bill balance plus
 * orders being packed or on their way that are not on the bill yet. [except]
 * leaves out the order being checked.
 */
export async function creditOwed(
  tx: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
  except?: string,
): Promise<number> {
  const [balance, open] = await Promise.all([
    billBalance(tx, shopId, customerId),
    tx.order.aggregate({
      where: {
        shopId,
        customerId,
        chargedAt: null,
        status: { in: ['PACKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] },
        ...(except ? { id: { not: except } } : {}),
      },
      _sum: { totalPaise: true },
    }),
  ]);
  return balance + (open._sum.totalPaise ?? 0);
}

/** The warning for an order of [orderPaise] (null: nothing to warn about). */
export async function orderCreditWarning(
  tx: Prisma.TransactionClient,
  input: {
    shopId: string;
    customerId: string;
    orderPaise: number;
    orderId?: string;
  },
): Promise<CreditWarning | null> {
  const [credit, owedPaise] = await Promise.all([
    readCredit(tx, input.shopId, input.customerId),
    creditOwed(tx, input.shopId, input.customerId, input.orderId),
  ]);
  return creditWarning({ ...credit, owedPaise, orderPaise: input.orderPaise });
}

/** Whether the member may see credit figures (limits and amounts). */
export function canSeeCreditFigures(shop: ShopContext): boolean {
  return (
    hasShopPermission(shop, 'credit.manage') ||
    hasShopPermission(shop, 'reports.view')
  );
}

/** The warning as the member may see it: figures only with permission. */
export function warningFor(
  shop: ShopContext,
  warning: CreditWarning | null,
): {
  kind: CreditWarning['kind'];
  owedPaise: number | null;
  limitPaise: number | null;
} | null {
  if (!warning) return null;
  return canSeeCreditFigures(shop)
    ? warning
    : { kind: warning.kind, owedPaise: null, limitPaise: null };
}

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** 409 when an order would go past the limit and the shop has not agreed. */
export function creditOverLimit(
  shop: ShopContext,
  warning: CreditWarning,
): Error {
  const detail = canSeeCreditFigures(shop)
    ? `This order takes the customer to ${rupees(warning.owedPaise)}, over their credit limit of ${rupees(warning.limitPaise ?? 0)}. Accept it anyway or ask for payment first.`
    : 'This order takes the customer over their credit limit. Accept it anyway or ask for payment first.';
  return problem(
    HttpStatus.CONFLICT,
    'credit_over_limit',
    detail,
    'acceptOverLimit',
  );
}

/**
 * Checks an order against the customer's credit before it is accepted
 * (D-064 rule 6). Over the limit: refused unless [accept], and then
 * recorded once per order as an OVERRIDE. Returns the warning.
 */
export async function checkOrderCredit(
  tx: Prisma.TransactionClient,
  input: {
    shop: ShopContext;
    userId: string;
    customerId: string;
    orderId: string;
    orderPaise: number;
    accept: boolean;
  },
): Promise<CreditWarning | null> {
  const shopId = input.shop.shopId;
  const warning = await orderCreditWarning(tx, {
    shopId,
    customerId: input.customerId,
    orderPaise: input.orderPaise,
    orderId: input.orderId,
  });
  if (warning?.kind !== 'over_limit') return warning;
  const agreed = await tx.creditEvent.findFirst({
    where: { shopId, orderId: input.orderId, kind: 'OVERRIDE' },
    select: { id: true },
  });
  if (agreed) return warning;
  if (!input.accept) throw creditOverLimit(input.shop, warning);
  const event = await tx.creditEvent.create({
    data: {
      shopId,
      customerId: input.customerId,
      kind: 'OVERRIDE',
      limitPaise: warning.limitPaise,
      owedPaise: warning.owedPaise,
      orderId: input.orderId,
      createdByUserId: input.userId,
    },
    select: { id: true },
  });
  await recordAuditEvent(tx, {
    actor: { type: 'USER', userId: input.userId },
    action: AuditAction.CreditOverride,
    entityType: 'credit_event',
    entityId: event.id,
    shopId,
    metadata: {
      customerId: input.customerId,
      orderId: input.orderId,
      owedPaise: warning.owedPaise,
      limitPaise: warning.limitPaise,
    },
  });
  return warning;
}
