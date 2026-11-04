/**
 * Pack sizes typed as text, the same format as the CSV import (CAT-001):
 * "1 L; 4 L; 10 L; 20 L". Mirrors `parsePackSize` in the API, which
 * re-validates.
 */
export type PackUnit = 'LITRE' | 'MILLILITRE' | 'KILOGRAM' | 'GRAM' | 'PIECE';

export interface PackSize {
  quantity: number;
  unit: PackUnit;
}

const ALIASES: Record<string, PackUnit> = {
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

const LABELS: Record<PackUnit, string> = {
  LITRE: 'L',
  MILLILITRE: 'ml',
  KILOGRAM: 'kg',
  GRAM: 'g',
  PIECE: 'pc',
};

export const MAX_PACKS = 12;

export function parsePackList(
  text: string,
): { ok: true; packs: PackSize[] } | { ok: false; message: string } {
  const parts = text
    .split(/[;,|]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return {
      ok: false,
      message: 'Add at least one pack size, for example "1 L; 4 L".',
    };
  }
  if (parts.length > MAX_PACKS) {
    return { ok: false, message: `Add at most ${MAX_PACKS} pack sizes.` };
  }
  const packs: PackSize[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const match = /^(\d+(?:\.\d{1,3})?)\s*([a-zA-Z]+)$/.exec(part);
    const unit = match ? ALIASES[match[2].toLowerCase()] : undefined;
    const quantity = match ? Number(match[1]) : 0;
    if (!unit || !(quantity > 0) || quantity > 1_000_000) {
      return {
        ok: false,
        message: `"${part.slice(0, 20)}" is not a pack size. Use a number and a unit: L, ml, kg, g or pc.`,
      };
    }
    const key = `${unit}:${quantity.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      packs.push({ quantity, unit });
    }
  }
  return { ok: true, packs };
}

/** [{4, LITRE}, {10, LITRE}] → "4 L; 10 L". */
export function formatPackList(packs: readonly PackSize[]): string {
  return packs
    .map((pack) => `${Number(pack.quantity.toFixed(3))} ${LABELS[pack.unit]}`)
    .join('; ');
}
