import { describe, expect, it } from 'vitest';
import { formatPackList, MAX_PACKS, parsePackList } from './packs';

describe('parsePackList', () => {
  it('reads the CSV pack format with any separator and removes duplicates', () => {
    expect(parsePackList('1 L; 4 l, 10 Ltr | 500ml; 4 L')).toEqual({
      ok: true,
      packs: [
        { quantity: 1, unit: 'LITRE' },
        { quantity: 4, unit: 'LITRE' },
        { quantity: 10, unit: 'LITRE' },
        { quantity: 500, unit: 'MILLILITRE' },
      ],
    });
  });

  it('explains an unreadable pack, an empty list and too many packs', () => {
    expect(parsePackList('4 gallons')).toEqual({
      ok: false,
      message:
        '"4 gallons" is not a pack size. Use a number and a unit: L, ml, kg, g or pc.',
    });
    expect(parsePackList(' ; ')).toMatchObject({ ok: false });
    expect(
      parsePackList(
        Array.from({ length: MAX_PACKS + 1 }, (_, i) => `${i + 1} L`).join(';'),
      ),
    ).toEqual({ ok: false, message: `Add at most ${MAX_PACKS} pack sizes.` });
  });
});

describe('formatPackList', () => {
  it('formats packs back into the same text', () => {
    expect(
      formatPackList([
        { quantity: 0.5, unit: 'LITRE' },
        { quantity: 20, unit: 'KILOGRAM' },
      ]),
    ).toBe('0.5 L; 20 kg');
  });
});
