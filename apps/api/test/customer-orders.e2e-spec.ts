import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

/** Kochi, about 2 km from the shop pin below. */
const NEAR = { latitude: 10.02, longitude: 76.31 };
/** Thrissur, far outside an 8 km delivery area. */
const FAR = { latitude: 10.52, longitude: 76.21 };

describe('Checkout and My Orders (CUS-006, e2e, real Postgres)', () => {
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

  /** A signed-in person with a Customer App profile of [type]. */
  async function person(
    type: 'PAINTER' | 'CUSTOMER',
    phone = '+919999900001',
  ): Promise<string> {
    const auth = `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
    await request(server())
      .put('/v1/me/customer-profile')
      .set('Authorization', auth)
      .send({ displayName: 'Ravi', customerType: type })
      .expect(200);
    return auth;
  }

  /**
   * A live shop with a pin in Kochi that delivers within 8 km for ₹40, free
   * from ₹2,000, selling Primer 1 L ₹300 and 4 L ₹1,100.
   */
  async function seedShop(name = 'Kochi Paints') {
    const p = testApp.prisma;
    const category =
      (await p.catalogueCategory.findFirst({
        where: { nameKey: 'primer', shopId: null },
      })) ??
      (await p.catalogueCategory.create({
        data: { name: 'Primer', nameKey: 'primer' },
      }));
    const brand = await p.brand.create({
      data: { name: `${name} Brand`, nameKey: `${name} brand`.toLowerCase() },
    });
    const product = await p.catalogueProduct.create({
      data: {
        name: 'Primer',
        nameKey: 'primer',
        brandId: brand.id,
        categoryId: category.id,
        supportsShades: false,
        packs: {
          create: [
            { quantity: 1, unit: 'LITRE' },
            { quantity: 4, unit: 'LITRE' },
          ],
        },
      },
      include: { packs: { orderBy: { quantity: 'asc' } } },
    });
    const shop = await p.shop.create({
      data: {
        name,
        status: 'ACTIVE',
        latitude: 10.0,
        longitude: 76.3,
        locationSource: 'MAP_PIN',
        locationUpdatedAt: new Date(),
        deliveryEnabled: true,
        deliveryChargePaise: 4000,
        freeDeliveryAbovePaise: 200000,
        deliveryRadiusKm: 8,
      },
    });
    const listed = await p.shopProduct.create({
      data: {
        shopId: shop.id,
        catalogueProductId: product.id,
        packs: {
          create: [
            {
              cataloguePackId: product.packs[0]!.id,
              pricePaise: 30000,
              available: true,
            },
            {
              cataloguePackId: product.packs[1]!.id,
              pricePaise: 110000,
              available: true,
            },
          ],
        },
      },
      include: { packs: { orderBy: { pricePaise: 'asc' } } },
    });
    return { shop, oneLitre: listed.packs[0]!, fourLitre: listed.packs[1]! };
  }

  function addSite(auth: string, pin = NEAR) {
    return request(server())
      .post('/v1/me/sites')
      .set('Authorization', auth)
      .send({
        name: 'Green Villa',
        address: 'Green Villa, Kakkanad, Kochi',
        pin,
      })
      .expect(201);
  }

  function addPlace(auth: string, pin = NEAR, label = 'Home') {
    return request(server())
      .post('/v1/me/delivery-locations')
      .set('Authorization', auth)
      .send({ label, address: 'Flat 3C, Lotus Apartments, Kochi', pin })
      .expect(201);
  }

  function place(auth: string, body: Record<string, unknown>) {
    return request(server())
      .post('/v1/me/orders')
      .set('Authorization', auth)
      .send({ clientRequestId: randomUUID(), ...body });
  }

  it('requires sign-in', async () => {
    await request(server()).get('/v1/me/orders').expect(401);
    await request(server()).get('/v1/me/delivery-locations').expect(401);
  });

  it('a customer orders for pickup and sees it in My Orders', async () => {
    const { shop, oneLitre } = await seedShop();
    const auth = await person('CUSTOMER');
    const placed = await place(auth, {
      shopId: shop.id,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: oneLitre.id, quantity: 2 }],
      expectedTotalPaise: 60000,
    }).expect(201);

    const list = await request(server())
      .get('/v1/me/orders')
      .set('Authorization', auth)
      .expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({
      id: placed.body.id,
      shop: { name: 'Kochi Paints' },
      status: 'NEW',
      itemCount: 2,
      totalPaise: 60000,
      needsAnswer: false,
    });

    const detail = await request(server())
      .get(`/v1/me/orders/${placed.body.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(detail.body).toMatchObject({
      fulfilment: 'PICKUP',
      deliveryAddress: null,
      totals: { itemsPaise: 60000, deliveryPaise: 0, totalPaise: 60000 },
      payment: { status: 'UNPAID', method: null },
      canCancel: true,
    });
    expect(detail.body.items[0]).toMatchObject({
      productName: 'Primer',
      packLabel: '1 L',
      quantity: 2,
    });
  });

  it('a customer delivers to a saved place; charge and area are checked', async () => {
    const { shop, oneLitre } = await seedShop();
    const auth = await person('CUSTOMER');
    const home = await addPlace(auth);
    const far = await addPlace(auth, FAR, 'Office');

    const missing = await place(auth, {
      shopId: shop.id,
      fulfilment: 'DELIVERY',
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 34000,
    }).expect(400);
    expect(missing.body.code).toBe('delivery_location_required');

    const outside = await place(auth, {
      shopId: shop.id,
      fulfilment: 'DELIVERY',
      deliveryLocationId: far.body.id,
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 34000,
    }).expect(409);
    expect(outside.body.code).toBe('delivery_out_of_range');

    const placed = await place(auth, {
      shopId: shop.id,
      fulfilment: 'DELIVERY',
      deliveryLocationId: home.body.id,
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 34000,
    }).expect(201);
    const detail = await request(server())
      .get(`/v1/me/orders/${placed.body.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(detail.body.totals).toEqual({
      itemsPaise: 30000,
      deliveryPaise: 4000,
      totalPaise: 34000,
    });
    expect(detail.body.deliveryAddress).toBe(
      'Flat 3C, Lotus Apartments, Kochi',
    );
  });

  it('places nothing when the total changed since checkout', async () => {
    const { shop, oneLitre } = await seedShop();
    const auth = await person('CUSTOMER');
    const changed = await place(auth, {
      shopId: shop.id,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 25000,
    }).expect(409);
    expect(changed.body.code).toBe('order_total_changed');
    expect(await testApp.prisma.order.count()).toBe(0);
  });

  it('a repeated request returns the same order instead of a second one', async () => {
    const { shop, oneLitre } = await seedShop();
    const auth = await person('CUSTOMER');
    const body = {
      clientRequestId: randomUUID(),
      shopId: shop.id,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 30000,
    };
    const [first, second] = await Promise.all([
      place(auth, body),
      place(auth, body),
    ]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
    const again = await place(auth, body).expect(201);
    expect(again.body.id).toBe(first.body.id);
    expect(await testApp.prisma.order.count()).toBe(1);
  });

  it('a painter orders for one of their sites (D-049)', async () => {
    const { shop, oneLitre } = await seedShop();
    const painter = await person('PAINTER');
    const noSite = await place(painter, {
      shopId: shop.id,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 30000,
    }).expect(400);
    expect(noSite.body.code).toBe('site_required');

    const site = await addSite(painter);
    const placed = await place(painter, {
      shopId: shop.id,
      fulfilment: 'DELIVERY',
      siteId: site.body.id,
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 34000,
    }).expect(201);
    const order = await testApp.prisma.order.findUniqueOrThrow({
      where: { id: placed.body.id },
    });
    expect(order.customerSiteId).toBe(site.body.id);
    expect(order.siteLabel).toBe('Green Villa');
    expect(order.deliveryAddress).toBe(
      'Green Villa, Green Villa, Kakkanad, Kochi',
    );

    // A normal customer can't name a site.
    const customer = await person('CUSTOMER', '+919999900002');
    const refused = await place(customer, {
      shopId: shop.id,
      fulfilment: 'PICKUP',
      siteId: site.body.id,
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 30000,
    }).expect(400);
    expect(refused.body.code).toBe('site_not_allowed');
  });

  it('adds up site spend by shop, without cancelled orders (CUS-007)', async () => {
    const kochi = await seedShop('Kochi Paints');
    const aluva = await seedShop('Aluva Colours');
    const painter = await person('PAINTER');
    const site = await addSite(painter);
    const siteId = site.body.id as string;
    expect(site.body.spend).toEqual({
      totalPaise: 0,
      shopCount: 0,
      orderCount: 0,
      lastOrderAt: null,
    });

    const pickup = (shopId: string, packId: string, totalPaise: number) =>
      place(painter, {
        shopId,
        fulfilment: 'PICKUP',
        siteId,
        items: [{ shopProductPackId: packId, quantity: 1 }],
        expectedTotalPaise: totalPaise,
      }).expect(201);
    const first = await pickup(kochi.shop.id, kochi.oneLitre.id, 30000);
    await pickup(kochi.shop.id, kochi.fourLitre.id, 110000);
    const cancelled = await pickup(aluva.shop.id, aluva.fourLitre.id, 110000);
    const aluvaOrder = await pickup(aluva.shop.id, aluva.oneLitre.id, 30000);
    await request(server())
      .post(`/v1/me/orders/${cancelled.body.id}/cancel`)
      .set('Authorization', painter)
      .send({})
      .expect(200);
    await testApp.prisma.order.update({
      where: { id: first.body.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    const list = await request(server())
      .get('/v1/me/sites')
      .set('Authorization', painter)
      .expect(200);
    expect(list.body.items[0].spend).toMatchObject({
      totalPaise: 170000,
      shopCount: 2,
      orderCount: 3,
    });

    const spend = await request(server())
      .get(`/v1/me/sites/${siteId}/spend`)
      .set('Authorization', painter)
      .expect(200);
    expect(spend.body).toMatchObject({
      site: { id: siteId, name: 'Green Villa', archived: false },
      totalPaise: 170000,
      ordersTruncated: false,
    });
    // The shop ordered from most recently comes first.
    expect(spend.body.shops).toHaveLength(2);
    expect(spend.body.shops[0]).toMatchObject({
      shop: { id: aluva.shop.id, name: 'Aluva Colours' },
      totalPaise: 30000,
      orderCount: 1,
      orders: [{ id: aluvaOrder.body.id, status: 'NEW', totalPaise: 30000 }],
    });
    expect(spend.body.shops[1]).toMatchObject({
      shop: { id: kochi.shop.id, name: 'Kochi Paints' },
      totalPaise: 140000,
      orderCount: 2,
    });
    expect(
      spend.body.shops[1].orders.map((o: { status: string }) => o.status),
    ).toEqual(['NEW', 'COMPLETED']);

    // An archived site keeps its history.
    const archived = await request(server())
      .post(`/v1/me/sites/${siteId}/archive`)
      .set('Authorization', painter)
      .expect(200);
    expect(archived.body.spend.totalPaise).toBe(170000);
    const after = await request(server())
      .get(`/v1/me/sites/${siteId}/spend`)
      .set('Authorization', painter)
      .expect(200);
    expect(after.body).toMatchObject({
      site: { archived: true },
      totalPaise: 170000,
    });
  });

  it("keeps a site's spend private to its painter (CUS-007)", async () => {
    const { shop, oneLitre } = await seedShop();
    const painter = await person('PAINTER');
    const site = await addSite(painter);
    await place(painter, {
      shopId: shop.id,
      fulfilment: 'PICKUP',
      siteId: site.body.id,
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 30000,
    }).expect(201);

    const other = await person('PAINTER', '+919999900002');
    const notFound = await request(server())
      .get(`/v1/me/sites/${site.body.id}/spend`)
      .set('Authorization', other)
      .expect(404);
    expect(notFound.body.code).toBe('site_not_found');

    const customer = await person('CUSTOMER', '+919999900003');
    const refused = await request(server())
      .get(`/v1/me/sites/${site.body.id}/spend`)
      .set('Authorization', customer)
      .expect(403);
    expect(refused.body.code).toBe('painter_only');

    await request(server())
      .get(`/v1/me/sites/${site.body.id}/spend`)
      .expect(401);
  });

  it("can't use another person's site or delivery place", async () => {
    const { shop, oneLitre } = await seedShop();
    const owner = await person('PAINTER');
    const site = await addSite(owner);
    const ownerPlace = await addPlace(
      await person('CUSTOMER', '+919999900003'),
    );

    const other = await person('PAINTER', '+919999900002');
    const bySite = await place(other, {
      shopId: shop.id,
      fulfilment: 'PICKUP',
      siteId: site.body.id,
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 30000,
    }).expect(400);
    expect(bySite.body.code).toBe('site_not_found');

    const otherCustomer = await person('CUSTOMER', '+919999900004');
    await place(otherCustomer, {
      shopId: shop.id,
      fulfilment: 'DELIVERY',
      deliveryLocationId: ownerPlace.body.id,
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 34000,
    }).expect(404);
    expect(await testApp.prisma.order.count()).toBe(0);
  });

  it("keeps each person's orders private", async () => {
    const { shop, oneLitre } = await seedShop();
    const owner = await person('CUSTOMER');
    const placed = await place(owner, {
      shopId: shop.id,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 30000,
    }).expect(201);

    const other = await person('CUSTOMER', '+919999900002');
    const list = await request(server())
      .get('/v1/me/orders')
      .set('Authorization', other)
      .expect(200);
    expect(list.body.items).toEqual([]);
    const id = placed.body.id as string;
    await request(server())
      .get(`/v1/me/orders/${id}`)
      .set('Authorization', other)
      .expect(404);
    await request(server())
      .post(`/v1/me/orders/${id}/cancel`)
      .set('Authorization', other)
      .send({})
      .expect(404);
    await request(server())
      .get('/v1/me/orders/not-a-uuid')
      .set('Authorization', other)
      .expect(404);
    const order = await testApp.prisma.order.findUniqueOrThrow({
      where: { id },
    });
    expect(order.status).toBe('NEW');
  });

  it('lists orders from every shop, newest first', async () => {
    const kochi = await seedShop('Kochi Paints');
    const aluva = await seedShop('Aluva Colours');
    const auth = await person('CUSTOMER');
    for (const { shop, oneLitre } of [kochi, aluva]) {
      await place(auth, {
        shopId: shop.id,
        fulfilment: 'PICKUP',
        items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
        expectedTotalPaise: 30000,
      }).expect(201);
    }
    const list = await request(server())
      .get('/v1/me/orders')
      .set('Authorization', auth)
      .expect(200);
    expect(
      (list.body.items as { shop: { name: string } }[]).map((o) => o.shop.name),
    ).toEqual(['Aluva Colours', 'Kochi Paints']);
    expect(list.body.hasMore).toBe(false);
  });

  it('cancels while new or packing, not once ready (D-047)', async () => {
    const { shop, oneLitre } = await seedShop();
    const auth = await person('CUSTOMER');
    const first = await place(auth, {
      shopId: shop.id,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 30000,
    }).expect(201);
    const cancelled = await request(server())
      .post(`/v1/me/orders/${first.body.id}/cancel`)
      .set('Authorization', auth)
      .send({ reason: 'Ordered by mistake' })
      .expect(200);
    expect(cancelled.body).toMatchObject({
      status: 'CANCELLED',
      canCancel: false,
      cancelled: { by: 'CUSTOMER', reason: 'Ordered by mistake' },
    });

    const second = await place(auth, {
      shopId: shop.id,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: oneLitre.id, quantity: 1 }],
      expectedTotalPaise: 30000,
    }).expect(201);
    await testApp.prisma.order.update({
      where: { id: second.body.id },
      data: { status: 'READY_FOR_PICKUP', readyAt: new Date() },
    });
    const late = await request(server())
      .post(`/v1/me/orders/${second.body.id}/cancel`)
      .set('Authorization', auth)
      .send({})
      .expect(409);
    expect(late.body.code).toBe('order_status_invalid');
  });

  it('answers a substitute the shop suggested (D-045)', async () => {
    const { shop, oneLitre, fourLitre } = await seedShop();
    const auth = await person('CUSTOMER');
    const placed = await place(auth, {
      shopId: shop.id,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: fourLitre.id, quantity: 1 }],
      expectedTotalPaise: 110000,
    }).expect(201);
    const orderId = placed.body.id as string;
    const p = testApp.prisma;
    const original = await p.orderItem.findFirstOrThrow({ where: { orderId } });
    await p.orderItem.update({
      where: { id: original.id },
      data: { status: 'NOT_AVAILABLE', shopNote: 'Stock not available.' },
    });
    const offer = await p.orderItem.create({
      data: {
        shopId: shop.id,
        orderId,
        position: 2,
        shopProductPackId: oneLitre.id,
        productName: 'Primer',
        packLabel: '1 L',
        unitPricePaise: 30000,
        quantity: 4,
        status: 'SUBSTITUTE_OFFERED',
        substituteForId: original.id,
      },
    });

    const list = await request(server())
      .get('/v1/me/orders')
      .set('Authorization', auth)
      .expect(200);
    expect(list.body.items[0].needsAnswer).toBe(true);

    const answered = await request(server())
      .post(`/v1/me/orders/${orderId}/items/${offer.id}/substitute`)
      .set('Authorization', auth)
      .send({ accept: true })
      .expect(200);
    const statuses = (answered.body.items as { status: string }[]).map(
      (item) => item.status,
    );
    expect(statuses).toEqual(['SUBSTITUTED', 'OK']);
    expect(answered.body.totals.totalPaise).toBe(120000);

    await request(server())
      .post(`/v1/me/orders/${orderId}/items/${offer.id}/substitute`)
      .set('Authorization', auth)
      .send({ accept: false })
      .expect(409);
  });

  it('saves, renames and archives delivery places; names stay unique', async () => {
    const auth = await person('CUSTOMER');
    const home = await addPlace(auth);
    const taken = await request(server())
      .post('/v1/me/delivery-locations')
      .set('Authorization', auth)
      .send({ label: 'home', address: 'Another house, Kochi', pin: NEAR })
      .expect(409);
    expect(taken.body.code).toBe('delivery_location_label_taken');

    await request(server())
      .patch(`/v1/me/delivery-locations/${home.body.id}`)
      .set('Authorization', auth)
      .send({ label: 'My flat' })
      .expect(200);
    await request(server())
      .post(`/v1/me/delivery-locations/${home.body.id}/archive`)
      .set('Authorization', auth)
      .expect(204);
    const list = await request(server())
      .get('/v1/me/delivery-locations')
      .set('Authorization', auth)
      .expect(200);
    expect(list.body.items).toEqual([]);

    const other = await person('CUSTOMER', '+919999900002');
    await request(server())
      .patch(`/v1/me/delivery-locations/${home.body.id}`)
      .set('Authorization', other)
      .send({ label: 'Mine' })
      .expect(404);
  });
});
