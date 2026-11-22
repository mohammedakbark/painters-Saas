import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { OrderPlacementService } from '../src/orders/order-placement.service.js';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

const SHOP_PIN = { latitude: 9.9816, longitude: 76.2756 };
const MOBILE = '+919999900012';

describe('Connecting shop records (CON-001, e2e, real Postgres)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;
  let placement: OrderPlacementService;
  let categoryId: string;

  beforeAll(async () => {
    issuer = await createTestTokenIssuer();
    testApp = await createTestApp({ keys: issuer.keys });
    placement = testApp.app.get(OrderPlacementService);
  });

  beforeEach(async () => {
    await resetDatabase(testApp.prisma);
    categoryId = (
      await testApp.prisma.catalogueCategory.create({
        data: { name: 'Primer', nameKey: 'primer' },
      })
    ).id;
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  const server = () => testApp.app.getHttpServer();

  async function liveShop(phone: string, name: string) {
    const auth = `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
    const shopId = (
      await request(server())
        .post('/v1/shops')
        .set('Authorization', auth)
        .send({ shopName: name, ownerName: 'Anil Kumar' })
        .expect(201)
    ).body.id as string;
    await request(server())
      .put(`/v1/shops/${shopId}/location`)
      .set('Authorization', auth)
      .send({ ...SHOP_PIN, source: 'MAP_PIN' })
      .expect(200);
    await testApp.prisma.shop.update({
      where: { id: shopId },
      data: { status: 'ACTIVE' },
    });
    const product = await request(server())
      .post(`/v1/shops/${shopId}/catalogue/products`)
      .set('Authorization', auth)
      .send({
        source: 'own',
        name: 'Wall Primer',
        categoryId,
        brandName: 'Local Brand',
        packs: [{ quantity: 1, unit: 'LITRE', pricePaise: 50000 }],
      })
      .expect(201);
    return { auth, shopId, pack: product.body.packs[0].id as string };
  }
  type Shop = Awaited<ReturnType<typeof liveShop>>;

  const post = (shop: Shop, path: string, body: object = {}) =>
    request(server())
      .post(`/v1/shops/${shop.shopId}${path}`)
      .set('Authorization', shop.auth)
      .send(body);

  /** A painter the shop recorded by [MOBILE], with a site and a paid order. */
  async function recordPainter(shop: Shop) {
    const customer = await post(shop, '/customers', {
      name: 'Shibu Thomas',
      phone: MOBILE.slice(3),
      kind: 'PAINTER',
    }).expect(201);
    const site = await post(shop, `/customers/${customer.body.id}/sites`, {
      name: 'Skyline Flats 4B',
      address: 'Skyline Flats, Kakkanad',
    }).expect(201);
    await post(shop, '/orders', {
      customerId: customer.body.id,
      siteId: site.body.id,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: shop.pack, quantity: 2 }],
      handedOver: true,
    }).expect(201);
    return customer.body.id as string;
  }

  /** The person with [MOBILE] signs in to the Customer App. */
  async function person(phone = MOBILE) {
    const user = await testApp.prisma.user.create({
      data: { authSubject: randomUUID(), phone, displayName: 'Shibu' },
    });
    const auth = `Bearer ${await issuer.sign({ sub: user.authSubject, phone })}`;
    return { user, auth };
  }

  const ask = (auth: string, shop: Shop) =>
    request(server())
      .post(`/v1/me/shops/${shop.shopId}/connect`)
      .set('Authorization', auth);

  const requests = (shop: Shop) =>
    request(server())
      .get(`/v1/shops/${shop.shopId}/connect-requests`)
      .set('Authorization', shop.auth)
      .expect(200);

  it('links the shop record when the person has no app record there', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const recorded = await recordPainter(shop);
    const shibu = await person();

    const asked = await ask(shibu.auth, shop).expect(200);
    expect(asked.body.status).toBe('PENDING');
    // Asking again keeps one request.
    await ask(shibu.auth, shop).expect(200);

    const open = await requests(shop);
    expect(open.body.items).toHaveLength(1);
    expect(open.body.items[0]).toMatchObject({
      customer: { id: recorded, name: 'Shibu Thomas', kind: 'PAINTER' },
      mergesIntoAppRecord: false,
    });

    const approved = await post(
      shop,
      `/connect-requests/${open.body.items[0].id}/approve`,
    ).expect(200);
    expect(approved.body).toEqual({ customerId: recorded, merged: false });

    const orders = await request(server())
      .get('/v1/me/orders')
      .set('Authorization', shibu.auth)
      .expect(200);
    expect(orders.body.items).toHaveLength(1);
    const bills = await request(server())
      .get('/v1/me/bills')
      .set('Authorization', shibu.auth)
      .expect(200);
    expect(bills.body.items[0].balancePaise).toBe(100000);
    const status = await request(server())
      .get(`/v1/me/shops/${shop.shopId}/connect`)
      .set('Authorization', shibu.auth)
      .expect(200);
    expect(status.body.status).toBe('APPROVED');
  });

  it('merges into the app record: orders, bill and sites move; amounts stay', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const recorded = await recordPainter(shop); // ₹1,000 owed
    const shibu = await person();
    // Shibu already orders in the app: ₹500, completed and on the bill.
    const placed = await placement.place({
      shopId: shop.shopId,
      userId: shibu.user.id,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: shop.pack, quantity: 1 }],
    });
    for (const to of ['PACKING', 'READY_FOR_PICKUP', 'COMPLETED']) {
      await post(shop, `/orders/${placed.id}/status`, { to }).expect(200);
    }
    const app = await testApp.prisma.shopCustomer.findFirstOrThrow({
      where: { shopId: shop.shopId, userId: shibu.user.id },
    });
    const entriesBefore = await testApp.prisma.billEntry.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, amountPaise: true },
    });

    await ask(shibu.auth, shop).expect(200);
    const open = await requests(shop);
    expect(open.body.items[0].mergesIntoAppRecord).toBe(true);
    const approved = await post(
      shop,
      `/connect-requests/${open.body.items[0].id}/approve`,
    ).expect(200);
    expect(approved.body).toEqual({ customerId: app.id, merged: true });

    const bill = await request(server())
      .get(`/v1/shops/${shop.shopId}/customers/${app.id}/bill`)
      .set('Authorization', shop.auth)
      .expect(200);
    expect(bill.body.balancePaise).toBe(150000);
    expect(bill.body.sites).toEqual([
      { label: 'Skyline Flats 4B', billedPaise: 100000, orderCount: 1 },
    ]);
    const entriesAfter = await testApp.prisma.billEntry.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, amountPaise: true, customerId: true },
    });
    expect(
      entriesAfter.map(({ id, amountPaise }) => ({ id, amountPaise })),
    ).toEqual(entriesBefore);
    expect(new Set(entriesAfter.map((e) => e.customerId))).toEqual(
      new Set([app.id]),
    );

    // The old record is kept as merged and no longer shows.
    const old = await testApp.prisma.shopCustomer.findUniqueOrThrow({
      where: { id: recorded },
    });
    expect(old.mergedIntoId).toBe(app.id);
    await request(server())
      .get(`/v1/shops/${shop.shopId}/customers/${recorded}`)
      .set('Authorization', shop.auth)
      .expect(404);
    const list = await request(server())
      .get(`/v1/shops/${shop.shopId}/customers`)
      .set('Authorization', shop.auth)
      .expect(200);
    expect(list.body.items.map((c: { id: string }) => c.id)).toEqual([app.id]);

    // Outside a merge, entries still can't move.
    await expect(
      testApp.prisma.billEntry.updateMany({ data: { customerId: recorded } }),
    ).rejects.toThrow(/append-only/);
  });

  it('never tells the person whether a record exists, and keeps other shops out', async () => {
    const abc = await liveShop('+919999900001', 'ABC Paints');
    const other = await liveShop('+919999900002', 'Kochi Colours');
    await recordPainter(abc);
    // Someone with a different mobile asks ABC: same answer, nothing to see.
    const stranger = await person('+919999900013');
    const asked = await ask(stranger.auth, abc).expect(200);
    expect(asked.body.status).toBe('PENDING');
    const shibu = await person();
    await ask(shibu.auth, abc).expect(200);

    const open = await requests(abc);
    expect(open.body.items).toHaveLength(1); // Only the matching mobile.
    // The other shop sees nothing and can't answer ABC's request.
    expect((await requests(other)).body.items).toEqual([]);
    await post(
      other,
      `/connect-requests/${open.body.items[0].id}/approve`,
    ).expect(404);

    await post(
      abc,
      `/connect-requests/${open.body.items[0].id}/decline`,
    ).expect(204);
    const status = await request(server())
      .get(`/v1/me/shops/${abc.shopId}/connect`)
      .set('Authorization', shibu.auth)
      .expect(200);
    expect(status.body.status).toBe('DECLINED');
    const bills = await request(server())
      .get('/v1/me/bills')
      .set('Authorization', shibu.auth)
      .expect(200);
    expect(bills.body.items).toEqual([]);
    // Asking again after a decline is allowed.
    expect((await ask(shibu.auth, abc).expect(200)).body.status).toBe(
      'PENDING',
    );
  });
});
