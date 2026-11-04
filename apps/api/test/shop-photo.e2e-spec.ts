import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

const PROBLEM_JSON = /application\/problem\+json/;

/** A JPEG with camera and GPS EXIF, like a phone photo. */
async function phonePhoto(width = 2400, height = 1800): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: '#1f4b7a' },
  })
    .withExif({
      IFD0: { Make: 'TestPhone' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '9/1 57/1 52/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '76/1 16/1 2/1',
      },
    })
    .jpeg()
    .toBuffer();
}

describe('Shop photo (e2e, real Postgres, in-memory storage)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;

  beforeAll(async () => {
    issuer = await createTestTokenIssuer();
    testApp = await createTestApp({ keys: issuer.keys });
  });

  beforeEach(async () => {
    await resetDatabase(testApp.prisma);
    testApp.storage.reset();
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  const server = () => testApp.app.getHttpServer();

  async function owner(phone: string): Promise<string> {
    return `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
  }

  async function register(authorization: string, name = 'Lakshmi Paints') {
    const response = await request(server())
      .post('/v1/shops')
      .set('Authorization', authorization)
      .send({ shopName: name, ownerName: 'Anil Kumar' })
      .expect(201);
    return (response.body as { id: string }).id;
  }

  const upload = (
    shopId: string,
    authorization: string,
    file: Buffer,
    filename = 'shop.jpg',
  ) =>
    request(server())
      .put(`/v1/shops/${shopId}/photo`)
      .set('Authorization', authorization)
      .attach('photo', file, { filename, contentType: 'image/jpeg' });

  it('stores two WebP sizes without metadata and returns their URLs', async () => {
    const authorization = await owner('919999900001');
    const shopId = await register(authorization);

    const response = await upload(
      shopId,
      authorization,
      await phonePhoto(),
    ).expect(200);

    const photo = response.body.photo as { url: string; thumbUrl: string };
    expect(photo.url).toMatch(
      new RegExp(
        `^https://media\\.test\\.invalid/shop-media/shops/${shopId}/photo/[0-9a-f-]{36}-1600\\.webp$`,
      ),
    );
    expect(photo.thumbUrl).toMatch(/-480\.webp$/);

    const objects = [...testApp.storage.objects.values()];
    expect(objects).toHaveLength(2);
    for (const object of objects) {
      expect(object).toMatchObject({
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      const metadata = await sharp(object.body).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.exif).toBeUndefined();
      expect(object.body.includes(Buffer.from('TestPhone'))).toBe(false);
    }

    const onboarding = await request(server())
      .get(`/v1/shops/${shopId}/onboarding`)
      .set('Authorization', authorization)
      .expect(200);
    expect(onboarding.body.items).toContainEqual({ key: 'photo', done: true });

    const event = await testApp.prisma.auditEvent.findFirstOrThrow({
      where: { action: 'shop.photo_updated' },
    });
    expect(event).toMatchObject({
      entityId: shopId,
      shopId,
      metadata: { replaced: false, width: 1600, height: 1200 },
    });
  });

  it('replaces the photo and deletes the previous objects', async () => {
    const authorization = await owner('919999900001');
    const shopId = await register(authorization);
    const first = await upload(
      shopId,
      authorization,
      await phonePhoto(),
    ).expect(200);
    const second = await upload(
      shopId,
      authorization,
      await phonePhoto(800, 600),
    ).expect(200);

    expect(second.body.photo.url).not.toBe(first.body.photo.url);
    expect(
      [...testApp.storage.objects.keys()].every((key) =>
        second.body.photo.url.includes(key.replace(/-(1600|480)\.webp$/, '')),
      ),
    ).toBe(true);
    expect(testApp.storage.objects.size).toBe(2);
    const events = await testApp.prisma.auditEvent.findMany({
      where: { action: 'shop.photo_updated' },
      orderBy: { occurredAt: 'asc' },
    });
    expect(
      events.map((e) => (e.metadata as { replaced: boolean }).replaced),
    ).toEqual([false, true]);
  });

  it.each([
    [
      'a GIF',
      () =>
        sharp({
          create: { width: 640, height: 480, channels: 3, background: '#000' },
        })
          .gif()
          .toBuffer(),
      400,
      'photo_unsupported_type',
    ],
    [
      'a text file',
      async () => Buffer.from('not an image at all'),
      400,
      'photo_unreadable',
    ],
    [
      'a tiny image',
      () =>
        sharp({
          create: { width: 200, height: 150, channels: 3, background: '#000' },
        })
          .png()
          .toBuffer(),
      400,
      'photo_too_small',
    ],
  ])('rejects %s and stores nothing', async (_name, file, status, code) => {
    const authorization = await owner('919999900001');
    const shopId = await register(authorization);

    const response = await upload(shopId, authorization, await file()).expect(
      status,
    );

    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body.code).toBe(code);
    expect(testApp.storage.objects.size).toBe(0);
    const shop = await testApp.prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
    });
    expect(shop.photoKey).toBeNull();
  });

  it('answers 413 for a file over 5 MB', async () => {
    const authorization = await owner('919999900001');
    const shopId = await register(authorization);

    const response = await upload(
      shopId,
      authorization,
      Buffer.alloc(5 * 1024 * 1024 + 1),
    ).expect(413);
    expect(response.body).toMatchObject({
      status: 413,
      detail: 'The upload is too large.',
    });
    expect(testApp.storage.objects.size).toBe(0);
  });

  it('answers 400 photo_required without a file', async () => {
    const authorization = await owner('919999900001');
    const shopId = await register(authorization);

    const response = await request(server())
      .put(`/v1/shops/${shopId}/photo`)
      .set('Authorization', authorization)
      .field('note', 'no file')
      .expect(400);
    // Extra fields are refused by the multipart limits (fields: 0).
    expect(response.body.status).toBe(400);

    const empty = await request(server())
      .put(`/v1/shops/${shopId}/photo`)
      .set('Authorization', authorization)
      .set('Content-Type', 'multipart/form-data; boundary=x')
      .send('--x--\r\n')
      .expect(400);
    expect(empty.body.code).toBe('photo_required');
  });

  it('answers 503 and keeps the shop unchanged when storage is down', async () => {
    const authorization = await owner('919999900001');
    const shopId = await register(authorization);
    testApp.storage.failing = true;

    const response = await upload(
      shopId,
      authorization,
      await phonePhoto(),
    ).expect(503);

    expect(response.body.code).toBe('storage_unavailable');
    const shop = await testApp.prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
    });
    expect(shop.photoKey).toBeNull();
  });

  it('answers 404 to the owner of another shop and stores nothing', async () => {
    const ownerA = await owner('919999900001');
    const ownerB = await owner('919999900002');
    const shopA = await register(ownerA, 'Shop A');
    await register(ownerB, 'Shop B');

    const response = await upload(shopA, ownerB, await phonePhoto()).expect(
      404,
    );

    expect(response.body.code).toBe('shop_not_found');
    expect(testApp.storage.objects.size).toBe(0);
    const shop = await testApp.prisma.shop.findUniqueOrThrow({
      where: { id: shopA },
    });
    expect(shop.photoKey).toBeNull();
  });

  it('answers 401 without a token', async () => {
    const shopId = await register(await owner('919999900001'));
    await request(server())
      .put(`/v1/shops/${shopId}/photo`)
      .attach('photo', await phonePhoto(), 'shop.jpg')
      .expect(401);
  });

  it('the database only accepts photo keys inside the shop', async () => {
    const shopId = await register(await owner('919999900001'));
    const otherShop = randomUUID();

    await expect(
      testApp.prisma.shop.update({
        where: { id: shopId },
        data: {
          photoKey: `shops/${otherShop}/photo/${randomUUID()}`,
          photoUpdatedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
    await expect(
      testApp.prisma.shop.update({
        where: { id: shopId },
        data: { photoKey: `shops/${shopId}/photo/${randomUUID()}` },
      }),
    ).rejects.toThrow();
  });
});
