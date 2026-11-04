import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AuditAction, recordAuditEvent } from '../audit/audit.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import {
  IMAGE_LIMITS,
  type ImageRejection,
  ImageRejectedError,
  processImage,
} from '../media/image-processor.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ShopContext,
  shopNotFound,
} from '../shop-access/shop-access.guard.js';
import {
  PROFILE_MANAGER_ROLES,
  requireShopRole,
} from '../shop-access/shop-roles.js';
import {
  IMMUTABLE_CACHE_CONTROL,
  ObjectStorage,
  StorageUnavailableError,
} from '../storage/object-storage.js';
import { newPhotoKey, photoObjectKeys } from './shop-photo.js';
import type { ShopProfileResponse } from './shop-profile.schemas.js';
import { ShopProfileService } from './shop-profile.service.js';

const MAX_MB = IMAGE_LIMITS.maxBytes / (1024 * 1024);

/** Client-safe answers for rejected images. */
const REJECTIONS: Record<
  ImageRejection,
  { status: HttpStatus; detail: string }
> = {
  unsupported_type: {
    status: HttpStatus.BAD_REQUEST,
    detail: 'Upload a JPEG, PNG or WebP photo.',
  },
  heic: {
    status: HttpStatus.BAD_REQUEST,
    detail:
      'HEIC photos are not supported. Upload the photo as JPEG, PNG or WebP.',
  },
  too_large: {
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    detail: `The photo must be ${MAX_MB} MB or smaller.`,
  },
  too_small: {
    status: HttpStatus.BAD_REQUEST,
    detail: `The photo is too small. Use one at least ${IMAGE_LIMITS.minEdge} pixels on its shorter side.`,
  },
  unreadable: {
    status: HttpStatus.BAD_REQUEST,
    detail: 'This file is not a readable image.',
  },
};

/** The uploaded file as parsed by the multipart interceptor. */
export interface UploadedImage {
  buffer: Buffer;
}

@Injectable()
export class ShopPhotoService {
  private readonly logger = new Logger(ShopPhotoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
    private readonly profiles: ShopProfileService,
  ) {}

  /**
   * Re-encodes the photo (metadata stripped), stores both sizes under a new
   * key, points the shop at it in one audited transaction, then removes the
   * previous objects.
   */
  async replace(
    user: CurrentUserContext,
    shop: ShopContext,
    file: UploadedImage | undefined,
  ): Promise<ShopProfileResponse> {
    requireShopRole(shop, PROFILE_MANAGER_ROLES);
    if (!file || file.buffer.length === 0) {
      throw new ProblemException(HttpStatus.BAD_REQUEST, {
        detail: 'Choose a photo to upload.',
        code: 'photo_required',
      });
    }

    const image = await this.process(file.buffer);
    const photoKey = newPhotoKey(shop.shopId);
    const keys = photoObjectKeys(photoKey);
    await this.putObjects([
      { key: keys.large, body: image.large },
      { key: keys.thumb, body: image.thumb },
    ]);

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
          data: { photoKey, photoUpdatedAt: new Date() },
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
      await this.deleteQuietly([keys.large, keys.thumb]);
      throw error;
    }

    if (previousKey !== null) {
      const previous = photoObjectKeys(previousKey);
      await this.deleteQuietly([previous.large, previous.thumb]);
    }
    return this.profiles.get(shop);
  }

  private async process(buffer: Buffer) {
    try {
      return await processImage(buffer);
    } catch (error) {
      if (error instanceof ImageRejectedError) {
        const rejection = REJECTIONS[error.reason];
        throw new ProblemException(rejection.status, {
          detail: rejection.detail,
          code: `photo_${error.reason}`,
        });
      }
      throw error;
    }
  }

  private async putObjects(
    objects: readonly { key: string; body: Buffer }[],
  ): Promise<void> {
    try {
      for (const object of objects) {
        await this.storage.put({
          ...object,
          contentType: 'image/webp',
          cacheControl: IMMUTABLE_CACHE_CONTROL,
        });
      }
    } catch (error) {
      if (error instanceof StorageUnavailableError) {
        await this.deleteQuietly(objects.map((object) => object.key));
        throw new ProblemException(HttpStatus.SERVICE_UNAVAILABLE, {
          detail: "The photo couldn't be stored right now. Try again.",
          code: 'storage_unavailable',
        });
      }
      throw error;
    }
  }

  /** Best effort: an orphaned object costs storage, not correctness. */
  private async deleteQuietly(keys: readonly string[]): Promise<void> {
    try {
      await this.storage.delete(keys);
    } catch {
      // Object keys are not logged; they are not secret, but nothing needs them.
      this.logger.warn(`Could not delete ${keys.length} old image object(s).`);
    }
  }
}
