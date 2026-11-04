import { PackUnit } from '../generated/prisma/enums.js';

/**
 * Normalisation rules shared by the catalogue API and the CSV import, so a
 * value typed in a form and the same value in a CSV file end up identical.
 * Limits match the CHECK constraints in the CAT-001 migration.
 */
export const CATALOGUE_LIMITS = {
  categoryName: { min: 2, max: 60 },
  brandName: { min: 2, max: 80 },
  productName: { min: 2, max: 120 },
  description: { max: 1000 },
  shadeCode: { max: 20 },
  shadeName: { min: 1, max: 80 },
  packsPerProduct: 12,
  maxPackQuantity: 1_000_000,
} as const;

/** Trims and collapses inner whitespace. */
export function normaliseText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Optional text: trimmed, and null when blank. */
export function blankToNull(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

/** The case-insensitive uniqueness key stored as `name_key`. */
export function nameKey(name: string): string {
  return normaliseText(name).toLowerCase();
}

/** Shade codes as printed on shade cards: upper case, single spaces. */
export function normaliseShadeCode(code: string): string {
  return normaliseText(code).toUpperCase();
}

export const SHADE_CODE = /^[A-Z0-9][A-Z0-9 ./-]{0,19}$/;

/** `#rgb`, `rrggbb` or `#RRGGBB` → `#RRGGBB`; null for anything else. */
export function normaliseHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(raw)) {
    return `#${raw}`;
  }
  if (/^[0-9A-F]{3}$/.test(raw)) {
    return `#${raw.replace(/./g, (c) => c + c)}`;
  }
  return null;
}

// --- Pack sizes --------------------------------------------------------------

const UNIT_LABELS: Record<PackUnit, string> = {
  LITRE: 'L',
  MILLILITRE: 'ml',
  KILOGRAM: 'kg',
  GRAM: 'g',
  PIECE: 'pc',
};

const UNIT_ALIASES: Record<string, PackUnit> = {
  l: 'LITRE',
  ltr: 'LITRE',
  litre: 'LITRE',
  litres: 'LITRE',
  liter: 'LITRE',
  liters: 'LITRE',
  ml: 'MILLILITRE',
  kg: 'KILOGRAM',
  kgs: 'KILOGRAM',
  g: 'GRAM',
  gm: 'GRAM',
  gms: 'GRAM',
  pc: 'PIECE',
  pcs: 'PIECE',
  piece: 'PIECE',
  pieces: 'PIECE',
};

export interface PackSize {
  quantity: number;
  unit: PackUnit;
}

/** "4 L", "500ml", "20 Kg", "1 pc" → a pack size; null when unreadable. */
export function parsePackSize(text: string): PackSize | null {
  const match = /^(\d+(?:\.\d{1,3})?)\s*([a-zA-Z]+)$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const quantity = Number(match[1]);
  const unit = UNIT_ALIASES[match[2].toLowerCase()];
  if (!unit || !(quantity > 0) || quantity > CATALOGUE_LIMITS.maxPackQuantity) {
    return null;
  }
  return { quantity, unit };
}

/** 4, LITRE → "4 L"; 0.5, LITRE → "0.5 L". */
export function formatPackSize(quantity: number, unit: PackUnit): string {
  return `${Number(quantity.toFixed(3))} ${UNIT_LABELS[unit]}`;
}

/** Stable identity of a pack size (quantity compared to 3 decimals). */
export function packKey(pack: PackSize): string {
  return `${pack.unit}:${pack.quantity.toFixed(3)}`;
}
