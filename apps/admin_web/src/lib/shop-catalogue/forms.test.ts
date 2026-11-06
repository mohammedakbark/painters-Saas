import { describe, expect, it } from 'vitest';
import {
  allValues,
  parseCatalogueListing,
  parseOwnPackRows,
  parsePackPrice,
  parseQuickAdd,
  QUICK_ADD_NOTHING,
} from './forms';

describe('pack price rows', () => {
  it('reads rupees as paise with an optional MRP', () => {
    const errors = {};
    expect(
      parsePackPrice(
        { 'mrp-a': '1,500', 'price-a': '1450.50', 'available-a': 'on' },
        'a',
        errors,
      ),
    ).toEqual({ mrpPaise: 150000, pricePaise: 145050, available: true });
    expect(parsePackPrice({ 'price-a': '99' }, 'a', errors)).toEqual({
      mrpPaise: null,
      pricePaise: 9900,
      available: false,
    });
    expect(errors).toEqual({});
  });

  it('puts errors on the field of the row', () => {
    const errors = {};
    expect(
      parsePackPrice({ 'mrp-a': '100', 'price-a': '120' }, 'a', errors),
    ).toBeNull();
    expect(errors).toEqual({
      'price-a': 'The price cannot be more than the MRP.',
    });
  });
});

describe('add from the brand catalogue', () => {
  it('lists only ticked pack sizes', () => {
    const result = parseCatalogueListing(
      {
        'sell-p1': 'on',
        'price-p1': '450',
        'available-p1': 'on',
        'price-p2': 'not read',
      },
      ['p1', 'p2'],
    );
    expect(result).toEqual({
      ok: true,
      body: [
        {
          cataloguePackId: 'p1',
          mrpPaise: null,
          pricePaise: 45000,
          available: true,
        },
      ],
    });
  });

  it('needs at least one ticked pack size', () => {
    expect(parseCatalogueListing({}, ['p1'])).toEqual({
      ok: false,
      fieldErrors: { form: 'Tick at least one pack size you sell.' },
    });
  });
});

describe('own product pack rows', () => {
  it('skips blank rows and parses filled ones', () => {
    const result = parseOwnPackRows({
      'size-0': '1 kg',
      'price-0': '120',
      'available-0': 'on',
      'size-2': '20kg',
      'price-2': '900',
    });
    expect(result).toEqual({
      ok: true,
      body: [
        {
          quantity: 1,
          unit: 'KILOGRAM',
          mrpPaise: null,
          pricePaise: 12000,
          available: true,
        },
        {
          quantity: 20,
          unit: 'KILOGRAM',
          mrpPaise: null,
          pricePaise: 90000,
          available: false,
        },
      ],
    });
  });

  it('reports a missing size, a bad size, a duplicate and no rows', () => {
    expect(
      parseOwnPackRows({
        'price-0': '10',
        'size-1': '4 gallons',
        'price-1': '10',
        'size-2': '1 L',
        'price-2': '10',
        'size-3': '1 l',
        'price-3': '10',
      }),
    ).toEqual({
      ok: false,
      fieldErrors: {
        'size-0': 'Enter the pack size, for example 4 L.',
        'size-1':
          '"4 gallons" is not a pack size. Use a number and a unit: L, ml, kg, g or pc.',
        'size-3': 'This pack size is already on the list.',
      },
    });
    expect(parseOwnPackRows({})).toEqual({
      ok: false,
      fieldErrors: { 'size-0': 'Add at least one pack size with its price.' },
    });
  });
});

describe('allValues', () => {
  it('keeps text values and leaves out React action fields', () => {
    const data = new FormData();
    data.set('name', 'Primer');
    data.set('$ACTION_ID_abc', '');
    data.set('image', new File(['x'], 'x.png'));
    expect(allValues(data)).toEqual({ name: 'Primer' });
  });
});

describe('quick add (CAT-004)', () => {
  const products = [
    { catalogueProductId: 'p1', name: 'Silk Emulsion', packIds: ['a', 'b'] },
    { catalogueProductId: 'p2', name: 'Wall Putty', packIds: ['c'] },
    { catalogueProductId: 'p3', name: 'Primer', packIds: ['d'] },
  ];

  it('adds only the pack sizes with a price, as available', () => {
    const result = parseQuickAdd(
      { 'price-a': '450', 'mrp-a': '500', 'price-c': '1,200.50' },
      products,
    );
    expect(result).toEqual({
      ok: true,
      body: [
        {
          catalogueProductId: 'p1',
          name: 'Silk Emulsion',
          packs: [
            {
              cataloguePackId: 'a',
              pricePaise: 45000,
              mrpPaise: 50000,
              available: true,
            },
          ],
        },
        {
          catalogueProductId: 'p2',
          name: 'Wall Putty',
          packs: [
            {
              cataloguePackId: 'c',
              pricePaise: 120050,
              mrpPaise: null,
              available: true,
            },
          ],
        },
      ],
    });
  });

  it('checks every field before adding anything', () => {
    const result = parseQuickAdd(
      { 'price-a': '600', 'mrp-a': '500', 'mrp-d': '300' },
      products,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors['price-a']).toBe(
        'The price cannot be more than the MRP.',
      );
      expect(result.fieldErrors['price-d']).toBeDefined();
    }
  });

  it('asks for at least one price', () => {
    expect(parseQuickAdd({}, products)).toEqual({
      ok: false,
      fieldErrors: { form: QUICK_ADD_NOTHING },
    });
  });
});
