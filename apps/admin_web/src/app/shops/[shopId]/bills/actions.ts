'use server';

import { refresh } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { recordBillMoney } from '@/lib/api/bills';
import type { PaymentMethod } from '@/lib/api/orders';
import { ApiError } from '@/lib/api/problem';
import { requireShopSession, SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import {
  CATALOGUE_MESSAGES,
  type CatalogueFormState,
  formValues,
} from '@/lib/catalogue/form-state';
import { formatRupees, parseRupees } from '@/lib/money';
import { PAYMENT_METHOD_LABEL } from '@/lib/orders/labels';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTE_MAX = 300;

/*
 * A payment or refund on a customer's running bill (BIL-001, D-062). The ids
 * are only a request: the API checks membership, the payments permission and
 * that the customer belongs to this shop, and caps the amount.
 */
export async function recordBillMoneyAction(
  shopId: string,
  customerId: string,
  kind: 'payments' | 'refunds',
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, [
    'amount',
    'method',
    'note',
    'clientRequestId',
  ]);
  const fieldErrors: Record<string, string> = {};
  const amount = parseRupees(values.amount, 'amount');
  if (!amount.ok) fieldErrors.amount = amount.message;
  else if (amount.paise < 100)
    fieldErrors.amount = 'The amount must be at least ₹1.';
  if (!(values.method in PAYMENT_METHOD_LABEL)) {
    fieldErrors.method =
      kind === 'payments'
        ? 'Choose how the customer paid.'
        : 'Choose how you paid it back.';
  }
  const note = values.note.trim();
  if (note.length > NOTE_MAX) {
    fieldErrors.note = `The note can be at most ${NOTE_MAX} characters.`;
  }
  if (!amount.ok || Object.keys(fieldErrors).length > 0) {
    return { values, fieldErrors };
  }
  if (!UUID.test(values.clientRequestId)) {
    return { values, error: CATALOGUE_MESSAGES.unavailable };
  }
  try {
    await recordBillMoney(
      await requireShopSession(),
      shopId,
      customerId,
      kind,
      {
        amountPaise: amount.paise,
        method: values.method as PaymentMethod,
        note: note || null,
        clientRequestId: values.clientRequestId,
      },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect(SHOP_SIGN_IN_PATH);
      if (error.code === 'shop_not_found') notFound();
      const detail = error.problem?.detail;
      if (detail && [400, 403, 404, 409].includes(error.status)) {
        // Too much or nothing owed: the message belongs to the amount.
        return error.status === 409
          ? { values, fieldErrors: { amount: detail } }
          : { values, error: detail };
      }
    }
    return { values, error: CATALOGUE_MESSAGES.unavailable };
  }
  refresh();
  return {
    saved:
      kind === 'payments'
        ? `Payment of ${formatRupees(amount.paise)} recorded.`
        : `Refund of ${formatRupees(amount.paise)} recorded.`,
  };
}
