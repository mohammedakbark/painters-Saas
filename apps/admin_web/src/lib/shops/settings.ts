// Shop settings forms (SHP-008): people type rupees and km; the API takes
// paise and whole km. Limits match the API (shop-settings.schemas.ts).

import { parseRupees } from '@/lib/money';
import type { DeliverySettings } from '@/lib/api/shop-settings';

export const MAX_DELIVERY_CHARGE_PAISE = 1_000_000;
export const MAX_RADIUS_KM = 50;
export const MAX_ORDER_MESSAGES = 10;

export type DeliveryParse =
  | { ok: true; body: DeliverySettings }
  | { ok: false; fieldErrors: Record<string, string> };

/**
 * Delivery on needs a charge (0 means free) and a distance; the free-above
 * amount is optional. Values are kept while delivery is off.
 */
export function parseDeliveryForm(
  values: Record<string, string>,
): DeliveryParse {
  const enabled = values.enabled === 'on';
  const errors: Record<string, string> = {};

  const chargeText = (values.charge ?? '').trim();
  let chargePaise: number | null = null;
  if (/^(₹|rs\.?)?\s*0+(\.0{1,2})?$/i.test(chargeText)) {
    chargePaise = 0;
  } else if (chargeText !== '') {
    const charge = parseRupees(chargeText, 'delivery charge');
    if (!charge.ok) {
      errors.charge = charge.message;
    } else if (charge.paise > MAX_DELIVERY_CHARGE_PAISE) {
      errors.charge = 'The delivery charge can be at most ₹10,000.';
    } else {
      chargePaise = charge.paise;
    }
  } else if (enabled) {
    errors.charge = 'Enter the delivery charge (0 for free delivery).';
  }

  const freeText = (values.freeAbove ?? '').trim();
  let freeAbovePaise: number | null = null;
  if (freeText !== '') {
    const free = parseRupees(freeText, 'amount');
    if (free.ok) {
      freeAbovePaise = free.paise;
    } else {
      errors.freeAbove = free.message;
    }
  }

  const radiusText = (values.radius ?? '').trim();
  let radiusKm: number | null = null;
  if (radiusText !== '') {
    const radius = Number(radiusText);
    if (!/^\d+$/.test(radiusText) || radius < 1 || radius > MAX_RADIUS_KM) {
      errors.radius = `Enter a whole number of km from 1 to ${MAX_RADIUS_KM}.`;
    } else {
      radiusKm = radius;
    }
  } else if (enabled) {
    errors.radius = 'Enter how far you deliver, in km.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  return {
    ok: true,
    body: { enabled, chargePaise, freeAbovePaise, radiusKm },
  };
}

/** A message for a "not available" item: trimmed, 2 to 160 characters. */
export function checkOrderMessage(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    return 'Enter the message (at least 2 characters).';
  }
  if (trimmed.length > 160) {
    return 'Keep the message to 160 characters.';
  }
  return null;
}
