import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

const DELIVERY = {
  enabled: true,
  chargePaise: 5000,
  freeAbovePaise: 300000,
  radiusKm: 8,
};

describe('Shop settings: delivery and order messages (SHP-008, e2e, real Postgres)', () => {
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

  async function register(authorization: string, shopName = 'Lakshmi Paints') {
    const response = await request(server())
      .post('/v1/shops')
      .set('Authorization', authorization)
      .send({ shopName, ownerName: 'Anil Kumar' })
      .expect(201);
    return (response.body as { id: string }).id;
  }

  async function setLocation(authorization: string, shopId: string) {
    await request(server())
      .put(`/v1/shops/${shopId}/location`)
      .set('Authorization', authorization)
      .send({ latitude: 9.9658, longitude: 76.2898, source: 'MAP_PIN' })
      .expect(200);
  }

  const get = (authorization: string, shopId: string) =>
    request(server())
      .get(`/v1/shops/${shopId}/settings`)
      .set('Authorization', authorization);
  const putDelivery = (authorization: string, shopId: string, body: object) =>
    request(server())
      .put(`/v1/shops/${shopId}/settings/delivery`)
      .set('Authorization', authorization)
      .send(body);
  const putMessages = (authorization: string, shopId: string, body: object) =>
    request(server())
      .put(`/v1/shops/${shopId}/settings/order-messages`)
      .set('Authorization', authorization)
      .send(body);

  it('starts with pickup only and the two ready-made messages', async () => {
    const authorization = await owner('919999900001');
    const shopId = await register(authorization);
    const response = await get(authorization, shopId).expect(200);
    expect(response.body).toEqual({
      shopId,
      pickup: true,
      delivery: {
        enabled: false,
        chargePaise: null,
        freeAbovePaise: null,
        radiusKm: null,
      },
      hasLocation: false,
      orderMessages: [
        'Stock not available.',
        'Stock can be arranged by tomorrow morning.',
      ],
      updatedAt: null,
    });
  });

  it('needs the map location, a charge and a distance to turn delivery on', async () => {
    const authorization = await owner('919999900001');
    const shopId = await register(authorization);

    const noLocation = await putDelivery(
      authorization,
      shopId,
      DELIVERY,
    ).expect(409);
    expect(noLocation.body.code).toBe('delivery_needs_location');

    await setLocation(authorization, shopId);
    const missing = await putDelivery(authorization, shopId, {
      enabled: true,
      chargePaise: null,
      freeAbovePaise: null,
      radiusKm: null,
    }).expect(400);
    expect(
      (missing.body.errors as { path: string }[]).map((e) => e.path).sort(),
    ).toEqual(['chargePaise', 'radiusKm']);
    await putDelivery(authorization, shopId, {
      ...DELIVERY,
      radiusKm: 51,
    }).expect(400);
    await putDelivery(authorization, shopId, {
      ...DELIVERY,
      chargePaise: -1,
    }).expect(400);

    const saved = await putDelivery(authorization, shopId, DELIVERY).expect(
      200,
    );
    expect(saved.body.delivery).toEqual(DELIVERY);
    expect(saved.body.hasLocation).toBe(true);
    expect(saved.body.updatedAt).not.toBeNull();

    // Free delivery (charge 0) and turning it off keep the values.
    const off = await putDelivery(authorization, shopId, {
      ...DELIVERY,
      enabled: false,
      chargePaise: 0,
    }).expect(200);
    expect(off.body.delivery).toEqual({
      ...DELIVERY,
      enabled: false,
      chargePaise: 0,
    });

    const actions = await testApp.prisma.auditEvent.findMany({
      where: { shopId, action: 'shop.delivery_updated' },
    });
    expect(actions.map((event) => event.metadata)).toEqual([
      { enabled: true },
      { enabled: false },
    ]);
  });

  it('replaces the order messages, trimmed, unique and at most 10', async () => {
    const authorization = await owner('919999900001');
    const shopId = await register(authorization);

    const saved = await putMessages(authorization, shopId, {
      messages: ['  Out of stock today. ', 'Arriving on Monday.'],
    }).expect(200);
    expect(saved.body.orderMessages).toEqual([
      'Out of stock today.',
      'Arriving on Monday.',
    ]);

    await putMessages(authorization, shopId, {
      messages: ['Same', 'same'],
    }).expect(400);
    await putMessages(authorization, shopId, { messages: ['x'] }).expect(400);
    await putMessages(authorization, shopId, {
      messages: Array.from({ length: 11 }, (_, i) => `Message ${i + 1}`),
    }).expect(400);

    const empty = await putMessages(authorization, shopId, {
      messages: [],
    }).expect(200);
    expect(empty.body.orderMessages).toEqual([]);
    expect(
      await testApp.prisma.auditEvent.count({
        where: { shopId, action: 'shop.order_messages_updated' },
      }),
    ).toBe(2);
  });

  it('answers 404 to the owner of another shop and changes nothing', async () => {
    const first = await owner('919999900001');
    const second = await owner('919999900002');
    const firstShop = await register(first);
    await register(second, 'Sree Colours');
    await setLocation(first, firstShop);

    for (const response of [
      await get(second, firstShop),
      await putDelivery(second, firstShop, DELIVERY),
      await putMessages(second, firstShop, { messages: ['Taken over.'] }),
    ]) {
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('shop_not_found');
    }

    const unchanged = await get(first, firstShop).expect(200);
    expect(unchanged.body.delivery.enabled).toBe(false);
    expect(unchanged.body.orderMessages).toHaveLength(2);
  });
});
