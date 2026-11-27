import type { CreditEventKind } from '../generated/prisma/enums.js';

/**
 * Shop credit rules (CRD-001, D-064), free of the database so they can be
 * unit tested. The record is the shop's append-only credit events; the
 * current state is read from the latest ones.
 */

export type CreditStatus = 'none' | 'active' | 'stopped';

export interface CreditStateEvent {
  kind: CreditEventKind;
  limitPaise: number | null;
}

/** The customer's credit now, from their events oldest first. */
export function creditState(events: readonly CreditStateEvent[]): {
  status: CreditStatus;
  limitPaise: number | null;
} {
  let status: CreditStatus = 'none';
  let limitPaise: number | null = null;
  for (const event of events) {
    if (event.kind === 'GIVEN' || event.kind === 'LIMIT_CHANGED') {
      status = 'active';
      limitPaise = event.limitPaise;
    } else if (event.kind === 'STOPPED') {
      status = 'stopped';
      limitPaise = null;
    }
  }
  return { status, limitPaise };
}

export type CreditWarningKind = 'over_limit' | 'no_credit';

export interface CreditWarning {
  kind: CreditWarningKind;
  /** What the customer would owe with this order (bill plus open orders). */
  owedPaise: number;
  limitPaise: number | null;
}

/**
 * The warning for one order (D-064 rules 6 and 7). [owedPaise] is the bill
 * balance plus the customer's other accepted orders that are not on the bill
 * yet; [orderPaise] is this order's total. Warnings never block: an
 * over-limit order needs the shop to accept it anyway, a no-credit one is
 * shown only.
 */
export function creditWarning(input: {
  status: CreditStatus;
  limitPaise: number | null;
  owedPaise: number;
  orderPaise: number;
}): CreditWarning | null {
  const withOrder = input.owedPaise + input.orderPaise;
  if (input.status === 'active' && input.limitPaise !== null) {
    return withOrder > input.limitPaise
      ? {
          kind: 'over_limit',
          owedPaise: withOrder,
          limitPaise: input.limitPaise,
        }
      : null;
  }
  return input.owedPaise > 0
    ? { kind: 'no_credit', owedPaise: withOrder, limitPaise: null }
    : null;
}
