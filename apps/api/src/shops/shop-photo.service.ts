import { Injectable } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ImageStore } from '../media/image-store.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ShopContext,
  shopNotFound,
} from '../shop-access/shop-access.guard.js';
import {
  PROFILE_MANAGER_ROLES,
  requireShopRole,
} from '../shop-access/shop-roles.js';
import type { ShopProfileResponse } from './shop-profile.schemas.js';
import { ShopProfileService } from './shop-profile.service.js';

/** The uploaded file as parsed by the multipart interceptor. */
export interface UploadedImage {
  buffer: Buffer;
}

/** Shop photo (SHP-004). Images: `ImageStore` (ADR 0007). */
@Injectable()
export class ShopPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStore,
    private readonly profiles: ShopProfileService,
  ) {}

  /**
   * Stores the re-encoded photo under a new key inside the shop's prefix,
   * points the shop at it in one audited transaction, then removes the
   * previous objects.
   */
  async replace(
    user: CurrentUserContext,
    shop: ShopContext,
    file: UploadedImage | undefined,
  ): Promise<ShopProfileResponse> {
    requireShopRole(shop, PROFILE_MANAGER_ROLES);
    const image = await this.images.store(
      `shops/${shop.shopId}/photo`,
      file?.buffer,
      'photo',
    );

    let previousKey: string | null;
    try {
      previousKey = await this.prisma.$transaction(async (tx) => {
        const before = await tx.shop.findUnique({
          where: { id: shop.shopId },
          select: { photoKey: true },
        });
        if (!before) {
          throw shopNotFound();
        }
        await tx.shop.update({
          where: { id: shop.shopId },
          data: { photoKey: image.key, photoUpdatedAt: new Date() },
        });
        await recordAuditEvent(tx, {
          actor: { type: 'USER', userId: user.id },
          action: AuditAction.ShopPhotoUpdated,
          entityType: 'shop',
          entityId: shop.shopId,
          shopId: shop.shopId,
          metadata: {
            replaced: before.photoKey !== null,
            width: image.width,
            height: image.height,
          },
        });
        return before.photoKey;
      });
    } catch (error) {
      await this.images.deleteQuietly(image.key);
      throw error;
    }

    await this.images.deleteQuietly(previousKey);
    return this.profiles.get(shop);
  }
}
