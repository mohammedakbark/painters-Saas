'use server';

import { refresh } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/problem';
import {
  getShopSettings,
  updateDeliverySettings,
  updateOrderMessages,
} from '@/lib/api/shop-settings';
import { requireShopSession, SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import {
  CATALOGUE_MESSAGES,
  type CatalogueFormState,
  catalogueFieldErrors,
  formValues,
} from '@/lib/catalogue/form-state';
import {
  checkOrderMessage,
  MAX_ORDER_MESSAGES,
  parseDeliveryForm,
} from '@/lib/shops/settings';

/*
 * Shop settings Server Actions (SHP-008). The shop id is only a request: the
 * API checks membership and the owner role.
 */

const NOT_ALLOWED = 'Only the shop owner can change the settings.';
const CHANGED =
  'The messages were changed somewhere else. Check the list and try again.';

/** API path → form field. */
const DELIVERY_FIELDS: Record<string, string> = {
  chargePaise: 'charge',
  freeAbovePaise: 'freeAbove',
  radiusKm: 'radius',
};

function failure(
  error: unknown,
  values?: Record<string, string>,
  fields: Record<string, string> = {},
): CatalogueFormState {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      redirect(SHOP_SIGN_IN_PATH);
    }
    if (error.code === 'shop_not_found') {
      notFound();
    }
    if (error.code === 'shop_permission_denied') {
      return { values, error: NOT_ALLOWED };
    }
    const errors = error.problem?.errors ?? [];
    if (errors.length > 0) {
      const fieldErrors: Record<string, string> = {};
      for (const [path, message] of Object.entries(
        catalogueFieldErrors(errors),
      )) {
        fieldErrors[fields[path] ?? path] = message;
      }
      return { values, fieldErrors };
    }
    if (error.problem?.detail && [400, 409].includes(error.status)) {
      return { values, error: error.problem.detail };
    }
  }
  return { values, error: CATALOGUE_MESSAGES.unavailable };
}

export async function saveDeliveryAction(
  shopId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, [
    'enabled',
    'charge',
    'freeAbove',
    'radius',
  ]);
  const parsed = parseDeliveryForm(values);
  if (!parsed.ok) {
    return { values, fieldErrors: parsed.fieldErrors };
  }
  try {
    await updateDeliverySettings(
      await requireShopSession(),
      shopId,
      parsed.body,
    );
  } catch (error) {
    return failure(error, values, DELIVERY_FIELDS);
  }
  refresh();
  return {
    values,
    saved: parsed.body.enabled
      ? 'Delivery is on. Customers can choose pickup or delivery.'
      : 'Delivery is off. Customers pick up their orders.',
  };
}

/**
 * Changes the message list. `edit` gets the current list and returns the new
 * one, or an error; it must check that the message it changes is still there.
 */
async function changeMessages(
  shopId: string,
  values: Record<string, string>,
  edit: (messages: string[]) => string[] | { error: string },
  saved: string,
): Promise<CatalogueFormState> {
  const token = await requireShopSession();
  try {
    const current = await getShopSettings(token, shopId);
    const next = edit(current.orderMessages);
    if (!Array.isArray(next)) {
      return { values, error: next.error };
    }
    await updateOrderMessages(token, shopId, next);
  } catch (error) {
    return failure(error, values, { messages: 'message' });
  }
  refresh();
  return { saved };
}

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

export async function addOrderMessageAction(
  shopId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, ['message']);
  const message = values.message.trim();
  const invalid = checkOrderMessage(message);
  if (invalid) {
    return { values, fieldErrors: { message: invalid } };
  }
  return changeMessages(
    shopId,
    values,
    (messages) => {
      if (messages.length >= MAX_ORDER_MESSAGES) {
        return { error: `Keep at most ${MAX_ORDER_MESSAGES} messages.` };
      }
      if (messages.some((text) => same(text, message))) {
        return { error: 'You already have this message.' };
      }
      return [...messages, message];
    },
    'Message added.',
  );
}

export async function editOrderMessageAction(
  shopId: string,
  index: number,
  original: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, ['message']);
  const message = values.message.trim();
  const invalid = checkOrderMessage(message);
  if (invalid) {
    return { values, fieldErrors: { message: invalid } };
  }
  return changeMessages(
    shopId,
    values,
    (messages) => {
      if (messages[index] !== original) {
        return { error: CHANGED };
      }
      if (messages.some((text, i) => i !== index && same(text, message))) {
        return { error: 'You already have this message.' };
      }
      return messages.map((text, i) => (i === index ? message : text));
    },
    'Message saved.',
  );
}

export async function removeOrderMessageAction(
  shopId: string,
  index: number,
  original: string,
): Promise<CatalogueFormState> {
  return changeMessages(
    shopId,
    {},
    (messages) =>
      messages[index] === original
        ? messages.filter((_, i) => i !== index)
        : { error: CHANGED },
    'Message removed.',
  );
}
