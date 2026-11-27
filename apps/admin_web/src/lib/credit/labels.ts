import type { BadgeTone } from '@/components/ui/badge';
import type {
  CreditEvent,
  CreditStatus,
  CreditWarning,
  IdType,
} from '@/lib/api/credit';
import { formatRupees } from '@/lib/money';

/** Words for each ID document the shop may check (D-064). */
export const ID_TYPE_LABEL: Record<IdType, string> = {
  AADHAAR: 'Aadhaar',
  PAN: 'PAN card',
  VOTER_ID: 'Voter ID',
  DRIVING_LICENCE: 'Driving licence',
  PASSPORT: 'Passport',
};

/**
 * The credit state and its badge. Credit, over the limit, stopped and no
 * credit each have their own colour (CLAUDE.md §6).
 */
export function creditState(
  status: CreditStatus,
  leftPaise: number | null,
): { label: string; tone: BadgeTone } {
  if (status === 'active') {
    return leftPaise !== null && leftPaise < 0
      ? { label: 'Over limit', tone: 'error' }
      : { label: 'Credit', tone: 'success' };
  }
  if (status === 'stopped') return { label: 'Credit stopped', tone: 'warning' };
  return { label: 'No credit', tone: 'neutral' };
}

/** One line for a credit history event. */
export function creditEventLabel(event: CreditEvent): string {
  switch (event.kind) {
    case 'ID_CHECKED':
      return `ID checked · ${event.idType ? ID_TYPE_LABEL[event.idType] : 'ID'} ···${event.idLast4 ?? ''}`;
    case 'GIVEN':
      return `Credit given · ${formatRupees(event.limitPaise ?? 0)}`;
    case 'LIMIT_CHANGED':
      return `Limit changed · ${formatRupees(event.previousPaise ?? 0)} → ${formatRupees(event.limitPaise ?? 0)}`;
    case 'STOPPED':
      return `Credit stopped · was ${formatRupees(event.previousPaise ?? 0)}`;
    case 'OVERRIDE':
      return `Accepted over the limit · ${formatRupees(event.owedPaise ?? 0)} of ${formatRupees(event.limitPaise ?? 0)}`;
  }
}

/** The warning on an order before it is accepted (CRD-001). */
export function creditWarningText(warning: CreditWarning): {
  title: string;
  message: string;
} {
  const figures = warning.owedPaise !== null;
  if (warning.kind === 'over_limit') {
    return {
      title: 'Over credit limit',
      message: figures
        ? `With this order the customer owes ${formatRupees(warning.owedPaise ?? 0)}, over their limit of ${formatRupees(warning.limitPaise ?? 0)}. You can still accept it, or ask for payment first.`
        : 'This order takes the customer over their credit limit. You can still accept it, or ask for payment first.',
    };
  }
  return {
    title: 'No credit',
    message: figures
      ? `This customer has no credit with you and would owe ${formatRupees(warning.owedPaise ?? 0)} with this order.`
      : 'This customer has no credit with you and already owes money.',
  };
}
