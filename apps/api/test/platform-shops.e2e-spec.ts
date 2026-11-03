import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

describe('Platform shop registry (e2e, real Postgres)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;
  let admin: string;

  beforeAll(async () => {
    issuer = await createTestTokenIssuer();
    testApp = await createTestApp({ keys: issuer.keys });
  });

  beforeEach(async () => {
    await resetDatabase(testApp.prisma);
    const sub = randomUUID();
    const user = await testApp.prisma.user.create({
      data: { authSubject: sub, email: 'root@example.com' },
    });
    await testApp.prisma.platformAdmin.create({
      data: { userId: user.id, role: 'SUPER_ADMIN' },
    });
    admin = `Bearer ${await issuer.sign({ sub })}`;
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  const server = () => testApp.app.getHttpServer();

  async function registerShop(
    phone: string,
    shopName: string,
    ownerName: string,
  ): Promise<{ id: string; owner: string }> {
    const owner = `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
    const response = await request(server())
      .post('/v1/shops')
      .set('Authorization', owner)
      .send({ shopName, ownerName })
      .expect(201);
    return { id: (response.body as { id: string }).id, owner };
  }

  it('lists shops newest first with cursor pagination and master contact', async () => {
    const first = await registerShop('919999900001', 'Alpha Paints', 'Anil');
    const second = await registerShop('919999900002', 'Beta Colours', 'Beena');
    const third = await registerShop('919999900003', 'Gamma Hardware', 'Gopi');

    const page1 = await request(server())
      .get('/v1/platform/shops?limit=2')
      .set('Authorization', admin)
      .expect(200);

    expect(page1.body.items.map((s: { id: string }) => s.id)).toEqual([
      third.id,
      second.id,
    ]);
    expect(page1.body.items[0]).toEqual({
      id: third.id,
      name: 'Gamma Hardware',
      status: 'DRAFT',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      master: { name: 'Gopi', phone: '+919999900003' },
    });
    expect(page1.body.nextCursor).toBe(second.id);

    const page2 = await request(server())
      .get(`/v1/platform/shops?limit=2&cursor=${page1.body.nextCursor}`)
      .set('Authorization', admin)
      .expect(200);

    expect(page2.body).toEqual({
      items: [expect.objectContaining({ id: first.id, name: 'Alpha Paints' })],
      nextCursor: null,
    });
  });

  it('defaults to 20 per page and returns an empty page when there are no shops', async () => {
    await request(server())
      .get('/v1/platform/shops')
      .set('Authorization', admin)
      .expect(200)
      .expect({ items: [], nextCursor: null });
  });

  it('returns one registry entry', async () => {
    const shop = await registerShop('919999900001', 'Alpha Paints', 'Anil');

    const response = await request(server())
      .get(`/v1/platform/shops/${shop.id}`)
      .set('Authorization', admin)
      .expect(200);

    expect(response.body).toMatchObject({
      id: shop.id,
      name: 'Alpha Paints',
      status: 'DRAFT',
      master: { name: 'Anil', phone: '+919999900001' },
    });
  });

  it.each([
    ['an unknown id', () => randomUUID()],
    ['a malformed id', () => 'not-a-uuid'],
  ])('answers 404 shop_not_found for %s', async (_name, id) => {
    const response = await request(server())
      .get(`/v1/platform/shops/${id()}`)
      .set('Authorization', admin)
      .expect(404);

    expect(response.body.code).toBe('shop_not_found');
  });

  it.each([
    ['limit=0', 'limit'],
    ['limit=51', 'limit'],
    ['limit=abc', 'limit'],
    ['limit=2.5', 'limit'],
    ['cursor=not-a-uuid', 'cursor'],
  ])('answers 400 for %s', async (query, field) => {
    const response = await request(server())
      .get(`/v1/platform/shops?${query}`)
      .set('Authorization', admin)
      .expect(400);

    expect(response.body.code).toBe('validation_failed');
    expect(response.body.errors[0].path).toBe(field);
  });

  it('forbids shop owners from reading the registry (403)', async () => {
    const shop = await registerShop('919999900001', 'Alpha Paints', 'Anil');

    for (const path of [
      '/v1/platform/shops',
      `/v1/platform/shops/${shop.id}`,
    ]) {
      const response = await request(server())
        .get(path)
        .set('Authorization', shop.owner)
        .expect(403);
      expect(response.body.code).toBe('platform_admin_required');
    }
  });

  it('requires authentication (401)', async () => {
    await request(server()).get('/v1/platform/shops').expect(401);
    await request(server())
      .get(`/v1/platform/shops/${randomUUID()}`)
      .expect(401);
  });
});
