import { describe, expect, it } from 'vitest';
import { checkDraft, draftTotal, parseSiteForm } from './customer-forms';

const line = (pricePaise: number, quantity: number) => ({
  packId: `p${pricePaise}`,
  title: 'Wall Primer · 1 L',
  detail: '',
  pricePaise,
  quantity,
  shadeCode: '',
});

describe('site form', () => {
  it('needs a name and place; the pin is optional', () => {
    expect(parseSiteForm({ name: 'G', address: 'x' })).toEqual({
      ok: false,
      fieldErrors: {
        name: 'Enter the site name.',
        address: 'Enter the house or business name and place.',
      },
    });
    expect(
      parseSiteForm({
        name: ' Green Villa ',
        ownerName: '',
        address: 'Green Villa, Edappally',
        latitude: '',
        longitude: '',
      }),
    ).toEqual({
      ok: true,
      body: {
        name: 'Green Villa',
        ownerName: null,
        address: 'Green Villa, Edappally',
        pin: null,
      },
    });
    const pinned = parseSiteForm({
      name: 'Green Villa',
      address: 'Green Villa, Edappally',
      latitude: '10.0261',
      longitude: '76.3086',
    });
    expect(pinned.ok && pinned.body.pin).toEqual({
      latitude: 10.0261,
      longitude: 76.3086,
    });
  });
});

describe('new order draft', () => {
  it('adds up lines at current prices', () => {
    expect(draftTotal([line(50000, 2), line(30000, 1)])).toBe(130000);
    expect(draftTotal([line(50000, Number.NaN)])).toBe(0);
  });

  it('needs a customer, items with valid quantities and a delivery address', () => {
    expect(
      checkDraft({
        customerId: null,
        lines: [],
        fulfilment: 'DELIVERY',
        address: '',
      }),
    ).toEqual({
      customer: 'Choose the customer.',
      items: 'Add at least one item.',
      address: 'Enter the delivery address.',
    });
    expect(
      checkDraft({
        customerId: 'c',
        lines: [line(100, 1000)],
        fulfilment: 'PICKUP',
        address: '',
      }),
    ).toEqual({ items: 'Each quantity must be from 1 to 999.' });
    expect(
      checkDraft({
        customerId: 'c',
        lines: [line(100, 2)],
        fulfilment: 'DELIVERY',
        address: 'Flat 4B, Marine Drive',
      }),
    ).toEqual({});
  });
});
