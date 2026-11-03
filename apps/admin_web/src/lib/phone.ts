/**
 * Indian mobile numbers (initial market: Kerala, D-020). Accepts what people
 * type — "98765 43210", "+91 98765-43210", "098765 43210", "919876543210" —
 * and returns E.164 (+91XXXXXXXXXX). Indian mobile numbers have 10 digits and
 * start with 6, 7, 8 or 9.
 */
export function parseIndianMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(digits)) {
    return null;
  }
  const national = digits.replace(/^(\+91|91(?=\d{10}$)|0(?=\d{10}$))/, '');
  return /^[6-9]\d{9}$/.test(national) ? `+91${national}` : null;
}

/** "+919876543210" → "+91 98765 43210" (other values are returned unchanged). */
export function formatIndianMobile(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `+91 ${match[1]} ${match[2]}` : e164;
}
