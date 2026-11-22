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

interface Bill {
  balancePaise: number;
  sites: { label: string; billedPaise: number; orderCount: number }[];
  entries: {
    items: {
      kind: string;
      amountPaise: number;
      order: { id: string; number: number } | null;
      method: string | null;
    }[];
    hasMore: boolean;
  };
}

describe('Running bills (BIL-001, e2e, real Postgres)', () => {
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

  /** A Live shop selling Wall Primer 1 L at ₹500. */
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

  async function appCustomer(phone: string) {
    return testApp.prisma.user.create({
      data: { authSubject: randomUUID(), phone, displayName: 'Ravi' },
    });
  }

  const post = (shop: Shop, path: string, body: object) =>
    request(server())
      .post(`/v1/shops/${shop.shopId}${path}`)
      .set('Authorization', shop.auth)
      .send(body);

  /** An app order of [quantity] × ₹500, for pickup, moved to [to]. */
  async function order(
    shop: Shop,
    userId: string,
    quantity: number,
    to: 'READY_FOR_PICKUP' | 'COMPLETED' = 'COMPLETED',
  ) {
    const placed = await placement.place({
      shopId: shop.shopId,
      userId,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: shop.pack, quantity }],
    });
    for (const step of ['PACKING', 'READY_FOR_PICKUP', 'COMPLETED'] as const) {
      await post(shop, `/orders/${placed.id}/status`, { to: step }).expect(200);
      if (step === to) break;
    }
    const row = await testApp.prisma.order.findUniqueOrThrow({
      where: { id: placed.id },
      select: { customerId: true },
    });
    return { id: placed.id, customerId: row.customerId };
  }

  const orderRow = (id: string) =>
    testApp.prisma.order.findUniqueOrThrow({
      where: { id },
      select: { paidPaise: true, paymentStatus: true, totalPaise: true },
    });

  const bill = async (shop: Shop, customerId: string) =>
    (
      await request(server())
        .get(`/v1/shops/${shop.shopId}/customers/${customerId}/bill`)
        .set('Authorization', shop.auth)
        .expect(200)
    ).body as Bill;

  const money = (
    shop: Shop,
    customerId: string,
    kind: 'payments' | 'refunds',
    amountPaise: number,
    clientRequestId: string = randomUUID(),
  ) =>
    post(shop, `/customers/${customerId}/bill/${kind}`, {
      amountPaise,
      method: 'UPI',
      clientRequestId,
    });

  it('completing an order puts it on the bill; payments fill the oldest first', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const ravi = await appCustomer('+919999900011');
    const first = await order(shop, ravi.id, 2); // ₹1,000
    const second = await order(shop, ravi.id, 1); // ₹500
    // Ready but not completed: not on the bill yet.
    await order(shop, ravi.id, 3, 'READY_FOR_PICKUP');

    expect((await bill(shop, first.customerId)).balancePaise).toBe(150000);

    const paid = await money(shop, first.customerId, 'payments', 120000).expect(
      200,
    );
    expect(paid.body.balancePaise).toBe(30000);
    expect(await orderRow(first.id)).toMatchObject({
      paidPaise: 100000,
      paymentStatus: 'PAID',
    });
    expect(await orderRow(second.id)).toMatchObject({
      paidPaise: 20000,
      paymentStatus: 'UNPAID',
    });

    // No advances: at most what is owed (D-062).
    const tooMuch = await money(
      shop,
      first.customerId,
      'payments',
      30100,
    ).expect(409);
    expect(tooMuch.body.code).toBe('payment_exceeds_balance');
    await money(shop, first.customerId, 'payments', 30000).expect(200);
    expect(await orderRow(second.id)).toMatchObject({
      paidPaise: 50000,
      paymentStatus: 'PAID',
    });
    const nothing = await money(shop, first.customerId, 'payments', 100).expect(
      409,
    );
    expect(nothing.body.code).toBe('bill_nothing_owed');

    const entries = (await bill(shop, first.customerId)).entries.items;
    expect(entries.map((e) => e.kind)).toEqual([
      'PAYMENT',
      'PAYMENT',
      'CHARGE',
      'CHARGE',
    ]);
  });

  it('paying on the order charges it once, before or after completion', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const ravi = await appCustomer('+919999900011');
    const ready = await order(shop, ravi.id, 2, 'READY_FOR_PICKUP');
    await post(shop, `/orders/${ready.id}/payment`, { method: 'CASH' }).expect(
      200,
    );
    await post(shop, `/orders/${ready.id}/status`, { to: 'COMPLETED' }).expect(
      200,
    );

    const after = await bill(shop, ready.customerId);
    expect(after.balancePaise).toBe(0);
    expect(after.entries.items.map((e) => [e.kind, e.amountPaise])).toEqual([
      ['PAYMENT', -100000],
      ['CHARGE', 100000],
    ]);
    const detail = await request(server())
      .get(`/v1/shops/${shop.shopId}/orders/${ready.id}`)
      .set('Authorization', shop.auth)
      .expect(200);
    expect(detail.body.payment).toMatchObject({
      status: 'PAID',
      method: 'CASH',
      paidPaise: 100000,
    });
  });

  it('a return after payment is owed back: refunded, or used by the next order', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const ravi = await appCustomer('+919999900011');
    const first = await order(shop, ravi.id, 3); // ₹1,500
    await post(shop, `/orders/${first.id}/payment`, { method: 'UPI' }).expect(
      200,
    );
    const item = await testApp.prisma.orderItem.findFirstOrThrow({
      where: { orderId: first.id },
    });
    await post(shop, `/orders/${first.id}/items/${item.id}/return`, {
      quantity: 2,
      reason: 'Unopened tins',
    }).expect(200);

    let now = await bill(shop, first.customerId);
    expect(now.balancePaise).toBe(-100000); // The shop owes ₹1,000.
    expect(now.entries.items[0]).toMatchObject({
      kind: 'ADJUSTMENT',
      amountPaise: -100000,
    });
    expect(await orderRow(first.id)).toMatchObject({
      totalPaise: 50000,
      paidPaise: 50000,
      paymentStatus: 'PAID',
    });

    const tooMuch = await money(
      shop,
      first.customerId,
      'refunds',
      100100,
    ).expect(409);
    expect(tooMuch.body.code).toBe('refund_exceeds_owed');
    await money(shop, first.customerId, 'refunds', 40000).expect(200);

    // The ₹600 still owed covers the next order (₹500) and part of another.
    const next = await order(shop, ravi.id, 1);
    expect(await orderRow(next.id)).toMatchObject({
      paidPaise: 50000,
      paymentStatus: 'PAID',
    });
    const later = await order(shop, ravi.id, 1);
    expect(await orderRow(later.id)).toMatchObject({
      paidPaise: 10000,
      paymentStatus: 'UNPAID',
    });
    now = await bill(shop, first.customerId);
    expect(now.balancePaise).toBe(40000);
  });

  it('a repeated request records one payment', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const ravi = await appCustomer('+919999900011');
    const done = await order(shop, ravi.id, 2);
    const key = randomUUID();
    await Promise.all([
      money(shop, done.customerId, 'payments', 50000, key),
      money(shop, done.customerId, 'payments', 50000, key),
    ]);
    await money(shop, done.customerId, 'payments', 50000, key).expect(200);
    expect((await bill(shop, done.customerId)).balancePaise).toBe(50000);
    expect(
      await testApp.prisma.billEntry.count({ where: { kind: 'PAYMENT' } }),
    ).toBe(1);
  });

  it('shop-recorded orders handed over and paid go on the bill', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const customer = await post(shop, '/customers', {
      name: 'Shibu Thomas',
      phone: '9447021875',
      kind: 'PAINTER',
    }).expect(201);
    const site = await post(shop, `/customers/${customer.body.id}/sites`, {
      name: 'Skyline Flats 4B',
      address: 'Skyline Flats, Kakkanad',
    }).expect(201);
    const record = (paymentMethod?: string) =>
      post(shop, '/orders', {
        customerId: customer.body.id,
        siteId: site.body.id,
        fulfilment: 'PICKUP',
        items: [{ shopProductPackId: shop.pack, quantity: 2 }],
        handedOver: true,
        ...(paymentMethod ? { paymentMethod } : {}),
      }).expect(201);
    await record('CASH');
    await record();

    const now = await bill(shop, customer.body.id);
    expect(now.balancePaise).toBe(100000);
    expect(now.entries.items.map((e) => e.kind).sort()).toEqual([
      'CHARGE',
      'CHARGE',
      'PAYMENT',
    ]);
    expect(now.sites).toEqual([
      { label: 'Skyline Flats 4B', billedPaise: 200000, orderCount: 2 },
    ]);
  });

  it('lists balances, largest owed first, with totals and filters', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const ravi = await appCustomer('+919999900011');
    const meera = await appCustomer('+919999900012');
    const big = await order(shop, ravi.id, 3);
    const small = await order(shop, meera.id, 1);
    await money(shop, small.customerId, 'payments', 50000).expect(200);

    const all = await request(server())
      .get(`/v1/shops/${shop.shopId}/bills`)
      .set('Authorization', shop.auth)
      .expect(200);
    expect(all.body.total).toBe(2);
    expect(all.body.items[0]).toMatchObject({
      customer: { id: big.customerId },
      balancePaise: 150000,
    });
    expect(all.body.totals).toEqual({ owingPaise: 150000, shopOwesPaise: 0 });

    const settled = await request(server())
      .get(`/v1/shops/${shop.shopId}/bills?status=settled`)
      .set('Authorization', shop.auth)
      .expect(200);
    expect(
      settled.body.items.map(
        (i: { customer: { id: string } }) => i.customer.id,
      ),
    ).toEqual([small.customerId]);
  });

  it("keeps each shop's bills to itself", async () => {
    const abc = await liveShop('+919999900001', 'ABC Paints');
    const other = await liveShop('+919999900002', 'Kochi Colours');
    const ravi = await appCustomer('+919999900011');
    const done = await order(abc, ravi.id, 2);

    await request(server())
      .get(`/v1/shops/${other.shopId}/customers/${done.customerId}/bill`)
      .set('Authorization', other.auth)
      .expect(404);
    await money(other, done.customerId, 'payments', 10000).expect(404);
    // Another shop's token on this shop's bill is refused by the shop guard.
    await request(server())
      .get(`/v1/shops/${abc.shopId}/customers/${done.customerId}/bill`)
      .set('Authorization', other.auth)
      .expect((res) => expect([403, 404]).toContain(res.status));
    const list = await request(server())
      .get(`/v1/shops/${other.shopId}/bills`)
      .set('Authorization', other.auth)
      .expect(200);
    expect(list.body.total).toBe(0);
    expect((await bill(abc, done.customerId)).balancePaise).toBe(100000);
  });

  it('bill entries can never be changed or deleted', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const ravi = await appCustomer('+919999900011');
    await order(shop, ravi.id, 1);
    await expect(
      testApp.prisma.billEntry.updateMany({ data: { amountPaise: 1 } }),
    ).rejects.toThrow(/append-only/);
    await expect(testApp.prisma.billEntry.deleteMany()).rejects.toThrow(
      /append-only/,
    );
  });
});
