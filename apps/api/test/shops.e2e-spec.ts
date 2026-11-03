import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

const PROBLEM_JSON = /application\/problem\+json/;

describe('Shop registration and tenant-scoped access (e2e, real Postgres)', () => {
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

  /** A signed-in shop owner (phone OTP account). */
  async function owner(phone: string): Promise<string> {
    return `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
  }

  async function register(
    authorization: string,
    shopName = 'Lakshmi Paints',
    ownerName = 'Anil Kumar',
  ): Promise<{ id: string }> {
    const response = await request(server())
      .post('/v1/shops')
      .set('Authorization', authorization)
      .send({ shopName, ownerName })
      .expect(201);
    return response.body as { id: string };
  }

  describe('POST /v1/shops', () => {
    it('creates a DRAFT shop with the caller as MASTER, in one audited transaction', async () => {
      const sub = randomUUID();
      const authorization = `Bearer ${await issuer.sign({ sub, phone: '919999900001' })}`;

      const response = await request(server())
        .post('/v1/shops')
        .set('Authorization', authorization)
        .send({ shopName: '  Lakshmi Paints ', ownerName: ' Anil Kumar ' })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        name: 'Lakshmi Paints',
        status: 'DRAFT',
        myRole: 'MASTER',
        createdAt: expect.any(String),
      });
      const user = await testApp.prisma.user.findUniqueOrThrow({
        where: { authSubject: sub },
        include: { shopMemberships: true },
      });
      expect(user.displayName).toBe('Anil Kumar');
      expect(user.shopMemberships).toEqual([
        expect.objectContaining({ shopId: response.body.id, role: 'MASTER' }),
      ]);
      const events = await testApp.prisma.auditEvent.findMany({
        orderBy: { occurredAt: 'asc' },
      });
      expect(
        events.map((e) => [e.action, e.actorType, e.actorUserId, e.shopId]),
      ).toEqual([
        ['shop.registered', 'USER', user.id, response.body.id],
        ['shop_membership.master_assigned', 'USER', user.id, response.body.id],
      ]);
      expect(JSON.stringify(events)).not.toContain('9999900001');
    });

    it('lets one person register several shops (D-026)', async () => {
      const authorization = await owner('919999900001');
      const first = await register(authorization, 'Lakshmi Paints');
      const second = await register(authorization, 'Lakshmi Paints Branch 2');

      const me = await request(server())
        .get('/v1/me')
        .set('Authorization', authorization)
        .expect(200);

      expect(me.body.shopMemberships).toEqual([
        {
          shopId: second.id,
          shopName: 'Lakshmi Paints Branch 2',
          shopStatus: 'DRAFT',
          role: 'MASTER',
        },
        {
          shopId: first.id,
          shopName: 'Lakshmi Paints',
          shopStatus: 'DRAFT',
          role: 'MASTER',
        },
      ]);
    });

    it('answers 403 phone_verification_required for an email-only account', async () => {
      const response = await request(server())
        .post('/v1/shops')
        .set(
          'Authorization',
          `Bearer ${await issuer.sign({ email: 'admin@example.com' })}`,
        )
        .send({ shopName: 'Lakshmi Paints', ownerName: 'Anil Kumar' })
        .expect(403);

      expect(response.body.code).toBe('phone_verification_required');
      expect(await testApp.prisma.shop.count()).toBe(0);
    });

    it('answers 400 with field errors for invalid input', async () => {
      const response = await request(server())
        .post('/v1/shops')
        .set('Authorization', await owner('919999900001'))
        .send({ shopName: ' x ', unexpected: true })
        .expect(400);

      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(response.body).toMatchObject({
        status: 400,
        code: 'validation_failed',
        errors: [
          {
            path: 'shopName',
            message: 'The shop name must be at least 2 characters.',
          },
          { path: 'ownerName', message: 'Enter your name.' },
        ],
      });
      expect(await testApp.prisma.shop.count()).toBe(0);
    });

    it('answers 400 for a malformed JSON body', async () => {
      const response = await request(server())
        .post('/v1/shops')
        .set('Authorization', await owner('919999900001'))
        .set('Content-Type', 'application/json')
        .send('{"shopName": ')
        .expect(400);

      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(response.body.detail).toBe('The request is malformed.');
      expect(JSON.stringify(response.body)).not.toContain('JSON at position');
    });

    it('answers 401 without a token', () =>
      request(server())
        .post('/v1/shops')
        .send({ shopName: 'Lakshmi Paints', ownerName: 'Anil Kumar' })
        .expect(401));
  });

  describe('GET /v1/shops/:shopId (tenant boundary)', () => {
    it('returns the shop to its member', async () => {
      const authorization = await owner('919999900001');
      const shop = await register(authorization);

      const response = await request(server())
        .get(`/v1/shops/${shop.id}`)
        .set('Authorization', authorization)
        .expect(200);

      expect(response.body).toMatchObject({
        id: shop.id,
        name: 'Lakshmi Paints',
        status: 'DRAFT',
        myRole: 'MASTER',
      });
    });

    it('answers 404 to the master of another shop', async () => {
      const ownerA = await owner('919999900001');
      const ownerB = await owner('919999900002');
      const shopA = await register(ownerA, 'Shop A');
      const shopB = await register(ownerB, 'Shop B');

      for (const [caller, otherShop] of [
        [ownerA, shopB],
        [ownerB, shopA],
      ] as const) {
        const response = await request(server())
          .get(`/v1/shops/${otherShop.id}`)
          .set('Authorization', caller)
          .expect(404);
        expect(response.body).toMatchObject({
          status: 404,
          code: 'shop_not_found',
        });
      }
    });

    it('answers 404 to a platform admin who is not a member', async () => {
      const shop = await register(await owner('919999900001'));
      const adminSub = randomUUID();
      const admin = await testApp.prisma.user.create({
        data: { authSubject: adminSub, email: 'root@example.com' },
      });
      await testApp.prisma.platformAdmin.create({
        data: { userId: admin.id, role: 'SUPER_ADMIN' },
      });

      await request(server())
        .get(`/v1/shops/${shop.id}`)
        .set('Authorization', `Bearer ${await issuer.sign({ sub: adminSub })}`)
        .expect(404);
    });

    it.each([
      ['an unknown id', () => randomUUID()],
      ['a malformed id', () => 'not-a-uuid'],
    ])('answers the same 404 for %s', async (_name, id) => {
      const response = await request(server())
        .get(`/v1/shops/${id()}`)
        .set('Authorization', await owner('919999900001'))
        .expect(404);

      expect(response.body.code).toBe('shop_not_found');
    });

    it('answers 401 without a token', async () => {
      const shop = await register(await owner('919999900001'));

      await request(server()).get(`/v1/shops/${shop.id}`).expect(401);
    });
  });

  it('the database allows only one MASTER per shop', async () => {
    const shop = await register(await owner('919999900001'));
    const other = await testApp.prisma.user.create({
      data: { authSubject: randomUUID(), phone: '+919999900002' },
    });

    await expect(
      testApp.prisma.shopMembership.create({
        data: { shopId: shop.id, userId: other.id, role: 'MASTER' },
      }),
    ).rejects.toThrow();
    expect(await testApp.prisma.shopMembership.count()).toBe(1);
  });

  it('the database rejects untrimmed or too-short shop names', async () => {
    await expect(
      testApp.prisma.shop.create({ data: { name: ' padded ' } }),
    ).rejects.toThrow();
    await expect(
      testApp.prisma.shop.create({ data: { name: 'x' } }),
    ).rejects.toThrow();
  });
});
