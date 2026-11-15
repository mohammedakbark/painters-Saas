import type { ShopRole } from '../../src/generated/prisma/enums.js';
import {
  type ShopPermission,
  ShopPermissionsResolver,
} from '../../src/shop-access/shop-permissions.js';

/**
 * Lets e2e tests give a shop's members fewer permissions, standing in for
 * employee permissions until they are stored (D-056). Without a restriction
 * the role's permissions apply, exactly as in production.
 */
export class FakeShopPermissionsResolver extends ShopPermissionsResolver {
  private readonly restricted = new Map<string, readonly ShopPermission[]>();

  restrict(shopId: string, permissions: readonly ShopPermission[]): void {
    this.restricted.set(shopId, permissions);
  }

  reset(): void {
    this.restricted.clear();
  }

  override resolve(member: {
    shopId: string;
    userId: string;
    role: ShopRole;
  }): readonly ShopPermission[] {
    return this.restricted.get(member.shopId) ?? super.resolve(member);
  }
}
