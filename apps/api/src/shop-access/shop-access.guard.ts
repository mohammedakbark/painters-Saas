import {
  applyDecorators,
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiParam } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../auth/current-user.js';
import {
  ProblemDetailsSchema,
  ProblemException,
} from '../common/http/problem-details.js';
import type { ShopRole } from '../generated/prisma/enums.js';
import { ShopMembershipsService } from './shop-memberships.service.js';

/** The shop a request works on, resolved from the caller's membership. */
export interface ShopContext {
  shopId: string;
  role: ShopRole;
}

interface ShopScopedRequest extends AuthenticatedRequest {
  shopContext?: ShopContext;
}

const shopIdSchema = z.uuid();

/** Same answer for "no such shop", "not a member" and "malformed id". */
export function shopNotFound(): ProblemException {
  return new ProblemException(HttpStatus.NOT_FOUND, {
    detail: 'Shop not found.',
    code: 'shop_not_found',
  });
}

/**
 * Tenant boundary for every `/v1/shops/:shopId/...` route. The shop id in the
 * URL is only a request: access comes from the caller's membership row. Non-
 * members (including platform admins) get 404, so the answer never reveals
 * whether a shop exists.
 */
@Injectable()
export class ShopAccessGuard implements CanActivate {
  constructor(private readonly memberships: ShopMembershipsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ShopScopedRequest>();
    const user = request.currentUser;
    const shopId = shopIdSchema.safeParse(request.params.shopId);
    if (!user || !shopId.success) {
      throw shopNotFound();
    }

    const role = await this.memberships.roleOf(shopId.data, user.id);
    if (role === null) {
      throw shopNotFound();
    }
    request.shopContext = { shopId: shopId.data, role };
    return true;
  }
}

/** Marks a route as shop-scoped: requires membership of `:shopId`. */
export const ShopScoped = () =>
  applyDecorators(
    UseGuards(ShopAccessGuard),
    ApiParam({ name: 'shopId', format: 'uuid' }),
    ApiNotFoundResponse({
      standardSchema: ProblemDetailsSchema,
      description: 'Unknown shop, or the caller is not a member.',
    }),
  );

/** Injects the ShopContext of a `@ShopScoped()` route. */
export const CurrentShop = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ShopContext => {
    const shop = context
      .switchToHttp()
      .getRequest<ShopScopedRequest>().shopContext;
    if (!shop) {
      throw new Error('@CurrentShop() used on a route without @ShopScoped().');
    }
    return shop;
  },
);
