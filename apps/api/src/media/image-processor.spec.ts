import sharp from 'sharp';
import {
  IMAGE_LIMITS,
  ImageRejectedError,
  processImage,
} from './image-processor.js';

/** A solid-colour test image, optionally with EXIF (camera, GPS, orientation). */
async function image(
  format: 'jpeg' | 'png' | 'webp' | 'gif' | 'avif',
  width: number,
  height: number,
  exif?: Record<string, Record<string, string>>,
  orientation?: number,
): Promise<Buffer> {
  let pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 31, g: 75, b: 122 },
    },
  });
  if (exif) {
    pipeline = pipeline.withExif(exif);
  }
  if (orientation) {
    pipeline = pipeline.withMetadata({ orientation });
  }
  return pipeline.toFormat(format).toBuffer();
}

async function rejection(input: Buffer): Promise<string> {
  try {
    await processImage(input);
  } catch (error) {
    expect(error).toBeInstanceOf(ImageRejectedError);
    return (error as ImageRejectedError).reason;
  }
  return expect.unreachable('processImage should have rejected the image');
}

describe('processImage', () => {
  it('re-encodes to two WebP sizes within the limits', async () => {
    const result = await processImage(await image('jpeg', 4000, 3000));

    const large = await sharp(result.large).metadata();
    const thumb = await sharp(result.thumb).metadata();
    expect(large).toMatchObject({ format: 'webp', width: 1600, height: 1200 });
    expect(thumb).toMatchObject({ format: 'webp', width: 480, height: 360 });
    expect(result).toMatchObject({ width: 1600, height: 1200 });
  });

  it('never enlarges a small image', async () => {
    const result = await processImage(await image('png', 800, 600));
    expect(result).toMatchObject({ width: 800, height: 600 });
    expect((await sharp(result.thumb).metadata()).width).toBe(480);
  });

  it('strips all metadata, including a phone GPS position', async () => {
    const input = await image('jpeg', 1200, 900, {
      IFD0: { Make: 'TestPhone', Model: 'Camera 1' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '9/1 57/1 52/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '76/1 16/1 2/1',
      },
    });
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const result = await processImage(input);
    for (const output of [result.large, result.thumb]) {
      const metadata = await sharp(output).metadata();
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
      expect(output.includes(Buffer.from('TestPhone'))).toBe(false);
    }
  });

  it('applies the camera orientation before resizing', async () => {
    // Stored 1200x600, orientation 6 (rotate 90°): shown 600x1200.
    const result = await processImage(
      await image('jpeg', 1200, 600, undefined, 6),
    );
    expect(result).toMatchObject({ width: 600, height: 1200 });
  });

  it('accepts WebP', async () => {
    const result = await processImage(await image('webp', 640, 480));
    expect(result.width).toBe(640);
  });

  it.each([
    ['GIF', 'gif'],
    ['AVIF', 'avif'],
  ] as const)('rejects %s as an unsupported type', async (_name, format) => {
    expect(await rejection(await image(format, 640, 480))).toBe(
      'unsupported_type',
    );
  });

  it('rejects data that is not an image', async () => {
    expect(await rejection(Buffer.from('definitely not an image'))).toBe(
      'unreadable',
    );
  });

  it('rejects a truncated JPEG', async () => {
    const full = await image('jpeg', 1200, 900);
    expect(await rejection(full.subarray(0, full.length / 2))).toBe(
      'unreadable',
    );
  });

  it('rejects an image smaller than the minimum edge', async () => {
    expect(
      await rejection(await image('png', 1000, IMAGE_LIMITS.minEdge - 1)),
    ).toBe('too_small');
  });

  it('rejects input over the size limit before decoding it', async () => {
    expect(await rejection(Buffer.alloc(IMAGE_LIMITS.maxBytes + 1))).toBe(
      'too_large',
    );
  });
});
