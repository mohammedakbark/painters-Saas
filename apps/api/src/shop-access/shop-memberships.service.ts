import { Injectable } from '@nestjs/common';
import type { ShopRole, ShopStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface MembershipSummary {
  shopId: string;
  shopName: string;
  shopStatus: ShopStatus;
  role: ShopRole;
}

/** Read access to shop memberships, the only source of shop authorization. */
@Injectable()
export class ShopMembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller's role in the shop, or null when they are not a member. */
  async roleOf(shopId: string, userId: string): Promise<ShopRole | null> {
    const membership = await this.prisma.shopMembership.findUnique({
      where: { shopId_userId: { shopId, userId } },
      select: { role: true },
    });
    return membership?.role ?? null;
  }

  /** Every shop the user belongs to, most recent membership first. */
  async listForUser(userId: string): Promise<MembershipSummary[]> {
    const memberships = await this.prisma.shopMembership.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        role: true,
        shop: { select: { id: true, name: true, status: true } },
      },
    });
    return memberships.map(({ role, shop }) => ({
      shopId: shop.id,
      shopName: shop.name,
      shopStatus: shop.status,
      role,
    }));
  }
}
