import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ProblemException } from '../common/http/problem-details.js';
import {
  IMMUTABLE_CACHE_CONTROL,
  ObjectStorage,
  StorageUnavailableError,
} from '../storage/object-storage.js';
import {
  IMAGE_LIMITS,
  type ImageRejection,
  ImageRejectedError,
  processImage,
} from './image-processor.js';

/**
 * Stores public images (shop photos, product images): validates and
 * re-encodes them (`processImage`), writes both sizes under a new generated
 * key and derives their public URLs. The database keeps only the key prefix
 * (ADR 0007).
 */
const VARIANTS = { large: '-1600.webp', thumb: '-480.webp' } as const;

export interface StoredImage {
  /** Key prefix, for example `shops/<id>/photo/<uuid>`. */
  key: string;
  width: number;
  height: number;
}

export interface ImageUrls {
  url: string;
  thumbUrl: string;
  updatedAt: string;
}

/** What the image is called in client messages and error codes. */
export type ImageNoun = 'photo' | 'image';

const MAX_MB = IMAGE_LIMITS.maxBytes / (1024 * 1024);

function rejection(
  reason: ImageRejection,
  noun: ImageNoun,
): { status: HttpStatus; detail: string } {
  switch (reason) {
    case 'unsupported_type':
      return {
        status: HttpStatus.BAD_REQUEST,
        detail: `Upload a JPEG, PNG or WebP ${noun}.`,
      };
    case 'heic':
      return {
        status: HttpStatus.BAD_REQUEST,
        detail: `HEIC ${noun}s are not supported. Upload the ${noun} as JPEG, PNG or WebP.`,
      };
    case 'too_large':
      return {
        status: HttpStatus.PAYLOAD_TOO_LARGE,
        detail: `The ${noun} must be ${MAX_MB} MB or smaller.`,
      };
    case 'too_small':
      return {
        status: HttpStatus.BAD_REQUEST,
        detail: `The ${noun} is too small. Use one at least ${IMAGE_LIMITS.minEdge} pixels on its shorter side.`,
      };
    case 'unreadable':
      return {
        status: HttpStatus.BAD_REQUEST,
        detail: 'This file is not a readable image.',
      };
  }
}

/** Object keys of both sizes of an image. */
export function imageObjectKeys(key: string): string[] {
  return [key + VARIANTS.large, key + VARIANTS.thumb];
}

@Injectable()
export class ImageStore {
  private readonly logger = new Logger(ImageStore.name);

  constructor(private readonly storage: ObjectStorage) {}

  /**
   * Validates, re-encodes and stores an upload under `<prefix>/<uuid>`.
   * Throws problem errors: 400/413 `<noun>_<reason>` for rejected images,
   * 400 `<noun>_required` for an empty upload, 503 `storage_unavailable`.
   */
  async store(
    prefix: string,
    buffer: Buffer | undefined,
    noun: ImageNoun,
  ): Promise<StoredImage> {
    if (!buffer || buffer.length === 0) {
      throw new ProblemException(HttpStatus.BAD_REQUEST, {
        detail: `Choose ${noun === 'image' ? 'an' : 'a'} ${noun} to upload.`,
        code: `${noun}_required`,
      });
    }

    let image: Awaited<ReturnType<typeof processImage>>;
    try {
      image = await processImage(buffer);
    } catch (error) {
      if (error instanceof ImageRejectedError) {
        const { status, detail } = rejection(error.reason, noun);
        throw new ProblemException(status, {
          detail,
          code: `${noun}_${error.reason}`,
        });
      }
      throw error;
    }

    const key = `${prefix}/${randomUUID()}`;
    const [large, thumb] = imageObjectKeys(key);
    try {
      await this.put(large, image.large);
      await this.put(thumb, image.thumb);
    } catch (error) {
      if (error instanceof StorageUnavailableError) {
        await this.deleteQuietly(key);
        throw new ProblemException(HttpStatus.SERVICE_UNAVAILABLE, {
          detail: `The ${noun} couldn't be stored right now. Try again.`,
          code: 'storage_unavailable',
        });
      }
      throw error;
    }
    return { key, width: image.width, height: image.height };
  }

  /** Public URLs of both sizes, or null when there is no image. */
  urls(key: string | null, updatedAt: Date | null): ImageUrls | null {
    if (key === null || updatedAt === null) {
      return null;
    }
    const [large, thumb] = imageObjectKeys(key);
    return {
      url: this.storage.publicUrl(large),
      thumbUrl: this.storage.publicUrl(thumb),
      updatedAt: updatedAt.toISOString(),
    };
  }

  /** Best effort: an orphaned object costs storage, not correctness. */
  async deleteQuietly(key: string | null): Promise<void> {
    if (key === null) {
      return;
    }
    try {
      await this.storage.delete(imageObjectKeys(key));
    } catch {
      // Keys are not logged; nothing needs them.
      this.logger.warn('Could not delete an old image (2 objects).');
    }
  }

  private put(key: string, body: Buffer): Promise<void> {
    return this.storage.put({
      key,
      body,
      contentType: 'image/webp',
      cacheControl: IMMUTABLE_CACHE_CONTROL,
    });
  }
}
