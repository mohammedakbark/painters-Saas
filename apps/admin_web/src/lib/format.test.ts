import { describe, expect, it } from 'vitest';
import { countLabel, formatDate, formatDateTime } from './format';

describe('date formatting (Indian Standard Time)', () => {
  it('formats a date in IST', () => {
    // 20:00 UTC is 01:30 the next day in India.
    expect(formatDate('2026-11-03T20:00:00.000Z')).toBe('4 Nov 2026');
  });

  it('formats a date and time in IST', () => {
    expect(formatDateTime('2026-11-03T10:35:00.000Z')).toMatch(
      /^3 Nov 2026, 4:05\s?pm$/i,
    );
  });
});

describe('countLabel', () => {
  it('uses the singular only for exactly one', () => {
    expect(countLabel(0, 'product')).toBe('0 products');
    expect(countLabel(1, 'active shade')).toBe('1 active shade');
    expect(countLabel(12, 'product')).toBe('12 products');
  });
});
