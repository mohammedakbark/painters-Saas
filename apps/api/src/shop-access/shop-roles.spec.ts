import { ProblemException } from '../common/http/problem-details.js';
import type { ShopRole } from '../generated/prisma/enums.js';
import { PROFILE_MANAGER_ROLES, requireShopRole } from './shop-roles.js';

describe('requireShopRole', () => {
  const shopId = '01970000-0000-7000-8000-000000000001';

  it('allows a role in the list', () => {
    expect(() =>
      requireShopRole({ shopId, role: 'MASTER' }, PROFILE_MANAGER_ROLES),
    ).not.toThrow();
  });

  it('answers 403 shop_permission_denied for any other role', () => {
    // A future staff role, simulated: only MASTER exists today.
    const staff = 'STAFF' as ShopRole;
    try {
      requireShopRole({ shopId, role: staff }, PROFILE_MANAGER_ROLES);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ProblemException);
      const problem = error as ProblemException;
      expect(problem.getStatus()).toBe(403);
      expect(problem.getResponse()).toMatchObject({
        code: 'shop_permission_denied',
      });
    }
  });
});
