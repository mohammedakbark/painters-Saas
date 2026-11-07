import { describe, expect, it } from 'vitest';
import { checkOrderMessage, parseDeliveryForm } from './settings';

describe('parseDeliveryForm', () => {
  it('reads rupees and km into paise and whole km', () => {
    expect(
      parseDeliveryForm({
        enabled: 'on',
        charge: '₹ 50',
        freeAbove: '3,000',
        radius: '8',
      }),
    ).toEqual({
      ok: true,
      body: {
        enabled: true,
        chargePaise: 5000,
        freeAbovePaise: 300000,
        radiusKm: 8,
      },
    });
  });

  it('accepts 0 as free delivery and an empty free-above amount', () => {
    const parsed = parseDeliveryForm({
      enabled: 'on',
      charge: '0',
      freeAbove: '',
      radius: '5',
    });
    expect(parsed).toMatchObject({
      ok: true,
      body: { chargePaise: 0, freeAbovePaise: null },
    });
  });

  it('needs a charge and a distance only when delivery is on', () => {
    expect(
      parseDeliveryForm({
        enabled: 'on',
        charge: '',
        freeAbove: '',
        radius: '',
      }),
    ).toEqual({
      ok: false,
      fieldErrors: {
        charge: 'Enter the delivery charge (0 for free delivery).',
        radius: 'Enter how far you deliver, in km.',
      },
    });
    expect(
      parseDeliveryForm({ charge: '', freeAbove: '', radius: '' }),
    ).toEqual({
      ok: true,
      body: {
        enabled: false,
        chargePaise: null,
        freeAbovePaise: null,
        radiusKm: null,
      },
    });
  });

  it('rejects out-of-range or malformed values', () => {
    const parsed = parseDeliveryForm({
      enabled: 'on',
      charge: '10001',
      freeAbove: 'abc',
      radius: '2.5',
    });
    expect(parsed.ok).toBe(false);
    expect(parsed.ok ? {} : Object.keys(parsed.fieldErrors).sort()).toEqual([
      'charge',
      'freeAbove',
      'radius',
    ]);
    expect(
      parseDeliveryForm({ enabled: 'on', charge: '10', radius: '51' }),
    ).toMatchObject({ ok: false });
  });
});

describe('checkOrderMessage', () => {
  it('needs 2 to 160 characters', () => {
    expect(checkOrderMessage(' x ')).not.toBeNull();
    expect(checkOrderMessage('a'.repeat(161))).not.toBeNull();
    expect(checkOrderMessage('Stock not available.')).toBeNull();
  });
});
