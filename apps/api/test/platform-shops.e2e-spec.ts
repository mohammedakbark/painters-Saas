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

  const list = async (query = '') =>
    (
      await request(server())
        .get(`/v1/platform/shops${query}`)
        .set('Authorization', admin)
        .expect(200)
    ).body as {
      items: { id: string; name: string }[];
      total: number;
      page: number;
      pageSize: number;
      statusCounts: Record<string, number>;
    };

  it('lists shops newest first with pages, counts and master contact', async () => {
    const first = await registerShop('919999900001', 'Alpha Paints', 'Anil');
    const second = await registerShop('919999900002', 'Beta Colours', 'Beena');
    const third = await registerShop('919999900003', 'Gamma Hardware', 'Gopi');

    const page1 = await list('?pageSize=10');
    expect(page1.items.map((s) => s.id)).toEqual([
      third.id,
      second.id,
      first.id,
    ]);
    expect(page1.items[0]).toEqual({
      id: third.id,
      name: 'Gamma Hardware',
      status: 'DRAFT',
      photoThumbUrl: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      master: { name: 'Gopi', phone: '+919999900003' },
    });
    expect(page1).toMatchObject({ total: 3, page: 1, pageSize: 10 });
    expect(page1.statusCounts).toEqual({
      ALL: 3,
      DRAFT: 3,
      PENDING_REVIEW: 0,
      CHANGES_REQUESTED: 0,
      ACTIVE: 0,
    });
    expect(await list('?pageSize=10&page=2')).toMatchObject({
      items: [],
      total: 3,
    });
    expect((await list('?sort=oldest')).items[0].id).toBe(first.id);
    expect((await list('?sort=name')).items.map((s) => s.name)).toEqual([
      'Alpha Paints',
      'Beta Colours',
      'Gamma Hardware',
    ]);
  });

  it('searches shop names, owner names and mobiles, and filters by status', async () => {
    await registerShop('919999900001', 'Alpha Paints', 'Anil');
    await registerShop('919999900002', 'Beta Colours', 'Beena');

    expect((await list('?q=alpha')).items.map((s) => s.name)).toEqual([
      'Alpha Paints',
    ]);
    expect((await list('?q=beena')).items.map((s) => s.name)).toEqual([
      'Beta Colours',
    ]);
    expect((await list('?q=99999%2000002')).items.map((s) => s.name)).toEqual([
      'Beta Colours',
    ]);
    const search = await list('?q=paints');
    expect(search.statusCounts.ALL).toBe(1);
    expect((await list('?status=ACTIVE')).total).toBe(0);
    expect((await list('?status=DRAFT')).total).toBe(2);
  });

  it('returns an empty page when there are no shops', async () => {
    expect(await list()).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
      statusCounts: {
        ALL: 0,
        DRAFT: 0,
        PENDING_REVIEW: 0,
        CHANGES_REQUESTED: 0,
        ACTIVE: 0,
      },
    });
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
    ['page=0', 'page'],
    ['page=abc', 'page'],
    ['pageSize=7', 'pageSize'],
    ['status=OPEN', 'status'],
    ['sort=random', 'sort'],
  ])('answers 400 for %s', async (query, field) => {
    const response = await request(server())
      .get(`/v1/platform/shops?${query}`)
      .set('Authorization', admin)
      .expect(400);

    expect(response.body.code).toBe('validation_failed');
    expect(response.body.errors[0].path).toBe(field);
  });

  it('counts reviews waiting, shops by status and the catalogue (UX-003)', async () => {
    const live = await registerShop('919999900001', 'Live Paints', 'Anil');
    const waiting = await registerShop(
      '919999900002',
      'Waiting Paints',
      'Bina',
    );
    await registerShop('919999900003', 'Draft Paints', 'Chandra');
    await testApp.prisma.shop.update({
      where: { id: live.id },
      data: { status: 'ACTIVE' },
    });
    await testApp.prisma.shop.update({
      where: { id: waiting.id },
      data: { status: 'PENDING_REVIEW' },
    });
    const owner = await testApp.prisma.shopMembership.findFirstOrThrow({
      where: { shopId: waiting.id },
    });
    const submittedAt = new Date('2026-11-01T10:00:00Z');
    await testApp.prisma.shopReview.create({
      data: {
        shopId: waiting.id,
        openShopId: waiting.id,
        submittedFrom: 'DRAFT',
        submittedByUserId: owner.userId,
        submittedAt,
      },
    });
    const brand = await testApp.prisma.brand.create({
      data: { name: 'Sample Paints', nameKey: 'sample paints' },
    });
    await testApp.prisma.brand.create({
      data: { name: 'Old Paints', nameKey: 'old paints', active: false },
    });

    const summary = (
      await request(server())
        .get('/v1/platform/summary')
        .set('Authorization', admin)
        .expect(200)
    ).body;
    expect(summary).toEqual({
      reviews: { waiting: 1, oldestSubmittedAt: submittedAt.toISOString() },
      shops: { live: 1, inReview: 1, changesRequested: 0, draft: 1 },
      catalogue: { brands: 1, products: 0, shades: 0 },
    });
    expect(brand.active).toBe(true);

    const forbidden = await request(server())
      .get('/v1/platform/summary')
      .set('Authorization', live.owner)
      .expect(403);
    expect(forbidden.body.code).toBe('platform_admin_required');
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
