import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/current-user.js';
import {
  ProblemDetailsSchema,
  ProblemException,
} from '../common/http/problem-details.js';

/**
 * Allows only platform admins. Runs after the global `AuthGuard`, so the
 * caller is already authenticated. Platform permission comes only from the
 * `PlatformAdmin` table, never from shop membership.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().currentUser;
    if (user?.platformRole !== 'SUPER_ADMIN') {
      throw new ProblemException(HttpStatus.FORBIDDEN, {
        detail: 'Platform admin access is required.',
        code: 'platform_admin_required',
      });
    }
    return true;
  }
}

/** Restricts a controller or route to platform admins. */
export const PlatformAdminOnly = () =>
  applyDecorators(
    UseGuards(PlatformAdminGuard),
    ApiForbiddenResponse({ standardSchema: ProblemDetailsSchema }),
  );
