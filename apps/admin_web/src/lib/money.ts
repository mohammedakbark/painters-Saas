// Money is integer paise in the API (CAT-002); people type and read rupees.

/** Rs 1 crore in paise: the API's upper limit for a price. */
export const MAX_PAISE = 1_000_000_000;

const RUPEES = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 145000 → "₹1,450"; 145050 → "₹1,450.5". */
export function formatRupees(paise: number): string {
  return RUPEES.format(paise / 100);
}

/** 145000 → "1450"; 145050 → "1450.50" (for a form field). */
export function paiseToInput(paise: number | null): string {
  if (paise === null) {
    return '';
  }
  const rupees = Math.trunc(paise / 100);
  const rest = paise % 100;
  return rest === 0
    ? String(rupees)
    : `${rupees}.${String(rest).padStart(2, '0')}`;
}

export type RupeeParse =
  { ok: true; paise: number } | { ok: false; message: string };

/**
 * "1,450", "₹ 1450.5", "1450.50" → paise. At most 2 decimals, more than 0
 * and up to Rs 1 crore. Parsed from the text, never through floating point.
 */
export function parseRupees(text: string, label = 'price'): RupeeParse {
  const cleaned = text.replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '');
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    return {
      ok: false,
      message: `Enter the ${label} in rupees, for example 1450 or 1450.50.`,
    };
  }
  const paise =
    Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || '0');
  if (paise < 1) {
    return { ok: false, message: `The ${label} must be more than ₹0.` };
  }
  if (paise > MAX_PAISE) {
    return { ok: false, message: `The ${label} is too large.` };
  }
  return { ok: true, paise };
}
