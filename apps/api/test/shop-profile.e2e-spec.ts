import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

const PROBLEM_JSON = /application\/problem\+json/;

const ADDRESS = {
  line1: ' Door 12/345, MG Road ',
  line2: 'Ravipuram',
  landmark: '',
  city: 'Kochi',
  district: 'Ernakulam',
  stateCode: 'KL',
  postalCode: '682016',
};
const MAP_PIN = {
  latitude: 9.9658123,
  longitude: 76.2898765,
  source: 'MAP_PIN',
};

describe('Shop profile, location and onboarding checklist (e2e, real Postgres)', () => {
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

  async function owner(phone: string): Promise<string> {
    return `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
  }

  async function register(
    authorization: string,
    shopName = 'Lakshmi Paints',
  ): Promise<string> {
    const response = await request(server())
      .post('/v1/shops')
      .set('Authorization', authorization)
      .send({ shopName, ownerName: 'Anil Kumar' })
      .expect(201);
    return (response.body as { id: string }).id;
  }

  async function auditActions(): Promise<string[]> {
    const events = await testApp.prisma.auditEvent.findMany({
      orderBy: { occurredAt: 'asc' },
    });
    return events.map((event) => event.action);
  }

  describe('GET /v1/shops/:shopId/profile and /onboarding', () => {
    it('starts empty, with every checklist item open', async () => {
      const authorization = await owner('919999900001');
      const shopId = await register(authorization);

      const profile = await request(server())
        .get(`/v1/shops/${shopId}/profile`)
        .set('Authorization', authorization)
        .expect(200);
      expect(profile.body).toEqual({
        shopId,
        shopName: 'Lakshmi Paints',
        status: 'DRAFT',
        supportPhone: null,
        address: null,
        location: null,
        photo: null,
        updatedAt: null,
      });

      const onboarding = await request(server())
        .get(`/v1/shops/${shopId}/onboarding`)
        .set('Authorization', authorization)
        .expect(200);
      expect(onboarding.body).toEqual({
        items: [
          { key: 'address', done: false },
          { key: 'location', done: false },
          { key: 'support_phone', done: false },
          { key: 'photo', done: false },
        ],
      });
    });
  });

  describe('PUT /v1/shops/:shopId/profile', () => {
    it('saves a normalised profile and audits the changed field names only', async () => {
      const authorization = await owner('919999900001');
      const shopId = await register(authorization);

      const response = await request(server())
        .put(`/v1/shops/${shopId}/profile`)
        .set('Authorization', authorization)
        .send({
          supportPhone: '098765 43210',
          address: ADDRESS,
          location: MAP_PIN,
        })
        .expect(200);

      expect(response.body).toEqual({
        shopId,
        shopName: 'Lakshmi Paints',
        status: 'DRAFT',
        supportPhone: '+919876543210',
        address: {
          line1: 'Door 12/345, MG Road',
          line2: 'Ravipuram',
          landmark: null,
          city: 'Kochi',
          district: 'Ernakulam',
          stateCode: 'KL',
          stateName: 'Kerala',
          postalCode: '682016',
        },
        location: {
          latitude: 9.965812,
          longitude: 76.289877,
          source: 'MAP_PIN',
          updatedAt: expect.any(String),
        },
        photo: null,
        updatedAt: expect.any(String),
      });

      const again = await request(server())
        .get(`/v1/shops/${shopId}/profile`)
        .set('Authorization', authorization)
        .expect(200);
      expect(again.body).toEqual(response.body);

      const onboarding = await request(server())
        .get(`/v1/shops/${shopId}/onboarding`)
        .set('Authorization', authorization)
        .expect(200);
      expect(onboarding.body.items).toEqual([
        { key: 'address', done: true },
        { key: 'location', done: true },
        { key: 'support_phone', done: true },
        { key: 'photo', done: false },
      ]);

      const event = await testApp.prisma.auditEvent.findFirstOrThrow({
        where: { action: 'shop.profile_updated' },
      });
      expect(event).toMatchObject({
        actorType: 'USER',
        entityType: 'shop',
        entityId: shopId,
        shopId,
        metadata: { fields: ['supportPhone', 'address', 'location'] },
      });
      const audit = JSON.stringify(await testApp.prisma.auditEvent.findMany());
      for (const secret of [
        '9876543210',
        '9.96',
        '76.28',
        'MG Road',
        '682016',
      ]) {
        expect(audit).not.toContain(secret);
      }
    });

    it('keeps the location when it is omitted, and clears fields set to null', async () => {
      const authorization = await owner('919999900001');
      const shopId = await register(authorization);
      await request(server())
        .put(`/v1/shops/${shopId}/profile`)
        .set('Authorization', authorization)
        .send({
          supportPhone: '9876543210',
          address: ADDRESS,
          location: MAP_PIN,
        })
        .expect(200);

      const response = await request(server())
        .put(`/v1/shops/${shopId}/profile`)
        .set('Authorization', authorization)
        .send({ supportPhone: null, address: null })
        .expect(200);

      expect(response.body).toMatchObject({
        supportPhone: null,
        address: null,
        location: { latitude: 9.965812, source: 'MAP_PIN' },
      });
      const events = await testApp.prisma.auditEvent.findMany({
        where: { action: 'shop.profile_updated' },
        orderBy: { occurredAt: 'asc' },
      });
      expect(events.map((e) => e.metadata)).toEqual([
        { fields: ['supportPhone', 'address', 'location'] },
        { fields: ['supportPhone', 'address'] },
      ]);
    });

    it('writes no audit event when nothing changed', async () => {
      const authorization = await owner('919999900001');
      const shopId = await register(authorization);
      const body = { supportPhone: '9876543210', address: ADDRESS };
      for (let i = 0; i < 2; i += 1) {
        await request(server())
          .put(`/v1/shops/${shopId}/profile`)
          .set('Authorization', authorization)
          .send(body)
          .expect(200);
      }

      expect(
        (await auditActions()).filter((a) => a === 'shop.profile_updated'),
      ).toHaveLength(1);
    });

    it('answers 400 with a field error for each invalid value', async () => {
      const authorization = await owner('919999900001');
      const shopId = await register(authorization);

      const response = await request(server())
        .put(`/v1/shops/${shopId}/profile`)
        .set('Authorization', authorization)
        .send({
          supportPhone: '0484 2345678',
          address: {
            ...ADDRESS,
            city: '  ',
            stateCode: 'XX',
            postalCode: '012345',
          },
          location: { latitude: 51.5, longitude: -0.12, source: 'MAP_PIN' },
        })
        .expect(400);

      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(response.body.code).toBe('validation_failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            path: 'supportPhone',
            message: 'Enter a 10-digit Indian mobile number.',
          },
          { path: 'address.city', message: 'Enter the city or town.' },
          { path: 'address.stateCode', message: 'Choose the state.' },
          {
            path: 'address.postalCode',
            message: 'Enter the 6-digit PIN code.',
          },
          {
            path: 'location.latitude',
            message: 'The location must be in India.',
          },
          {
            path: 'location.longitude',
            message: 'The location must be in India.',
          },
        ]),
      );
      const shop = await testApp.prisma.shop.findUniqueOrThrow({
        where: { id: shopId },
      });
      expect(shop.supportPhone).toBeNull();
      expect(shop.addressLine1).toBeNull();
    });

    it('requires both keys (PUT replaces the profile)', async () => {
      const authorization = await owner('919999900001');
      const shopId = await register(authorization);

      const response = await request(server())
        .put(`/v1/shops/${shopId}/profile`)
        .set('Authorization', authorization)
        .send({ supportPhone: '9876543210' })
        .expect(400);
      expect(response.body.errors).toEqual([
        expect.objectContaining({ path: 'address' }),
      ]);
    });
  });

  describe('PUT /v1/shops/:shopId/location', () => {
    it('sets the device location and audits the source only', async () => {
      const authorization = await owner('919999900001');
      const shopId = await register(authorization);

      const response = await request(server())
        .put(`/v1/shops/${shopId}/location`)
        .set('Authorization', authorization)
        .send({ latitude: 10.0261, longitude: 76.3125, source: 'DEVICE_GPS' })
        .expect(200);

      expect(response.body.location).toEqual({
        latitude: 10.0261,
        longitude: 76.3125,
        source: 'DEVICE_GPS',
        updatedAt: expect.any(String),
      });
      const event = await testApp.prisma.auditEvent.findFirstOrThrow({
        where: { action: 'shop.location_updated' },
      });
      expect(event.metadata).toEqual({ source: 'DEVICE_GPS' });
    });

    it('answers 400 for an unknown source or missing coordinates', async () => {
      const authorization = await owner('919999900001');
      const shopId = await register(authorization);

      const response = await request(server())
        .put(`/v1/shops/${shopId}/location`)
        .set('Authorization', authorization)
        .send({ latitude: '10', source: 'GUESS' })
        .expect(400);
      expect(
        response.body.errors.map((e: { path: string }) => e.path).sort(),
      ).toEqual(['latitude', 'longitude', 'source']);
    });
  });

  describe('tenant boundary', () => {
    it('answers 404 to the owner of another shop on every route, both ways, and changes nothing', async () => {
      const ownerA = await owner('919999900001');
      const ownerB = await owner('919999900002');
      const shopA = await register(ownerA, 'Shop A');
      const shopB = await register(ownerB, 'Shop B');

      for (const [caller, target] of [
        [ownerA, shopB],
        [ownerB, shopA],
      ] as const) {
        const attempts = [
          () => request(server()).get(`/v1/shops/${target}/profile`),
          () => request(server()).get(`/v1/shops/${target}/onboarding`),
          () =>
            request(server())
              .put(`/v1/shops/${target}/profile`)
              .set('Authorization', caller)
              .send({ supportPhone: '9876543210', address: ADDRESS }),
          () =>
            request(server())
              .put(`/v1/shops/${target}/location`)
              .set('Authorization', caller)
              .send(MAP_PIN),
        ];
        for (const attempt of attempts) {
          const response = await attempt()
            .set('Authorization', caller)
            .expect(404);
          expect(response.body.code).toBe('shop_not_found');
        }
      }

      const shops = await testApp.prisma.shop.findMany();
      expect(
        shops.every((s) => s.supportPhone === null && s.latitude === null),
      ).toBe(true);
      expect(await auditActions()).not.toContain('shop.profile_updated');
      expect(await auditActions()).not.toContain('shop.location_updated');
    });

    it('answers 404 to a platform admin and to a user without shops', async () => {
      const shopId = await register(await owner('919999900001'));
      const adminSub = randomUUID();
      const admin = await testApp.prisma.user.create({
        data: { authSubject: adminSub, email: 'root@example.com' },
      });
      await testApp.prisma.platformAdmin.create({
        data: { userId: admin.id, role: 'SUPER_ADMIN' },
      });

      for (const authorization of [
        `Bearer ${await issuer.sign({ sub: adminSub })}`,
        await owner('919999900003'),
      ]) {
        await request(server())
          .put(`/v1/shops/${shopId}/location`)
          .set('Authorization', authorization)
          .send(MAP_PIN)
          .expect(404);
      }
    });

    it('answers 404 for a malformed shop id and 401 without a token', async () => {
      const authorization = await owner('919999900001');
      await request(server())
        .get('/v1/shops/not-a-uuid/profile')
        .set('Authorization', authorization)
        .expect(404);
      const shopId = await register(authorization);
      await request(server()).get(`/v1/shops/${shopId}/profile`).expect(401);
      await request(server())
        .put(`/v1/shops/${shopId}/location`)
        .send(MAP_PIN)
        .expect(401);
    });
  });

  describe('database constraints (defense in depth)', () => {
    it('rejects a partial address, a location outside India and a non-Indian mobile', async () => {
      const shopId = await register(await owner('919999900001'));
      const update = (data: object) =>
        testApp.prisma.shop.update({ where: { id: shopId }, data });

      await expect(update({ addressLine1: 'MG Road' })).rejects.toThrow();
      await expect(
        update({
          latitude: 51.5,
          longitude: -0.12,
          locationSource: 'MAP_PIN',
          locationUpdatedAt: new Date(),
        }),
      ).rejects.toThrow();
      await expect(update({ latitude: 10 })).rejects.toThrow();
      await expect(update({ supportPhone: '+14155550100' })).rejects.toThrow();
      await expect(update({ postalCode: '12345' })).rejects.toThrow();
    });
  });
});
