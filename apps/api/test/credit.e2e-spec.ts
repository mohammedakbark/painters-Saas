import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { OrderPlacementService } from '../src/orders/order-placement.service.js';
import { SHOP_PERMISSIONS } from '../src/shop-access/shop-permissions.js';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

const SHOP_PIN = { latitude: 9.9816, longitude: 76.2756 };

interface Credit {
  status: 'none' | 'active' | 'stopped';
  limitPaise: number | null;
  owedPaise: number;
  leftPaise: number | null;
  idCheck: { type: string; last4: string; checkedBy: string } | null;
  eligible: boolean;
  ineligibleReason: string | null;
  events: {
    items: {
      kind: string;
      limitPaise: number | null;
      previousPaise: number | null;
      owedPaise: number | null;
      reason: string | null;
      order: { id: string } | null;
    }[];
  };
}

describe('Shop credit (CRD-001, e2e, real Postgres)', () => {
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
    testApp.permissions.reset();
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

  const call = (
    shop: Shop,
    method: 'get' | 'post' | 'put',
    path: string,
    body?: object,
  ) => {
    const req = request(server())
      [method](`/v1/shops/${shop.shopId}${path}`)
      .set('Authorization', shop.auth);
    return body ? req.send(body) : req;
  };

  async function appUser(phone: string) {
    return testApp.prisma.user.create({
      data: { authSubject: randomUUID(), phone, displayName: 'Ravi' },
    });
  }

  /** A new app order of [quantity] × ₹500; returns its id and customer. */
  async function place(shop: Shop, userId: string, quantity: number) {
    const placed = await placement.place({
      shopId: shop.shopId,
      userId,
      fulfilment: 'PICKUP',
      items: [{ shopProductPackId: shop.pack, quantity }],
    });
    const row = await testApp.prisma.order.findUniqueOrThrow({
      where: { id: placed.id },
      select: { customerId: true },
    });
    return { id: placed.id, customerId: row.customerId };
  }

  /** Moves an order through every step to completed. */
  async function complete(shop: Shop, orderId: string, accept = false) {
    for (const to of ['PACKING', 'READY_FOR_PICKUP', 'COMPLETED']) {
      await call(shop, 'post', `/orders/${orderId}/status`, {
        to,
        ...(to === 'PACKING' && accept ? { acceptOverLimit: true } : {}),
      }).expect(200);
    }
  }

  const credit = async (shop: Shop, customerId: string) =>
    (await call(shop, 'get', `/customers/${customerId}/credit`).expect(200))
      .body as Credit;

  const checkId = (shop: Shop, customerId: string, extra: object = {}) =>
    call(shop, 'post', `/customers/${customerId}/credit/id-check`, {
      type: 'AADHAAR',
      last4: '1234',
      sawOriginal: true,
      clientRequestId: randomUUID(),
      ...extra,
    });

  const change = (shop: Shop, customerId: string, body: object) =>
    call(shop, 'put', `/customers/${customerId}/credit`, {
      reason: 'Regular painter',
      clientRequestId: randomUUID(),
      ...body,
    });

  /** An app customer of [shop] with credit of [limitPaise]. */
  async function creditCustomer(shop: Shop, limitPaise: number) {
    const user = await appUser('+919876500001');
    const first = await place(shop, user.id, 1);
    await call(shop, 'post', `/orders/${first.id}/status`, {
      to: 'CANCELLED',
      reason: 'Test set-up.',
    }).expect(200);
    await checkId(shop, first.customerId).expect(200);
    await change(shop, first.customerId, {
      action: 'give',
      limitPaise,
    }).expect(200);
    return { user, customerId: first.customerId };
  }

  it('checks the ID (type and last 4 only) and gives credit with a reason', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const user = await appUser('+919876500001');
    const placed = await place(shop, user.id, 1);

    expect(await credit(shop, placed.customerId)).toMatchObject({
      status: 'none',
      limitPaise: null,
      idCheck: null,
      eligible: true,
    });
    await change(shop, placed.customerId, {
      action: 'give',
      limitPaise: 1_000_00,
    })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('credit_needs_id_check'));

    await checkId(shop, placed.customerId, { last4: '123456789012' }).expect(
      400,
    );
    await checkId(shop, placed.customerId, { sawOriginal: false }).expect(400);
    await checkId(shop, placed.customerId, {
      type: 'PAN',
      last4: '234f',
    }).expect(200);
    const given = (
      await change(shop, placed.customerId, {
        action: 'give',
        limitPaise: 5_000_00,
      }).expect(200)
    ).body as Credit;

    expect(given).toMatchObject({
      status: 'active',
      limitPaise: 5_000_00,
      owedPaise: 0,
      leftPaise: 5_000_00,
      idCheck: { type: 'PAN', last4: '234F' },
    });
    expect(given.events.items.map((e) => e.kind)).toEqual([
      'GIVEN',
      'ID_CHECKED',
    ]);
    const audit = await testApp.prisma.auditEvent.findMany({
      where: { action: { startsWith: 'credit.' } },
      orderBy: { occurredAt: 'asc' },
    });
    expect(audit.map((a) => a.action)).toEqual([
      'credit.id_checked',
      'credit.given',
    ]);
    // Never the digits or the reason in the audit trail.
    expect(JSON.stringify(audit)).not.toContain('234F');
    expect(JSON.stringify(audit)).not.toContain('Regular painter');
  });

  it('refuses credit for a customer without an app account', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const recorded = await call(shop, 'post', '/customers', {
      name: 'Shibu Thomas',
      phone: '9447021875',
      kind: 'PAINTER',
    }).expect(201);
    const id = recorded.body.id as string;

    expect(await credit(shop, id)).toMatchObject({
      eligible: false,
      ineligibleReason: 'no_app_account',
    });
    await checkId(shop, id).expect(200);
    await change(shop, id, { action: 'give', limitPaise: 1_000_00 })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('credit_needs_app_account'));
  });

  it('changes and stops credit with the old and new limit recorded', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const { customerId } = await creditCustomer(shop, 2_000_00);

    await change(shop, customerId, { action: 'give', limitPaise: 100 })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('credit_already_active'));
    await change(shop, customerId, {
      action: 'change',
      limitPaise: 150,
    }).expect(400);
    await change(shop, customerId, {
      action: 'change',
      limitPaise: 3_000_00,
    }).expect(200);
    const stopped = (
      await change(shop, customerId, {
        action: 'stop',
        reason: 'Late payments',
      }).expect(200)
    ).body as Credit;

    expect(stopped).toMatchObject({
      status: 'stopped',
      limitPaise: null,
      leftPaise: null,
    });
    expect(stopped.events.items.slice(0, 2)).toMatchObject([
      { kind: 'STOPPED', previousPaise: 3_000_00, reason: 'Late payments' },
      { kind: 'LIMIT_CHANGED', limitPaise: 3_000_00, previousPaise: 2_000_00 },
    ]);
    await change(shop, customerId, { action: 'change', limitPaise: 100_00 })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('credit_not_active'));
    // Events are append-only.
    await expect(
      testApp.prisma.creditEvent.deleteMany({ where: { customerId } }),
    ).rejects.toThrow(/append-only/);
  });

  it('warns on accepting an order over the limit and records the override', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const { user, customerId } = await creditCustomer(shop, 1_200_00);

    // ₹1,000 owed on the bill.
    const first = await place(shop, user.id, 2);
    await complete(shop, first.id);
    expect(await credit(shop, customerId)).toMatchObject({
      owedPaise: 1_000_00,
      leftPaise: 200_00,
    });

    // ₹500 more would be ₹1,500 over a ₹1,200 limit.
    const second = await place(shop, user.id, 1);
    const detail = await call(shop, 'get', `/orders/${second.id}`).expect(200);
    expect(detail.body.creditWarning).toEqual({
      kind: 'over_limit',
      owedPaise: 1_500_00,
      limitPaise: 1_200_00,
    });
    await call(shop, 'post', `/orders/${second.id}/status`, { to: 'PACKING' })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('credit_over_limit'));
    expect(
      (
        await testApp.prisma.order.findUniqueOrThrow({
          where: { id: second.id },
        })
      ).status,
    ).toBe('NEW');

    await call(shop, 'post', `/orders/${second.id}/status`, {
      to: 'PACKING',
      acceptOverLimit: true,
    }).expect(200);
    const after = await credit(shop, customerId);
    expect(after.owedPaise).toBe(1_500_00);
    expect(after.leftPaise).toBe(-300_00);
    expect(after.events.items[0]).toMatchObject({
      kind: 'OVERRIDE',
      owedPaise: 1_500_00,
      limitPaise: 1_200_00,
      order: { id: second.id },
    });

    // Accepted packing orders count: the next order is over too.
    const third = await place(shop, user.id, 1);
    expect(
      (await call(shop, 'get', `/orders/${third.id}`).expect(200)).body
        .creditWarning,
    ).toMatchObject({ kind: 'over_limit', owedPaise: 2_000_00 });

    // Bills list: credit column and the Over limit filter.
    const over = await call(shop, 'get', '/bills?status=over_limit').expect(
      200,
    );
    expect(over.body.items).toHaveLength(0);
    await complete(shop, third.id, true);
    await call(shop, 'post', `/orders/${second.id}/status`, {
      to: 'READY_FOR_PICKUP',
    }).expect(200);
    await call(shop, 'post', `/orders/${second.id}/status`, {
      to: 'COMPLETED',
    }).expect(200);
    const list = await call(shop, 'get', '/bills?status=over_limit').expect(
      200,
    );
    expect(list.body.items).toMatchObject([
      {
        balancePaise: 2_000_00,
        credit: { status: 'active', limitPaise: 1_200_00 },
      },
    ]);
  });

  it('only warns for a customer without credit who owes', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const user = await appUser('+919876500001');
    const first = await place(shop, user.id, 1);
    expect(
      (await call(shop, 'get', `/orders/${first.id}`).expect(200)).body
        .creditWarning,
    ).toBeNull();
    await complete(shop, first.id);

    const second = await place(shop, user.id, 1);
    expect(
      (await call(shop, 'get', `/orders/${second.id}`).expect(200)).body
        .creditWarning,
    ).toEqual({ kind: 'no_credit', owedPaise: 1_000_00, limitPaise: null });
    // Not blocked, nothing recorded.
    await call(shop, 'post', `/orders/${second.id}/status`, {
      to: 'PACKING',
    }).expect(200);
    expect(await testApp.prisma.creditEvent.count()).toBe(0);
  });

  it('checks shop-recorded orders when they are saved, unless paid on the spot', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const { customerId } = await creditCustomer(shop, 600_00);
    const record = (body: object) =>
      call(shop, 'post', '/orders', {
        customerId,
        fulfilment: 'PICKUP',
        items: [{ shopProductPackId: shop.pack, quantity: 2 }],
        ...body,
      });

    await record({ handedOver: true })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('credit_over_limit'));
    expect(
      await testApp.prisma.order.count({ where: { source: 'SHOP' } }),
    ).toBe(0);
    await record({ handedOver: true, paymentMethod: 'CASH' }).expect(201);

    // Saved over the limit as New: accepting it later doesn't ask again.
    const saved = await record({ acceptOverLimit: true }).expect(201);
    await call(shop, 'post', `/orders/${saved.body.id}/status`, {
      to: 'PACKING',
    }).expect(200);
    expect(
      await testApp.prisma.creditEvent.count({ where: { kind: 'OVERRIDE' } }),
    ).toBe(1);
  });

  it('needs credit.manage to change credit, and figures need permission', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const { user, customerId } = await creditCustomer(shop, 100_00);
    const placed = await place(shop, user.id, 1);

    testApp.permissions.restrict(
      shop.shopId,
      SHOP_PERMISSIONS.filter((key) => key !== 'credit.manage'),
    );
    await checkId(shop, customerId).expect(403);
    await change(shop, customerId, { action: 'stop' }).expect(403);
    await credit(shop, customerId); // reports.view may read

    testApp.permissions.restrict(shop.shopId, ['orders.handle']);
    await call(shop, 'get', `/customers/${customerId}/credit`).expect(403);
    const detail = await call(shop, 'get', `/orders/${placed.id}`).expect(200);
    expect(detail.body.creditWarning).toEqual({
      kind: 'over_limit',
      owedPaise: null,
      limitPaise: null,
    });
    const refused = await call(shop, 'post', `/orders/${placed.id}/status`, {
      to: 'PACKING',
    }).expect(409);
    expect(refused.body.detail).not.toContain('₹');
  });

  it("never reads or changes another shop's credit", async () => {
    const abc = await liveShop('+919999900001', 'ABC Paints');
    const xyz = await liveShop('+919999900002', 'XYZ Paints');
    const { customerId } = await creditCustomer(abc, 1_000_00);

    await call(xyz, 'get', `/customers/${customerId}/credit`).expect(404);
    await checkId(xyz, customerId).expect(404);
    await change(xyz, customerId, { action: 'stop' }).expect(404);
    await call(xyz, 'get', '/customers/not-a-uuid/credit').expect(404);
    expect((await credit(abc, customerId)).status).toBe('active');
  });

  it('records a repeated request once, also when sent twice at once', async () => {
    const shop = await liveShop('+919999900001', 'ABC Paints');
    const { customerId } = await creditCustomer(shop, 1_000_00);
    const body = {
      action: 'change',
      limitPaise: 2_000_00,
      clientRequestId: randomUUID(),
    };

    const results = await Promise.all([
      change(shop, customerId, body),
      change(shop, customerId, body),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    await change(shop, customerId, body).expect(200);
    expect(
      await testApp.prisma.creditEvent.count({
        where: { kind: 'LIMIT_CHANGED' },
      }),
    ).toBe(1);
  });
});
