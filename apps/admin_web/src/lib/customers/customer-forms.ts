/** Words and checks for customers and sites (ORD-004). Free of server code. */

export const KIND_LABEL = {
  PAINTER: 'Painter',
  CUSTOMER: 'Customer',
} as const;

export const customersBase = (shopId: string) =>
  `/shops/${encodeURIComponent(shopId)}/customers`;
export const customerPath = (shopId: string, customerId: string) =>
  `${customersBase(shopId)}/${encodeURIComponent(customerId)}`;

export interface SiteFormBody {
  name: string;
  ownerName: string | null;
  address: string;
  pin: { latitude: number; longitude: number } | null;
}

/** Checks the site form; the map pin is optional (D-055). */
export function parseSiteForm(
  values: Record<string, string>,
):
  | { ok: true; body: SiteFormBody }
  | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const name = (values.name ?? '').trim();
  const ownerName = (values.ownerName ?? '').trim();
  const address = (values.address ?? '').trim();
  if (name.length < 2) fieldErrors.name = 'Enter the site name.';
  else if (name.length > 80)
    fieldErrors.name = 'The site name can be at most 80 characters.';
  if (ownerName.length > 120)
    fieldErrors.ownerName = 'The owner name can be at most 120 characters.';
  if (address.length < 5)
    fieldErrors.address = 'Enter the house or business name and place.';
  else if (address.length > 300)
    fieldErrors.address = 'The address can be at most 300 characters.';
  const latitude = Number(values.latitude);
  const longitude = Number(values.longitude);
  const hasPin = Boolean(values.latitude) && Boolean(values.longitude);
  if (
    hasPin &&
    (!Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180)
  ) {
    fieldErrors.latitude = 'Place the pin on the map again.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return {
    ok: true,
    body: {
      name,
      ownerName: ownerName || null,
      address,
      pin: hasPin ? { latitude, longitude } : null,
    },
  };
}

export interface DraftLine {
  packId: string;
  title: string;
  detail: string;
  pricePaise: number;
  quantity: number;
  shadeCode: string;
}

/** The new order's running total (current prices, ORD-004). */
export function draftTotal(lines: readonly DraftLine[]): number {
  return lines.reduce(
    (sum, line) =>
      sum +
      line.pricePaise * (Number.isInteger(line.quantity) ? line.quantity : 0),
    0,
  );
}

/** The problems with a draft order, keyed by field. */
export function checkDraft(draft: {
  customerId: string | null;
  lines: readonly DraftLine[];
  fulfilment: 'PICKUP' | 'DELIVERY';
  address: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.customerId) errors.customer = 'Choose the customer.';
  if (draft.lines.length === 0) errors.items = 'Add at least one item.';
  else if (draft.lines.length > 50)
    errors.items = 'An order has at most 50 items.';
  if (
    draft.lines.some(
      (line) =>
        !Number.isInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 999,
    )
  ) {
    errors.items = 'Each quantity must be from 1 to 999.';
  }
  if (draft.fulfilment === 'DELIVERY' && draft.address.trim().length < 5) {
    errors.address = 'Enter the delivery address.';
  }
  return errors;
}
