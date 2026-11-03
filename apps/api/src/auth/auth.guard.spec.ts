import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProblemException } from '../common/http/problem-details.js';
import type { UsersService } from '../users/users.service.js';
import {
  type AccessTokenVerifier,
  InvalidAccessTokenError,
  TokenVerificationUnavailableError,
} from './access-token-verifier.js';
import { AuthGuard } from './auth.guard.js';
import type {
  AuthenticatedRequest,
  CurrentUserContext,
} from './current-user.js';

const USER: CurrentUserContext = {
  id: 'user-1',
  authSubject: 'subject-1',
  email: null,
  phone: '+919999900001',
  displayName: null,
  platformRole: null,
};

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function createGuard(options: {
  isPublic?: boolean;
  verify?: () => Promise<unknown>;
}) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options.isPublic);
  const verify = vi.fn(
    options.verify ??
      (() =>
        Promise.resolve({ subject: 'subject-1', email: null, phone: null })),
  );
  const resolve = vi.fn(() => Promise.resolve(USER));
  const verifier = { verify } as unknown as AccessTokenVerifier;
  const users = { resolve } as unknown as UsersService;
  return { guard: new AuthGuard(reflector, verifier, users), verify, resolve };
}

async function problemOf(promise: Promise<unknown>): Promise<ProblemException> {
  const error: unknown = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemException);
  return error as ProblemException;
}

describe('AuthGuard', () => {
  it('lets public routes through without a token', async () => {
    const { guard, verify } = createGuard({ isPublic: true });

    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(
      true,
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it('attaches the resolved user for a valid bearer token', async () => {
    const { guard } = createGuard({});
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer abc.def.ghi' },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.currentUser).toEqual(USER);
  });

  it.each([
    ['missing', undefined],
    ['another scheme', 'Basic abc'],
    ['an empty bearer value', 'Bearer '],
    ['a token with spaces', 'Bearer abc def'],
  ])(
    'answers 401 authentication_required when the header is %s',
    async (_name, authorization) => {
      const { guard, verify } = createGuard({});

      const problem = await problemOf(
        guard.canActivate(contextFor({ headers: { authorization } })),
      );

      expect(problem.problem).toMatchObject({
        status: 401,
        code: 'authentication_required',
      });
      expect(problem.headers).toEqual({ 'WWW-Authenticate': 'Bearer' });
      expect(verify).not.toHaveBeenCalled();
    },
  );

  it('answers 401 invalid_token when verification fails', async () => {
    const { guard, resolve } = createGuard({
      verify: () =>
        Promise.reject(new InvalidAccessTokenError('ERR_JWT_EXPIRED')),
    });

    const problem = await problemOf(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer a.b.c' } }),
      ),
    );

    expect(problem.problem).toMatchObject({
      status: 401,
      code: 'invalid_token',
    });
    expect(problem.headers['WWW-Authenticate']).toBe(
      'Bearer error="invalid_token"',
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('answers 503 auth_unavailable when the signing keys cannot be fetched', async () => {
    const { guard } = createGuard({
      verify: () =>
        Promise.reject(new TokenVerificationUnavailableError('down')),
    });

    const problem = await problemOf(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer a.b.c' } }),
      ),
    );

    expect(problem.problem).toMatchObject({
      status: 503,
      code: 'auth_unavailable',
    });
  });
});
