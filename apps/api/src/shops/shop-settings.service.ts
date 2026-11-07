import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ShopContext,
  shopNotFound,
} from '../shop-access/shop-access.guard.js';
import {
  PROFILE_MANAGER_ROLES,
  requireShopRole,
} from '../shop-access/shop-roles.js';
import type {
  ShopSettingsResponse,
  UpdateDeliverySettingsRequest,
  UpdateOrderMessagesRequest,
} from './shop-settings.schemas.js';

const SETTINGS_SELECT = {
  id: true,
  latitude: true,
  deliveryEnabled: true,
  deliveryChargePaise: true,
  freeDeliveryAbovePaise: true,
  deliveryRadiusKm: true,
  orderMessages: true,
  settingsUpdatedAt: true,
} as const satisfies Prisma.ShopSelect;

type SettingsRow = Prisma.ShopGetPayload<{ select: typeof SETTINGS_SELECT }>;

/**
 * Shop settings (SHP-008): delivery (D-046, D-049) and the ready-made
 * "not available" messages (D-045). Members read; the owner changes them.
 * Every change is audited by field name, never by value.
 */
@Injectable()
export class ShopSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(shop: ShopContext): Promise<ShopSettingsResponse> {
    const row = await this.prisma.shop.findUnique({
      where: { id: shop.shopId },
      select: SETTINGS_SELECT,
    });
    if (!row) {
      throw shopNotFound();
    }
    return toSettings(row);
  }

  async updateDelivery(
    user: CurrentUserContext,
    shop: ShopContext,
    input: UpdateDeliverySettingsRequest,
  ): Promise<ShopSettingsResponse> {
    requireShopRole(shop, PROFILE_MANAGER_ROLES);
    const row = await this.prisma.$transaction(async (tx) => {
      // Locks the shop row so a location change can't race the check below.
      const [current] = await tx.$queryRaw<{ latitude: unknown }[]>`
        SELECT latitude FROM shops WHERE id = ${shop.shopId}::uuid FOR UPDATE`;
      if (!current) {
        throw shopNotFound();
      }
      if (input.enabled && current.latitude === null) {
        throw new ProblemException(HttpStatus.CONFLICT, {
          detail:
            'Set your shop location on the map first. Delivery distance is measured from it.',
          code: 'delivery_needs_location',
        });
      }
      const updated = await tx.shop.update({
        where: { id: shop.shopId },
        data: {
          deliveryEnabled: input.enabled,
          deliveryChargePaise: input.chargePaise,
          freeDeliveryAbovePaise: input.freeAbovePaise,
          deliveryRadiusKm: input.radiusKm,
          settingsUpdatedAt: new Date(),
        },
        select: SETTINGS_SELECT,
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: user.id },
        action: AuditAction.ShopDeliveryUpdated,
        entityType: 'shop',
        entityId: shop.shopId,
        shopId: shop.shopId,
        metadata: { enabled: input.enabled },
      });
      return updated;
    });
    return toSettings(row);
  }

  async updateOrderMessages(
    user: CurrentUserContext,
    shop: ShopContext,
    input: UpdateOrderMessagesRequest,
  ): Promise<ShopSettingsResponse> {
    requireShopRole(shop, PROFILE_MANAGER_ROLES);
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.shop.update({
        where: { id: shop.shopId },
        data: {
          orderMessages: input.messages,
          settingsUpdatedAt: new Date(),
        },
        select: SETTINGS_SELECT,
      });
      await recordAuditEvent(tx, {
        actor: { type: 'USER', userId: user.id },
        action: AuditAction.ShopOrderMessagesUpdated,
        entityType: 'shop',
        entityId: shop.shopId,
        shopId: shop.shopId,
        metadata: { count: input.messages.length },
      });
      return updated;
    });
    return toSettings(row);
  }
}

function toSettings(row: SettingsRow): ShopSettingsResponse {
  return {
    shopId: row.id,
    pickup: true,
    delivery: {
      enabled: row.deliveryEnabled,
      chargePaise: row.deliveryChargePaise,
      freeAbovePaise: row.freeDeliveryAbovePaise,
      radiusKm: row.deliveryRadiusKm,
    },
    hasLocation: row.latitude !== null,
    orderMessages: row.orderMessages,
    updatedAt: row.settingsUpdatedAt?.toISOString() ?? null,
  };
}
