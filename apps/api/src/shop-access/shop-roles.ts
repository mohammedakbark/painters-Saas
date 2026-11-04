import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../common/http/problem-details.js';
import type { ShopRole } from '../generated/prisma/enums.js';
import type { ShopContext } from './shop-access.guard.js';

/** Roles that may change the shop's profile, photo and location. */
export const PROFILE_MANAGER_ROLES: readonly ShopRole[] = ['MASTER'];

/**
 * Throws 403 `shop_permission_denied` unless the caller's role in this shop is
 * one of `roles`. Membership itself is already checked by `ShopAccessGuard`;
 * this narrows what a member may do. Today MASTER is the only role, so the
 * check matters once staff roles exist (question 37).
 */
export function requireShopRole(
  shop: ShopContext,
  roles: readonly ShopRole[],
): void {
  if (!roles.includes(shop.role)) {
    throw new ProblemException(HttpStatus.FORBIDDEN, {
      detail: 'Only the shop owner can change this.',
      code: 'shop_permission_denied',
    });
  }
}
