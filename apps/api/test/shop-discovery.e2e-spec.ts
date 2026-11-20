import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

// Kochi (Ernakulam), Thrissur and Kozhikode.
const KOCHI = { latitude: 9.9816, longitude: 76.2999 };
const THRISSUR = { latitude: 10.5276, longitude: 76.2144 };
const KOZHIKODE = { latitude: 11.2588, longitude: 75.7804 };

describe('Find shops and My Shops (CUS-002, e2e, real Postgres)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;

  beforeAll(async () => {
    issuer = await createTestTokenIssuer();
    testApp = await createTestApp({ keys: issuer.keys });
  });

  beforeEach(async () => {
    await resetDatabase(testApp.prisma);
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  const server = () => testApp.app.getHttpServer();

  async function bearer(phone = '+919999900001') {
    return `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
  }

  async function shop(
    name: string,
    district: string,
    at: { latitude: number; longitude: number },
    status: 'ACTIVE' | 'DRAFT' | 'PENDING_REVIEW' = 'ACTIVE',
  ) {
    return testApp.prisma.shop.create({
      data: {
        name,
        status,
        supportPhone: '+919876500000',
        addressLine1: `${name} building`,
        city: district,
        district,
        stateCode: 'KL',
        postalCode: '682001',
        latitude: at.latitude,
        longitude: at.longitude,
        locationSource: 'MAP_PIN',
        locationUpdatedAt: new Date(),
        deliveryEnabled: false,
        deliveryChargePaise: 5000,
        deliveryRadiusKm: 8,
        orderMessages: ['Private note for staff'],
      },
    });
  }

  async function threeShops() {
    const kochi = await shop('Kochi Paints', 'Ernakulam', KOCHI);
    const thrissur = await shop('Thrissur Colours', 'Thrissur', THRISSUR);
    const calicut = await shop('Calicut Paint House', 'Kozhikode', KOZHIKODE);
    await shop('Draft Paints', 'Ernakulam', KOCHI, 'DRAFT');
    await shop('Review Paints', 'Ernakulam', KOCHI, 'PENDING_REVIEW');
    return { kochi, thrissur, calicut };
  }

  const names = (body: { items: { name: string }[] }) =>
    body.items.map((item) => item.name);

  it('requires sign-in', async () => {
    await request(server()).get('/v1/discover/shops').expect(401);
    await request(server()).get('/v1/me/shops').expect(401);
  });

  it('lists only Live shops, nearest first, with the distance (D-038)', async () => {
    await threeShops();
    const response = await request(server())
      .get('/v1/discover/shops')
      .query({ lat: THRISSUR.latitude + 0.01, lng: THRISSUR.longitude })
      .set('Authorization', await bearer())
      .expect(200);
    expect(response.body.sort).toBe('distance');
    expect(response.body.total).toBe(3);
    expect(names(response.body)).toEqual([
      'Thrissur Colours',
      'Kochi Paints',
      'Calicut Paint House',
    ]);
    expect(response.body.items[0].distanceKm).toBeCloseTo(1.1, 1);
  });

  it('without a position puts the chosen district first, then by name', async () => {
    await threeShops();
    const response = await request(server())
      .get('/v1/discover/shops')
      .query({ district: 'kozhikode' })
      .set('Authorization', await bearer())
      .expect(200);
    expect(response.body.sort).toBe('district');
    expect(names(response.body)).toEqual([
      'Calicut Paint House',
      'Kochi Paints',
      'Thrissur Colours',
    ]);
    expect(response.body.items[0].distanceKm).toBeNull();
  });

  it('searches by name and pages', async () => {
    await threeShops();
    const auth = await bearer();
    const search = await request(server())
      .get('/v1/discover/shops')
      .query({ q: 'paint' })
      .set('Authorization', auth)
      .expect(200);
    expect(names(search.body)).toEqual(['Calicut Paint House', 'Kochi Paints']);

    const page2 = await request(server())
      .get('/v1/discover/shops')
      .query({ pageSize: 2, page: 2 })
      .set('Authorization', auth)
      .expect(200);
    expect(page2.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(names(page2.body)).toEqual(['Thrissur Colours']);
  });

  it('rejects half a position', async () => {
    await request(server())
      .get('/v1/discover/shops')
      .query({ lat: 10 })
      .set('Authorization', await bearer())
      .expect(400);
  });

  it('never exposes private shop data', async () => {
    const { kochi } = await threeShops();
    const response = await request(server())
      .get(`/v1/discover/shops/${kochi.id}`)
      .set('Authorization', await bearer())
      .expect(200);
    const text = JSON.stringify(response.body);
    expect(text).not.toContain('+919876500000');
    expect(text).not.toContain('Private note');
    expect(response.body).not.toHaveProperty('status');
    expect(response.body).not.toHaveProperty('supportPhone');
    // Delivery is off: the stored charge and distance are not shown.
    expect(response.body.delivery).toEqual({
      enabled: false,
      chargePaise: null,
      freeAbovePaise: null,
      radiusKm: null,
    });
    expect(response.body.address).toMatchObject({
      line1: 'Kochi Paints building',
      district: 'Ernakulam',
    });
  });

  it('shows delivery terms when the shop delivers', async () => {
    const { kochi } = await threeShops();
    await testApp.prisma.shop.update({
      where: { id: kochi.id },
      data: { deliveryEnabled: true, freeDeliveryAbovePaise: 500000 },
    });
    const response = await request(server())
      .get(`/v1/discover/shops/${kochi.id}`)
      .query({ lat: KOCHI.latitude, lng: KOCHI.longitude })
      .set('Authorization', await bearer())
      .expect(200);
    expect(response.body.delivery).toEqual({
      enabled: true,
      chargePaise: 5000,
      freeAbovePaise: 500000,
      radiusKm: 8,
    });
    expect(response.body.distanceKm).toBe(0);
  });

  it('does not reveal draft or in-review shops', async () => {
    await threeShops();
    const auth = await bearer();
    const hidden = await testApp.prisma.shop.findMany({
      where: { status: { not: 'ACTIVE' } },
    });
    for (const shopRow of hidden) {
      await request(server())
        .get(`/v1/discover/shops/${shopRow.id}`)
        .set('Authorization', auth)
        .expect(404);
      await request(server())
        .put(`/v1/me/shops/${shopRow.id}`)
        .set('Authorization', auth)
        .expect(404);
    }
    await request(server())
      .get('/v1/discover/shops/not-a-uuid')
      .set('Authorization', auth)
      .expect(404);
  });

  it('lists districts with Live shops only', async () => {
    await threeShops();
    const response = await request(server())
      .get('/v1/discover/shops/districts')
      .set('Authorization', await bearer())
      .expect(200);
    expect(response.body.items).toEqual([
      { district: 'Ernakulam', stateCode: 'KL', shopCount: 1 },
      { district: 'Kozhikode', stateCode: 'KL', shopCount: 1 },
      { district: 'Thrissur', stateCode: 'KL', shopCount: 1 },
    ]);
  });

  it('adds and removes My Shops instantly; adding twice is fine', async () => {
    const { kochi, thrissur } = await threeShops();
    const auth = await bearer();
    const added = await request(server())
      .put(`/v1/me/shops/${kochi.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(added.body).toMatchObject({ id: kochi.id, inMyShops: true });
    await request(server())
      .put(`/v1/me/shops/${kochi.id}`)
      .set('Authorization', auth)
      .expect(200);
    await request(server())
      .put(`/v1/me/shops/${thrissur.id}`)
      .set('Authorization', auth)
      .expect(200);

    const mine = await request(server())
      .get('/v1/me/shops')
      .set('Authorization', auth)
      .expect(200);
    expect(names(mine.body)).toEqual(['Thrissur Colours', 'Kochi Paints']);

    const found = await request(server())
      .get('/v1/discover/shops')
      .set('Authorization', auth)
      .expect(200);
    expect(
      (found.body.items as { name: string; inMyShops: boolean }[]).map(
        (item) => [item.name, item.inMyShops],
      ),
    ).toEqual([
      ['Calicut Paint House', false],
      ['Kochi Paints', true],
      ['Thrissur Colours', true],
    ]);

    await request(server())
      .delete(`/v1/me/shops/${kochi.id}`)
      .set('Authorization', auth)
      .expect(204);
    await request(server())
      .delete(`/v1/me/shops/${kochi.id}`)
      .set('Authorization', auth)
      .expect(204);
    const after = await request(server())
      .get('/v1/me/shops')
      .set('Authorization', auth)
      .expect(200);
    expect(names(after.body)).toEqual(['Thrissur Colours']);
  });

  it("keeps each person's My Shops private, also from the shop", async () => {
    const { kochi } = await threeShops();
    const ravi = await bearer('+919999900001');
    const meera = await bearer('+919999900002');
    await request(server())
      .put(`/v1/me/shops/${kochi.id}`)
      .set('Authorization', ravi)
      .expect(200);

    const meeraList = await request(server())
      .get('/v1/me/shops')
      .set('Authorization', meera)
      .expect(200);
    expect(meeraList.body.items).toEqual([]);
    const meeraView = await request(server())
      .get(`/v1/discover/shops/${kochi.id}`)
      .set('Authorization', meera)
      .expect(200);
    expect(meeraView.body.inMyShops).toBe(false);

    // Meera removing Kochi Paints does not touch Ravi's list.
    await request(server())
      .delete(`/v1/me/shops/${kochi.id}`)
      .set('Authorization', meera)
      .expect(204);
    expect(await testApp.prisma.customerShop.count()).toBe(1);

    // The shop is not told: no customer record is created (owner, 2026-11-20).
    expect(await testApp.prisma.shopCustomer.count()).toBe(0);
  });
});
