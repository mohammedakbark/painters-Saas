'use server';

import { refresh } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import type { ComboboxOption } from '@/components/ui/combobox';
import {
  changeOrderStatus,
  markItemNotAvailable,
  offerSubstitute,
  type OrderStatus,
  type PaymentMethod,
  recordPayment,
  returnItem,
} from '@/lib/api/orders';
import { ApiError } from '@/lib/api/problem';
import { listProductRows } from '@/lib/api/shop-catalogue';
import { requireShopSession, SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import {
  CATALOGUE_MESSAGES,
  type CatalogueFormState,
  catalogueFieldErrors,
  formValues,
} from '@/lib/catalogue/form-state';
import { formatRupees } from '@/lib/money';
import {
  orderNumber,
  PAYMENT_METHOD_LABEL,
  STEP_DONE,
} from '@/lib/orders/labels';
import {
  checkQuantity,
  checkReason,
  messageField,
  messageFields,
  noteFrom,
} from '@/lib/orders/order-forms';

/*
 * Order Server Actions (ORD-002). The shop and order ids are only a request:
 * the API checks membership, the role and the order's step.
 */

const NOT_ALLOWED = 'Only the shop owner can do this.';

function failure(
  error: unknown,
  values?: Record<string, string>,
  fields: Record<string, string> = {},
): CatalogueFormState {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      redirect(SHOP_SIGN_IN_PATH);
    }
    if (error.code === 'shop_not_found' || error.code === 'order_not_found') {
      notFound();
    }
    if (error.code === 'shop_permission_denied') {
      return { values, error: NOT_ALLOWED };
    }
    const errors = error.problem?.errors ?? [];
    if (errors.length > 0 && error.status === 400) {
      const fieldErrors: Record<string, string> = {};
      for (const [path, message] of Object.entries(
        catalogueFieldErrors(errors),
      )) {
        fieldErrors[fields[path] ?? path] = message;
      }
      return { values, fieldErrors };
    }
    if (error.problem?.detail && [400, 404, 409].includes(error.status)) {
      return { values, error: error.problem.detail };
    }
  }
  return { values, error: CATALOGUE_MESSAGES.unavailable };
}

/** Moves the order to its next step (list rows and the order page). */
export async function moveOrderAction(
  shopId: string,
  orderId: string,
  number: number,
  to: OrderStatus,
): Promise<CatalogueFormState> {
  try {
    await changeOrderStatus(await requireShopSession(), shopId, orderId, {
      to,
    });
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { saved: `${orderNumber(number)}: ${STEP_DONE[to]}` };
}

export async function cancelOrderAction(
  shopId: string,
  orderId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, messageFields('cancel'));
  const reason = noteFrom(values, 'cancel');
  const invalid = checkReason(reason);
  if (invalid) {
    return {
      values,
      fieldErrors: { [messageField(values, 'cancel')]: invalid },
    };
  }
  try {
    await changeOrderStatus(await requireShopSession(), shopId, orderId, {
      to: 'CANCELLED',
      reason,
    });
  } catch (error) {
    return failure(error, values, { reason: 'cancelText' });
  }
  refresh();
  return { saved: 'Order cancelled. The customer sees your reason.' };
}

export async function notAvailableAction(
  shopId: string,
  orderId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, ['itemId', ...messageFields('na')]);
  const message = noteFrom(values, 'na');
  if (message.length < 2) {
    return {
      values,
      fieldErrors: {
        [messageField(values, 'na')]:
          values.naChoice === 'custom'
            ? 'Write the message for the customer.'
            : 'Choose a message for the customer.',
      },
    };
  }
  try {
    await markItemNotAvailable(
      await requireShopSession(),
      shopId,
      orderId,
      values.itemId,
      message,
    );
  } catch (error) {
    return failure(error, values, { message: 'naText' });
  }
  refresh();
  return {
    saved: 'Item marked not available. The customer sees your message.',
  };
}

export async function substituteAction(
  shopId: string,
  orderId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, [
    'itemId',
    'packId',
    'packTitle',
    'quantity',
    'shadeCode',
    ...messageFields('sub'),
  ]);
  const fieldErrors: Record<string, string> = {};
  if (!values.packId) {
    fieldErrors.pack = 'Search for the product and pick a pack size.';
  }
  const quantity = checkQuantity(values.quantity);
  if (typeof quantity === 'string') {
    fieldErrors.quantity = quantity;
  }
  // The API asks for a message unless the item already has one.
  const message = noteFrom(values, 'sub');
  if (values.shadeCode.trim().length > 40) {
    fieldErrors.shadeCode = 'The shade code can be at most 40 characters.';
  }
  if (Object.keys(fieldErrors).length > 0 || typeof quantity === 'string') {
    return { values, fieldErrors };
  }
  try {
    await offerSubstitute(
      await requireShopSession(),
      shopId,
      orderId,
      values.itemId,
      {
        shopProductPackId: values.packId,
        quantity,
        ...(values.shadeCode.trim()
          ? { shadeCode: values.shadeCode.trim() }
          : {}),
        ...(message ? { message } : {}),
      },
    );
  } catch (error) {
    return failure(error, values, {
      shopProductPackId: 'pack',
      message: 'subText',
    });
  }
  refresh();
  return {
    saved: 'Substitute suggested. It counts once the customer accepts.',
  };
}

export async function recordPaymentAction(
  shopId: string,
  orderId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, ['method']);
  if (!(values.method in PAYMENT_METHOD_LABEL)) {
    return { values, fieldErrors: { method: 'Choose how the customer paid.' } };
  }
  const method = values.method as PaymentMethod;
  try {
    await recordPayment(await requireShopSession(), shopId, orderId, method);
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return { saved: `Payment recorded: ${PAYMENT_METHOD_LABEL[method]}.` };
}

export async function returnItemAction(
  shopId: string,
  orderId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, ['itemId', 'quantity', 'reason']);
  const quantity = checkQuantity(values.quantity);
  const reason = values.reason.trim();
  const fieldErrors: Record<string, string> = {};
  if (typeof quantity === 'string') {
    fieldErrors.quantity = quantity;
  }
  const invalid = checkReason(reason);
  if (invalid) {
    fieldErrors.reason = invalid;
  }
  if (Object.keys(fieldErrors).length > 0 || typeof quantity === 'string') {
    return { values, fieldErrors };
  }
  try {
    await returnItem(
      await requireShopSession(),
      shopId,
      orderId,
      values.itemId,
      {
        quantity,
        reason,
      },
    );
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return { saved: 'Return recorded. The order total is updated.' };
}

/** Available pack sizes of the shop for the substitute search. */
export interface PackOption extends ComboboxOption {
  pricePaise: number;
}

export async function searchPacksAction(
  shopId: string,
  text: string,
): Promise<PackOption[]> {
  const q = text.trim().slice(0, 60);
  if (q.length < 2) {
    return [];
  }
  try {
    const page = await listProductRows(await requireShopSession(), shopId, {
      tab: 'ALL',
      status: 'ACTIVE',
      q,
      show: 'all',
      sort: 'name',
      page: 1,
      pageSize: 10,
    });
    return page.items.flatMap((row) =>
      row.catalogueActive
        ? row.packs
            .filter((pack) => pack.available)
            .map((pack) => ({
              id: pack.id,
              pricePaise: pack.pricePaise,
              title: `${row.name} · ${pack.label}`,
              detail: [row.brandName, formatRupees(pack.pricePaise)]
                .filter(Boolean)
                .join(' · '),
            }))
        : [],
    );
  } catch {
    return [];
  }
}
