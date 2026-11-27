'use server';

import { refresh } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import {
  changeCredit,
  checkCreditId,
  ID_TYPES,
  type IdType,
} from '@/lib/api/credit';
import { ApiError } from '@/lib/api/problem';
import { requireShopSession, SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import {
  CATALOGUE_MESSAGES,
  type CatalogueFormState,
  formValues,
} from '@/lib/catalogue/form-state';
import { ID_TYPE_LABEL } from '@/lib/credit/labels';
import { formatRupees, parseRupees } from '@/lib/money';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REASON_MAX = 300;
const LIMIT_MAX_PAISE = 10_00_000_00;

/*
 * Credit for one customer (CRD-001, D-064). The ids are only a request: the
 * API checks membership, the credit permission and that the customer belongs
 * to this shop, and keeps only the last 4 characters of an ID.
 */

/** Maps an API refusal to the form; the rest is "try again". */
function refusal(
  error: unknown,
  values: Record<string, string>,
  field: string,
): CatalogueFormState {
  if (error instanceof ApiError) {
    if (error.status === 401) redirect(SHOP_SIGN_IN_PATH);
    if (error.code === 'shop_not_found') notFound();
    const detail = error.problem?.detail;
    if (detail && [400, 403, 404, 409].includes(error.status)) {
      const path = error.problem?.errors?.[0]?.path;
      return path
        ? {
            values,
            fieldErrors: { [path === 'limitPaise' ? 'limit' : path]: detail },
          }
        : error.status === 400
          ? { values, fieldErrors: { [field]: detail } }
          : { values, error: detail };
    }
  }
  return { values, error: CATALOGUE_MESSAGES.unavailable };
}

export async function checkIdAction(
  shopId: string,
  customerId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, ['type', 'last4', 'clientRequestId']);
  const sawOriginal = formData.get('sawOriginal') === 'on';
  const last4 = values.last4.trim().toUpperCase();
  const fieldErrors: Record<string, string> = {};
  if (!(ID_TYPES as readonly string[]).includes(values.type)) {
    fieldErrors.type = 'Choose the document you saw.';
  }
  if (!/^[A-Z0-9]{4}$/.test(last4)) {
    fieldErrors.last4 =
      'Enter only the last 4 letters or digits, never the full number.';
  }
  if (!sawOriginal) {
    fieldErrors.sawOriginal = 'Tick that you saw the original document.';
  }
  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors };
  if (!UUID.test(values.clientRequestId)) {
    return { values, error: CATALOGUE_MESSAGES.unavailable };
  }
  try {
    await checkCreditId(await requireShopSession(), shopId, customerId, {
      type: values.type as IdType,
      last4,
      sawOriginal: true,
      clientRequestId: values.clientRequestId,
    });
  } catch (error) {
    return refusal(error, values, 'last4');
  }
  refresh();
  return { saved: `${ID_TYPE_LABEL[values.type as IdType]} checked.` };
}

export async function changeCreditAction(
  shopId: string,
  customerId: string,
  action: 'give' | 'change' | 'stop',
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, ['limit', 'reason', 'clientRequestId']);
  const reason = values.reason.trim();
  const fieldErrors: Record<string, string> = {};
  let limitPaise = 0;
  if (action !== 'stop') {
    const limit = parseRupees(values.limit, 'limit');
    if (!limit.ok) fieldErrors.limit = limit.message;
    else if (limit.paise % 100 !== 0)
      fieldErrors.limit = 'Enter the limit in whole rupees.';
    else if (limit.paise > LIMIT_MAX_PAISE)
      fieldErrors.limit = 'The limit can be at most ₹10,00,000.';
    else limitPaise = limit.paise;
  }
  if (reason.length < 2) fieldErrors.reason = 'Enter a reason.';
  else if (reason.length > REASON_MAX)
    fieldErrors.reason = `The reason can be at most ${REASON_MAX} characters.`;
  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors };
  if (!UUID.test(values.clientRequestId)) {
    return { values, error: CATALOGUE_MESSAGES.unavailable };
  }
  try {
    await changeCredit(
      await requireShopSession(),
      shopId,
      customerId,
      action === 'stop'
        ? { action, reason, clientRequestId: values.clientRequestId }
        : {
            action,
            limitPaise,
            reason,
            clientRequestId: values.clientRequestId,
          },
    );
  } catch (error) {
    return refusal(error, values, 'reason');
  }
  refresh();
  return {
    saved:
      action === 'stop'
        ? 'Credit stopped.'
        : action === 'give'
          ? `Credit of ${formatRupees(limitPaise)} given.`
          : `Limit changed to ${formatRupees(limitPaise)}.`,
  };
}
