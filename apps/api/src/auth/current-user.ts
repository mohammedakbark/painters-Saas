import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { PlatformRole } from '../generated/prisma/enums.js';

/** The authenticated caller, resolved by `AuthGuard` for every protected route. */
export interface CurrentUserContext {
  /** Local user id. */
  id: string;
  /** Identity-provider user id. */
  authSubject: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  /** Platform-level role; null for everyone who is not a platform admin. */
  platformRole: PlatformRole | null;
}

export interface AuthenticatedRequest extends Request {
  currentUser?: CurrentUserContext;
}

/** Injects the authenticated caller. Only valid on routes that are not `@Public()`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserContext => {
    const user = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().currentUser;
    if (!user) {
      // Programming error: the route is public or the guard did not run.
      throw new Error('@CurrentUser() used on a route without authentication.');
    }
    return user;
  },
);
