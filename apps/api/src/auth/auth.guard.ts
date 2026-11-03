import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProblemException } from '../common/http/problem-details.js';
import { UsersService } from '../users/users.service.js';
import {
  AccessTokenVerifier,
  InvalidAccessTokenError,
  TokenVerificationUnavailableError,
  type VerifiedIdentity,
} from './access-token-verifier.js';
import type { AuthenticatedRequest } from './current-user.js';
import { IS_PUBLIC_ROUTE } from './public.decorator.js';

const BEARER = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i;

/**
 * Global guard (registered as APP_GUARD): every route requires a valid bearer
 * access token unless it is marked `@Public()`. On success the local user is
 * attached to the request as `currentUser`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: AccessTokenVerifier,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request.headers.authorization);
    if (token === undefined) {
      throw new ProblemException(HttpStatus.UNAUTHORIZED, {
        detail: 'Authentication is required.',
        code: 'authentication_required',
        headers: { 'WWW-Authenticate': 'Bearer' },
      });
    }

    const identity = await this.verify(token);
    request.currentUser = await this.users.resolve(identity);
    return true;
  }

  private async verify(token: string): Promise<VerifiedIdentity> {
    try {
      return await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof InvalidAccessTokenError) {
        // The reason is a jose error code; the token itself is never logged.
        this.logger.debug(`Rejected access token: ${error.reason}`);
        throw new ProblemException(HttpStatus.UNAUTHORIZED, {
          detail: 'The access token is invalid or has expired.',
          code: 'invalid_token',
          headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' },
        });
      }
      if (error instanceof TokenVerificationUnavailableError) {
        this.logger.error('Access-token signing keys could not be fetched.');
        throw new ProblemException(HttpStatus.SERVICE_UNAVAILABLE, {
          detail: 'Sign-in is temporarily unavailable. Try again shortly.',
          code: 'auth_unavailable',
        });
      }
      throw error;
    }
  }
}

function bearerToken(header: string | undefined): string | undefined {
  return header === undefined ? undefined : BEARER.exec(header)?.[1];
}
