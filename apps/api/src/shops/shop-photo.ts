import { randomUUID } from 'node:crypto';
import type { ObjectStorage } from '../storage/object-storage.js';

/**
 * Object keys of a shop photo (SHP-004). The stored `photo_key` is a prefix;
 * each size is a separate object. Keys are generated here, never taken from a
 * client, and include the shop id (also enforced by a CHECK constraint).
 */
const VARIANTS = { large: '-1600.webp', thumb: '-480.webp' } as const;

export function newPhotoKey(shopId: string): string {
  return `shops/${shopId}/photo/${randomUUID()}`;
}

export function photoObjectKeys(photoKey: string): {
  large: string;
  thumb: string;
} {
  return {
    large: photoKey + VARIANTS.large,
    thumb: photoKey + VARIANTS.thumb,
  };
}

export interface PhotoUrls {
  url: string;
  thumbUrl: string;
  updatedAt: string;
}

export function photoUrls(
  storage: ObjectStorage,
  photoKey: string | null,
  updatedAt: Date | null,
): PhotoUrls | null {
  if (photoKey === null || updatedAt === null) {
    return null;
  }
  const keys = photoObjectKeys(photoKey);
  return {
    url: storage.publicUrl(keys.large),
    thumbUrl: storage.publicUrl(keys.thumb),
    updatedAt: updatedAt.toISOString(),
  };
}
