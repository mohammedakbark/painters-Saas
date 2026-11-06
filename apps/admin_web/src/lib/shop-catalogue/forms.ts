import {
  MAX_PACKS,
  notAPackSize,
  type PackSize,
  parsePackSize,
} from '@/lib/catalogue/packs';
import { parseRupees } from '@/lib/money';

/*
 * Shop catalogue forms (CAT-002). Prices are typed in rupees and sent as
 * paise; these helpers check what the API also checks, so field errors appear
 * next to the right pack row. The API re-validates every value.
 */

export interface PackPrice {
  mrpPaise: number | null;
  pricePaise: number;
  available: boolean;
}

export type FieldErrors = Record<string, string>;

/** Form field names of one pack row, keyed by a pack id or a row number. */
export function packFields(key: string) {
  return {
    sell: `sell-${key}`,
    size: `size-${key}`,
    mrp: `mrp-${key}`,
    price: `price-${key}`,
    available: `available-${key}`,
  };
}

/** All text and checkbox values of a form, to show them again after errors. */
export function allValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of formData.entries()) {
    if (typeof value === 'string' && !name.startsWith('$ACTION')) {
      values[name] = value;
    }
  }
  return values;
}

/** MRP (optional) and price (required) of one row; the price may not exceed the MRP. */
export function parsePackPrice(
  values: Record<string, string>,
  key: string,
  errors: FieldErrors,
): PackPrice | null {
  const fields = packFields(key);
  const price = parseRupees(values[fields.price] ?? '', 'price');
  const mrpText = (values[fields.mrp] ?? '').trim();
  const mrp = mrpText === '' ? null : parseRupees(mrpText, 'MRP');

  if (!price.ok) {
    errors[fields.price] = price.message;
  }
  if (mrp && !mrp.ok) {
    errors[fields.mrp] = mrp.message;
  }
  if (!price.ok || (mrp && !mrp.ok)) {
    return null;
  }
  const mrpPaise = mrp ? (mrp.ok ? mrp.paise : null) : null;
  if (mrpPaise !== null && price.paise > mrpPaise) {
    errors[fields.price] = 'The price cannot be more than the MRP.';
    return null;
  }
  return {
    mrpPaise,
    pricePaise: price.paise,
    available: values[fields.available] === 'on',
  };
}

export type FormResult<T> =
  { ok: true; body: T } | { ok: false; fieldErrors: FieldErrors };

/** "Add from brand catalogue": the ticked pack sizes with their prices. */
export function parseCatalogueListing(
  values: Record<string, string>,
  cataloguePackIds: readonly string[],
): FormResult<(PackPrice & { cataloguePackId: string })[]> {
  const errors: FieldErrors = {};
  const packs: (PackPrice & { cataloguePackId: string })[] = [];
  for (const id of cataloguePackIds) {
    if (values[packFields(id).sell] !== 'on') {
      continue;
    }
    const price = parsePackPrice(values, id, errors);
    if (price) {
      packs.push({ cataloguePackId: id, ...price });
    }
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  if (packs.length === 0) {
    return {
      ok: false,
      fieldErrors: { form: 'Tick at least one pack size you sell.' },
    };
  }
  return { ok: true, body: packs };
}

/** Number of blank pack rows on the "Add your own product" form. */
export const OWN_PACK_ROWS = 4;

/** Own product pack rows: filled rows need a size and a price. */
export function parseOwnPackRows(
  values: Record<string, string>,
  rows = OWN_PACK_ROWS,
): FormResult<(PackPrice & PackSize)[]> {
  const errors: FieldErrors = {};
  const packs: (PackPrice & PackSize)[] = [];
  const seen = new Set<string>();
  for (let row = 0; row < Math.min(rows, MAX_PACKS); row += 1) {
    const key = String(row);
    const fields = packFields(key);
    const sizeText = (values[fields.size] ?? '').trim();
    const filled =
      sizeText !== '' ||
      (values[fields.price] ?? '').trim() !== '' ||
      (values[fields.mrp] ?? '').trim() !== '';
    if (!filled) {
      continue;
    }
    const size = sizeText === '' ? null : parsePackSize(sizeText);
    if (!size) {
      errors[fields.size] =
        sizeText === ''
          ? 'Enter the pack size, for example 4 L.'
          : notAPackSize(sizeText);
    } else {
      const sizeKey = `${size.unit}:${size.quantity.toFixed(3)}`;
      if (seen.has(sizeKey)) {
        errors[fields.size] = 'This pack size is already on the list.';
      }
      seen.add(sizeKey);
    }
    const price = parsePackPrice(values, key, errors);
    if (size && price && !errors[fields.size]) {
      packs.push({ ...size, ...price });
    }
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  if (packs.length === 0) {
    return {
      ok: false,
      fieldErrors: {
        [packFields('0').size]: 'Add at least one pack size with its price.',
      },
    };
  }
  return { ok: true, body: packs };
}

/** A product on the quick-add page and the ids of its pack sizes. */
export interface QuickAddProduct {
  catalogueProductId: string;
  name: string;
  packIds: readonly string[];
}

export interface QuickAddListing {
  catalogueProductId: string;
  name: string;
  packs: (PackPrice & { cataloguePackId: string })[];
}

export const QUICK_ADD_NOTHING = 'Enter a price for at least one pack size.';

/**
 * The quick-add page (CAT-004): every pack size with a price (or an MRP)
 * entered is sold, available; empty pack sizes and products are skipped.
 * All fields are checked before anything is added.
 */
export function parseQuickAdd(
  values: Record<string, string>,
  products: readonly QuickAddProduct[],
): FormResult<QuickAddListing[]> {
  const errors: FieldErrors = {};
  const listings: QuickAddListing[] = [];
  for (const product of products) {
    const packs: QuickAddListing['packs'] = [];
    for (const id of product.packIds) {
      const fields = packFields(id);
      const filled =
        (values[fields.price] ?? '').trim() !== '' ||
        (values[fields.mrp] ?? '').trim() !== '';
      if (!filled) {
        continue;
      }
      const price = parsePackPrice(
        { ...values, [fields.available]: 'on' },
        id,
        errors,
      );
      if (price) {
        packs.push({ cataloguePackId: id, ...price });
      }
    }
    if (packs.length > 0) {
      listings.push({
        catalogueProductId: product.catalogueProductId,
        name: product.name,
        packs,
      });
    }
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  if (listings.length === 0) {
    return { ok: false, fieldErrors: { form: QUICK_ADD_NOTHING } };
  }
  return { ok: true, body: listings };
}

/** "Sold by" for a new own product (CAT-005, D-043). */
export const SOLD_BY = [
  {
    value: 'LITRE',
    label: 'Litres',
    example: 'Paint, primer, varnish: 1, 4, 10, 20 L',
  },
  {
    value: 'KILOGRAM',
    label: 'Kilograms',
    example: 'Putty, distemper, powders: 1, 5, 20 kg',
  },
  { value: 'PIECE', label: 'Pieces', example: 'Brushes, rollers, tools' },
] as const;
export type SoldBy = (typeof SOLD_BY)[number]['value'];
export const SOLD_BY_SUFFIX: Record<SoldBy, string> = {
  LITRE: 'L',
  KILOGRAM: 'kg',
  PIECE: 'pieces',
};
const SOLD_BY_TEXT: Record<SoldBy, string> = {
  LITRE: 'L',
  KILOGRAM: 'kg',
  PIECE: 'piece',
};

/**
 * Turns "4" in each pack row into "4 L" (or kg, piece) for the chosen unit,
 * so the usual pack-size parsing applies. Rows that already name a unit are
 * left as typed and checked as usual.
 */
export function applySoldBy(
  values: Record<string, string>,
): { ok: true; values: Record<string, string> } | { ok: false; error: string } {
  const soldBy = values.soldBy as SoldBy | undefined;
  if (!soldBy || !(soldBy in SOLD_BY_TEXT)) {
    return { ok: false, error: 'Choose how this product is sold.' };
  }
  const next = { ...values };
  for (let row = 0; row < OWN_PACK_ROWS; row += 1) {
    const field = packFields(String(row)).size;
    const text = (next[field] ?? '').trim();
    if (/^\d+(\.\d+)?$/.test(text)) {
      next[field] = `${text} ${SOLD_BY_TEXT[soldBy]}`;
    }
  }
  return { ok: true, values: next };
}
