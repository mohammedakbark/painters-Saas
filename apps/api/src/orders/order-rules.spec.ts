import {
  canShopMove,
  customerCanCancel,
  deliveryCharge,
  distanceKm,
  itemsTotal,
  nextShopSteps,
} from './order-rules.js';

describe('order rules', () => {
  it('follows the five steps for pickup and delivery', () => {
    expect(nextShopSteps('NEW', 'PICKUP')).toEqual(['PACKING', 'CANCELLED']);
    expect(nextShopSteps('PACKING', 'PICKUP')).toEqual([
      'READY_FOR_PICKUP',
      'CANCELLED',
    ]);
    expect(nextShopSteps('PACKING', 'DELIVERY')).toEqual([
      'OUT_FOR_DELIVERY',
      'CANCELLED',
    ]);
    expect(canShopMove('READY_FOR_PICKUP', 'COMPLETED', 'PICKUP')).toBe(true);
    expect(canShopMove('NEW', 'COMPLETED', 'PICKUP')).toBe(false);
    expect(canShopMove('READY_FOR_PICKUP', 'CANCELLED', 'PICKUP')).toBe(false);
    expect(nextShopSteps('COMPLETED', 'PICKUP')).toEqual([]);
    expect(nextShopSteps('CANCELLED', 'DELIVERY')).toEqual([]);
  });

  it('lets the customer cancel only before the order is ready', () => {
    expect(customerCanCancel('NEW')).toBe(true);
    expect(customerCanCancel('PACKING')).toBe(true);
    expect(customerCanCancel('OUT_FOR_DELIVERY')).toBe(false);
  });

  it('counts only OK lines, less returned units', () => {
    expect(
      itemsTotal([
        {
          status: 'OK',
          unitPricePaise: 1000,
          quantity: 3,
          returnedQuantity: 1,
        },
        {
          status: 'NOT_AVAILABLE',
          unitPricePaise: 5000,
          quantity: 1,
          returnedQuantity: 0,
        },
        {
          status: 'SUBSTITUTE_OFFERED',
          unitPricePaise: 700,
          quantity: 1,
          returnedQuantity: 0,
        },
      ]),
    ).toBe(2000);
  });

  it('gives free delivery from the free-delivery amount', () => {
    const settings = {
      enabled: true,
      chargePaise: 4000,
      freeAbovePaise: 250000,
      radiusKm: 8,
    };
    expect(deliveryCharge(settings, 249999)).toBe(4000);
    expect(deliveryCharge(settings, 250000)).toBe(0);
    expect(deliveryCharge({ ...settings, freeAbovePaise: null }, 9e8)).toBe(
      4000,
    );
  });

  it('measures distance in km', () => {
    // Kochi (Marine Drive) to Edappally, about 6 km.
    const km = distanceKm(
      { latitude: 9.9816, longitude: 76.2756 },
      { latitude: 10.0261, longitude: 76.3086 },
    );
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(7);
  });
});
