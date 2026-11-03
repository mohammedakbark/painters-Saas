import type { ExecutionContext } from '@nestjs/common';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import { passwordProblems } from './platform-admin-provisioning.js';
import { PlatformAdminGuard } from './platform-admin.guard.js';

function contextFor(
  currentUser: Partial<CurrentUserContext> | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ currentUser }) }),
  } as unknown as ExecutionContext;
}

describe('PlatformAdminGuard', () => {
  const guard = new PlatformAdminGuard();

  it('allows a SUPER_ADMIN', () => {
    expect(guard.canActivate(contextFor({ platformRole: 'SUPER_ADMIN' }))).toBe(
      true,
    );
  });

  it.each([
    ['a user without a platform role', { platformRole: null }],
    ['a request without a resolved user', undefined],
  ])('forbids %s with a 403 problem', (_name, user) => {
    let error: unknown;
    try {
      guard.canActivate(contextFor(user));
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ProblemException);
    expect((error as ProblemException).problem).toMatchObject({
      status: 403,
      code: 'platform_admin_required',
    });
  });
});

describe('passwordProblems', () => {
  it('accepts a long mixed-case password with a digit', () => {
    expect(passwordProblems('Correct-Horse-42')).toEqual([]);
  });

  it('lists every unmet rule', () => {
    expect(passwordProblems('short')).toEqual([
      'at least 12 characters',
      'an upper-case letter',
      'a digit',
    ]);
  });

  it('rejects passwords longer than bcrypt can use', () => {
    expect(passwordProblems(`Aa1${'x'.repeat(70)}`)).toEqual([
      'at most 72 characters',
    ]);
  });
});
