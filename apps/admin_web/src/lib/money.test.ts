import { describe, expect, it } from 'vitest';
import { formatRupees, paiseToInput, parseRupees } from './money';

describe('rupee input', () => {
  it('reads rupees and paise without floating point', () => {
    expect(parseRupees('1450')).toEqual({ ok: true, paise: 145000 });
    expect(parseRupees(' ₹ 1,450.5 ')).toEqual({ ok: true, paise: 145050 });
    expect(parseRupees('Rs. 0.07')).toEqual({ ok: true, paise: 7 });
    expect(parseRupees('19.99')).toEqual({ ok: true, paise: 1999 });
  });

  it('refuses unreadable, zero and too large amounts', () => {
    expect(parseRupees('12.345', 'MRP')).toMatchObject({
      ok: false,
      message: 'Enter the MRP in rupees, for example 1450 or 1450.50.',
    });
    expect(parseRupees('-5')).toMatchObject({ ok: false });
    expect(parseRupees('0')).toEqual({
      ok: false,
      message: 'The price must be more than ₹0.',
    });
    expect(parseRupees('10000000.01')).toEqual({
      ok: false,
      message: 'The price is too large.',
    });
  });

  it('formats paise for display and for form fields', () => {
    expect(formatRupees(145000)).toBe('₹1,450');
    expect(formatRupees(12345678)).toBe('₹1,23,456.78');
    expect(paiseToInput(145000)).toBe('1450');
    expect(paiseToInput(145005)).toBe('1450.05');
    expect(paiseToInput(null)).toBe('');
  });
});
