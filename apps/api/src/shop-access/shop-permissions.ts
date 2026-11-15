import { HttpStatus, Injectable } from '@nestjs/common';
import { ProblemException } from '../common/http/problem-details.js';
import type { ShopRole } from '../generated/prisma/enums.js';
import type { ShopContext } from './shop-access.guard.js';

/**
 * What a shop member may do (D-056, ADR 0010). Each key is one tick box the
 * owner will set per employee; the owner (MASTER) always has all of them.
 * Membership itself is checked by `ShopAccessGuard`; these narrow what a
 * member may do inside their own shop.
 */
export const SHOP_PERMISSIONS = [
  /** See orders, move steps, not available, substitute, cancel. */
  'orders.handle',
  /** Record payments and returns. */
  'orders.payments',
  /** Record phone and counter orders. */
  'orders.record',
  /** See, add and edit the shop's customers and their sites. */
  'customers.manage',
  /** See products, prices and shades. */
  'catalogue.view',
  /** Change products, prices, availability, shades and categories. */
  'catalogue.manage',
  /** Edit the profile, photo and map location; submit for review. */
  'shop.profile',
  /** Delivery settings and order messages. */
  'shop.settings',
  /** Money figures: today's sales and unpaid totals. */
  'reports.view',
  /** Add employees and set their permissions (owner only). */
  'staff.manage',
] as const;

export type ShopPermission = (typeof SHOP_PERMISSIONS)[number];

/**
 * The permissions a role has. Today MASTER is the only role and has every
 * permission; employee permissions will be stored per member.
 */
export function permissionsFor(role: ShopRole): readonly ShopPermission[] {
  switch (role) {
    case 'MASTER':
      return SHOP_PERMISSIONS;
  }
}

/**
 * Resolves a member's permissions for the guard. A separate provider so that
 * stored employee permissions (and tests) can replace the role default.
 */
@Injectable()
export class ShopPermissionsResolver {
  resolve(member: {
    shopId: string;
    userId: string;
    role: ShopRole;
  }): readonly ShopPermission[] {
    return permissionsFor(member.role);
  }
}

export const hasShopPermission = (
  shop: ShopContext,
  permission: ShopPermission,
): boolean => shop.permissions.includes(permission);

function denied(): ProblemException {
  return new ProblemException(HttpStatus.FORBIDDEN, {
    detail: "You don't have permission to do this in this shop.",
    code: 'shop_permission_denied',
  });
}

/** Throws 403 `shop_permission_denied` unless the member has [permission]. */
export function requireShopPermission(
  shop: ShopContext,
  permission: ShopPermission,
): void {
  if (!hasShopPermission(shop, permission)) {
    throw denied();
  }
}

/**
 * Throws 403 unless the member has at least one of [permissions]. For data
 * several jobs need: the pack list for someone who only handles orders.
 */
export function requireAnyShopPermission(
  shop: ShopContext,
  permissions: readonly ShopPermission[],
): void {
  if (!permissions.some((permission) => hasShopPermission(shop, permission))) {
    throw denied();
  }
}
