import { randomUUID } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import { ProblemException } from '../common/http/problem-details.js';
import { ShopAccessGuard } from './shop-access.guard.js';
import type { ShopMembershipsService } from './shop-memberships.service.js';

function contextFor(request: object): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('ShopAccessGuard', () => {
  const shopId = randomUUID();
  const user = { id: 'user-1' };

  function createGuard(role: 'MASTER' | null) {
    const roleOf = vi.fn(() => Promise.resolve(role));
    const guard = new ShopAccessGuard({
      roleOf,
    } as unknown as ShopMembershipsService);
    return { guard, roleOf };
  }

  async function notFoundFrom(promise: Promise<unknown>): Promise<void> {
    const error: unknown = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemException);
    expect((error as ProblemException).problem).toMatchObject({
      status: 404,
      code: 'shop_not_found',
    });
  }

  it('attaches the shop context for a member', async () => {
    const { guard, roleOf } = createGuard('MASTER');
    const request: Record<string, unknown> = {
      currentUser: user,
      params: { shopId },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(roleOf).toHaveBeenCalledWith(shopId, 'user-1');
    expect(request.shopContext).toEqual({ shopId, role: 'MASTER' });
  });

  it('answers 404 to a non-member', async () => {
    const { guard } = createGuard(null);

    await notFoundFrom(
      guard.canActivate(contextFor({ currentUser: user, params: { shopId } })),
    );
  });

  it('answers 404 for a malformed id without querying', async () => {
    const { guard, roleOf } = createGuard('MASTER');

    await notFoundFrom(
      guard.canActivate(
        contextFor({ currentUser: user, params: { shopId: "1' OR '1'='1" } }),
      ),
    );
    expect(roleOf).not.toHaveBeenCalled();
  });

  it('answers 404 when no user was resolved', async () => {
    const { guard } = createGuard('MASTER');

    await notFoundFrom(guard.canActivate(contextFor({ params: { shopId } })));
  });
});
