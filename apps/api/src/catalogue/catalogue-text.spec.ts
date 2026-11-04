import { ProblemException } from '../common/http/problem-details.js';
import {
  decodeCursor,
  encodeCursor,
  pageOf,
} from '../common/pagination/keyset-cursor.js';
import {
  formatPackSize,
  nameKey,
  normaliseHex,
  normaliseShadeCode,
  normaliseText,
  packKey,
  parsePackSize,
  SHADE_CODE,
} from './catalogue-text.js';

describe('catalogue text rules', () => {
  it('trims and collapses whitespace; keys are lower case', () => {
    expect(normaliseText('  Royal   Satin  Emulsion ')).toBe(
      'Royal Satin Emulsion',
    );
    expect(nameKey('  Royal   SATIN ')).toBe('royal satin');
  });

  it('upper-cases shade codes and checks their characters', () => {
    expect(normaliseShadeCode(' 1p2816 ')).toBe('1P2816');
    expect(normaliseShadeCode('n  9100')).toBe('N 9100');
    expect(SHADE_CODE.test('8620')).toBe(true);
    expect(SHADE_CODE.test('L-104/B.2')).toBe(true);
    expect(SHADE_CODE.test('-104')).toBe(false);
    expect(SHADE_CODE.test('AB#1')).toBe(false);
    expect(SHADE_CODE.test('X'.repeat(21))).toBe(false);
  });

  it.each([
    ['#e8d5b7', '#E8D5B7'],
    ['E8D5B7', '#E8D5B7'],
    ['#abc', '#AABBCC'],
    ['nope', null],
    ['#12345', null],
  ])('normalises the colour %s', (input, expected) => {
    expect(normaliseHex(input)).toBe(expected);
  });

  it.each([
    ['4 L', { quantity: 4, unit: 'LITRE' }],
    ['500ml', { quantity: 500, unit: 'MILLILITRE' }],
    ['0.9 Ltr', { quantity: 0.9, unit: 'LITRE' }],
    ['20 Kg', { quantity: 20, unit: 'KILOGRAM' }],
    ['250 gm', { quantity: 250, unit: 'GRAM' }],
    ['1 pc', { quantity: 1, unit: 'PIECE' }],
  ])('parses the pack size %s', (input, expected) => {
    expect(parsePackSize(input)).toEqual(expected);
  });

  it.each(['', '4', 'L', '0 L', '-1 L', '4 gallons', '1.2345 L', '2000000 L'])(
    'rejects the pack size "%s"',
    (input) => {
      expect(parsePackSize(input)).toBeNull();
    },
  );

  it('formats pack sizes and compares them to 3 decimals', () => {
    expect(formatPackSize(4, 'LITRE')).toBe('4 L');
    expect(formatPackSize(0.5, 'LITRE')).toBe('0.5 L');
    expect(formatPackSize(500, 'MILLILITRE')).toBe('500 ml');
    expect(packKey({ quantity: 4, unit: 'LITRE' })).toBe(
      packKey({ quantity: 4.0, unit: 'LITRE' }),
    );
    expect(packKey({ quantity: 4, unit: 'LITRE' })).not.toBe(
      packKey({ quantity: 4, unit: 'KILOGRAM' }),
    );
  });
});

describe('keyset cursors', () => {
  const id = '01970000-0000-7000-8000-000000000001';

  it('round-trips a sort value and id', () => {
    expect(decodeCursor(encodeCursor('Royal Satin', id))).toEqual({
      sortValue: 'Royal Satin',
      id,
    });
  });

  it.each([
    'not-a-cursor',
    encodeCursor('x', 'not-a-uuid'),
    Buffer.from('{}').toString('base64url'),
  ])('answers 400 invalid_cursor for %s', (cursor) => {
    expect(() => decodeCursor(cursor)).toThrow(ProblemException);
    try {
      decodeCursor(cursor);
    } catch (error) {
      expect((error as ProblemException).problem.code).toBe('invalid_cursor');
    }
  });

  it('returns a next cursor only when there are more rows', () => {
    const rows = [
      { id: '01970000-0000-7000-8000-000000000001', name: 'A' },
      { id: '01970000-0000-7000-8000-000000000002', name: 'B' },
      { id: '01970000-0000-7000-8000-000000000003', name: 'C' },
    ];
    const first = pageOf(rows, 2, (row) => row.name);
    expect(first.items.map((row) => row.name)).toEqual(['A', 'B']);
    expect(decodeCursor(first.nextCursor ?? '')).toEqual({
      sortValue: 'B',
      id: rows[1].id,
    });
    expect(
      pageOf(rows.slice(0, 2), 2, (row) => row.name).nextCursor,
    ).toBeNull();
  });
});
