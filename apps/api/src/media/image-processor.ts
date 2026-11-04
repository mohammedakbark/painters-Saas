import sharp, { type Metadata } from 'sharp';

/**
 * Public image pipeline (SHP-004; reused for product images). Every upload is
 * decoded and re-encoded, which:
 * - checks the real format from the bytes, not the file name or MIME type;
 * - applies the camera orientation, then strips all metadata (EXIF, including
 *   a phone's GPS position, ICC profiles, comments);
 * - produces two WebP sizes so lists load a small image.
 */
export const IMAGE_LIMITS = {
  /** Upload size limit; also enforced by the multipart parser. */
  maxBytes: 5 * 1024 * 1024,
  /** Decompression-bomb guard. */
  maxInputPixels: 40_000_000,
  /** Shorter side; smaller images are too blurry to review or show. */
  minEdge: 300,
  largeEdge: 1600,
  thumbEdge: 480,
} as const;

export type ImageRejection =
  /** Not JPEG, PNG or WebP. */
  | 'unsupported_type'
  /** HEIC/HEIF (iPhone default): the prebuilt image library cannot decode it. */
  | 'heic'
  | 'too_large'
  | 'too_small'
  /** Corrupt or truncated data. */
  | 'unreadable';

export class ImageRejectedError extends Error {
  override readonly name = 'ImageRejectedError';

  constructor(readonly reason: ImageRejection) {
    super(`Image rejected: ${reason}`);
  }
}

export interface ProcessedImage {
  large: Buffer;
  thumb: Buffer;
  /** Size of the large variant. */
  width: number;
  height: number;
}

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length > IMAGE_LIMITS.maxBytes) {
    throw new ImageRejectedError('too_large');
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(input, {
      limitInputPixels: IMAGE_LIMITS.maxInputPixels,
    }).metadata();
  } catch {
    throw new ImageRejectedError('unreadable');
  }
  // libvips reports both HEIC (HEVC) and AVIF (AV1) as `heif`.
  if (metadata.format === 'heif' && metadata.compression === 'hevc') {
    throw new ImageRejectedError('heic');
  }
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new ImageRejectedError('unsupported_type');
  }

  // Orientation 5–8 swaps width and height once applied.
  const swapped = (metadata.orientation ?? 1) >= 5;
  const width = swapped ? metadata.height : metadata.width;
  const height = swapped ? metadata.width : metadata.height;
  if (Math.min(width, height) < IMAGE_LIMITS.minEdge) {
    throw new ImageRejectedError('too_small');
  }

  const variant = (edge: number) =>
    sharp(input, {
      limitInputPixels: IMAGE_LIMITS.maxInputPixels,
      // Reject truncated or corrupt data instead of encoding a broken image.
      failOn: 'error',
    })
      .rotate()
      .resize({
        width: edge,
        height: edge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      // sharp drops metadata unless asked to keep it; nothing is kept.
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });

  try {
    const [large, thumb] = await Promise.all([
      variant(IMAGE_LIMITS.largeEdge),
      variant(IMAGE_LIMITS.thumbEdge),
    ]);
    return {
      large: large.data,
      thumb: thumb.data,
      width: large.info.width,
      height: large.info.height,
    };
  } catch {
    throw new ImageRejectedError('unreadable');
  }
}
