import type { BadgeTone } from '@/components/ui/badge';
import type { BillEntryKind } from '@/lib/api/bills';
import { formatRupees } from '@/lib/money';

/** Words for each bill entry (BIL-001). */
export const ENTRY_LABEL: Record<BillEntryKind, string> = {
  CHARGE: 'Order',
  ADJUSTMENT: 'Return',
  PAYMENT: 'Payment',
  REFUND: 'Refund',
};

/**
 * The balance in words and its badge: who owes whom. Owing and the shop
 * owing must never look alike (status colours, CLAUDE.md §6).
 */
export function balanceState(balancePaise: number): {
  label: string;
  amount: string;
  tone: BadgeTone;
} {
  if (balancePaise > 0) {
    return {
      label: 'Owes you',
      amount: formatRupees(balancePaise),
      tone: 'warning',
    };
  }
  if (balancePaise < 0) {
    return {
      label: 'You owe',
      amount: formatRupees(-balancePaise),
      tone: 'info',
    };
  }
  return { label: 'Settled', amount: formatRupees(0), tone: 'success' };
}

/** "+₹1,000" for what adds to the bill, "−₹500" for what takes from it. */
export function signedRupees(paise: number): string {
  return `${paise < 0 ? '−' : '+'}${formatRupees(Math.abs(paise))}`;
}

export const billsBase = (shopId: string) =>
  `/shops/${encodeURIComponent(shopId)}/bills`;
