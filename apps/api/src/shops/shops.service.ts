import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ShopContext,
  shopNotFound,
} from '../shop-access/shop-access.guard.js';
import type { MyShopResponse, RegisterShopRequest } from './shop.schemas.js';

const SHOP_SELECT = {
  id: true,
  name: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Self-service registration (D-024): creates a DRAFT shop with the caller as
   * its protected MASTER, sets the caller's display name and writes the audit
   * trail, all in one transaction.
   */
  async register(
    user: CurrentUserContext,
    input: RegisterShopRequest,
  ): Promise<MyShopResponse> {
    if (user.phone === null) {
      throw new ProblemException(HttpStatus.FORBIDDEN, {
        detail: 'Sign in with your mobile number to register a shop.',
        code: 'phone_verification_required',
      });
    }

    const shop = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shop.create({
        data: { name: input.shopName },
        select: SHOP_SELECT,
      });
      const membership = await tx.shopMembership.create({
        data: { shopId: created.id, userId: user.id, role: 'MASTER' },
        select: { id: true },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { displayName: input.ownerName },
      });
      const actor = { type: 'USER', userId: user.id } as const;
      await recordAuditEvent(tx, {
        actor,
        action: AuditAction.ShopRegistered,
        entityType: 'shop',
        entityId: created.id,
        shopId: created.id,
        metadata: { status: created.status },
      });
      await recordAuditEvent(tx, {
        actor,
        action: AuditAction.ShopMasterAssigned,
        entityType: 'shop_membership',
        entityId: membership.id,
        shopId: created.id,
        metadata: { role: 'MASTER', source: 'self_registration' },
      });
      return created;
    });

    return toMyShop(shop, 'MASTER');
  }

  /** The shop of a `@ShopScoped()` request. */
  async getForMember(context: ShopContext): Promise<MyShopResponse> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: context.shopId },
      select: SHOP_SELECT,
    });
    if (!shop) {
      throw shopNotFound();
    }
    return toMyShop(shop, context.role);
  }
}

function toMyShop(
  shop: {
    id: string;
    name: string;
    status: MyShopResponse['status'];
    createdAt: Date;
  },
  myRole: MyShopResponse['myRole'],
): MyShopResponse {
  return {
    id: shop.id,
    name: shop.name,
    status: shop.status,
    myRole,
    createdAt: shop.createdAt.toISOString(),
  };
}
