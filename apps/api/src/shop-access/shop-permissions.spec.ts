import { randomUUID } from 'node:crypto';
import { ProblemException } from '../common/http/problem-details.js';
import type { ShopContext } from './shop-access.guard.js';
import {
  hasShopPermission,
  permissionsFor,
  requireAnyShopPermission,
  requireShopPermission,
  SHOP_PERMISSIONS,
  ShopPermissionsResolver,
} from './shop-permissions.js';

describe('shop permissions (D-056)', () => {
  const shop = (permissions: ShopContext['permissions']): ShopContext => ({
    shopId: randomUUID(),
    role: 'MASTER',
    permissions,
  });

  function deniedBy(run: () => void): void {
    let error: unknown;
    try {
      run();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ProblemException);
    expect((error as ProblemException).problem).toMatchObject({
      status: 403,
      code: 'shop_permission_denied',
    });
  }

  it('gives the owner every permission, each key once', () => {
    expect(permissionsFor('MASTER')).toEqual(SHOP_PERMISSIONS);
    expect(new Set(SHOP_PERMISSIONS).size).toBe(SHOP_PERMISSIONS.length);
    expect(
      new ShopPermissionsResolver().resolve({
        shopId: 's',
        userId: 'u',
        role: 'MASTER',
      }),
    ).toEqual(SHOP_PERMISSIONS);
  });

  it('allows only what the member has', () => {
    const member = shop(['orders.handle']);

    expect(hasShopPermission(member, 'orders.handle')).toBe(true);
    expect(() => requireShopPermission(member, 'orders.handle')).not.toThrow();
    deniedBy(() => requireShopPermission(member, 'orders.payments'));
    deniedBy(() => requireShopPermission(shop([]), 'catalogue.view'));
  });

  it('allows shared reads with any one of several permissions', () => {
    const member = shop(['orders.record']);

    expect(() =>
      requireAnyShopPermission(member, ['catalogue.view', 'orders.record']),
    ).not.toThrow();
    deniedBy(() =>
      requireAnyShopPermission(member, ['catalogue.view', 'orders.handle']),
    );
  });
});
