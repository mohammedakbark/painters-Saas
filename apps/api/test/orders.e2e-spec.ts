import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  OrderPlacementService,
  type PlaceOrderInput,
} from '../src/orders/order-placement.service.js';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

interface OrderItem {
  id: string;
  status: string;
  quantity: number;
  returnedQuantity: number;
  countedPaise: number;
  shopNote: string | null;
  substituteForId: string | null;
  packLabel: string;
  productName: string;
}
interface OrderDetail {
  id: string;
  number: number;
  status: string;
  items: OrderItem[];
  totals: {
    itemsPaise: number;
    deliveryChargePaise: number;
    totalPaise: number;
  };
  payment: { status: string; method: string | null };
  nextSteps: string[];
  canEditItems: boolean;
  canRecordPayment: boolean;
  delivery: { distanceKm: number } | null;
  events: { type: string; actor: string; data: Record<string, unknown> }[];
  customer: { name: string; phone: string; hasApp: boolean };
}

// The shop's map pin (Kochi) and points about 6 km and about 30 km away.
const SHOP_PIN = { latitude: 9.9816, longitude: 76.2756 };
const NEAR = {
  address: 'Green Villa, Edappally, Kochi',
  latitude: 10.0261,
  longitude: 76.3086,
};
const FAR = {
  address: 'Far Away House, Aluva',
  latitude: 10.25,
  longitude: 76.35,
};

describe('Orders (ORD-001, e2e, real Postgres)', () => {
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
    const category = await testApp.prisma.catalogueCategory.create({
      data: { name: 'Primer', nameKey: 'primer' },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  const server = () => testApp.app.getHttpServer();

  /** A Live shop with a map pin, delivery on and two own products. */
  async function liveShop(phone: string, name: string) {
    const auth = `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
    const shopId = (
      (
        await request(server())
          .post('/v1/shops')
          .set('Authorization', auth)
          .send({ shopName: name, ownerName: 'Anil Kumar' })
          .expect(201)
      ).body as { id: string }
    ).id;
    await request(server())
      .put(`/v1/shops/${shopId}/location`)
      .set('Authorization', auth)
      .send({ ...SHOP_PIN, source: 'MAP_PIN' })
      .expect(200);
    await request(server())
      .put(`/v1/shops/${shopId}/settings/delivery`)
      .set('Authorization', auth)
      .send({
        enabled: true,
        chargePaise: 4000,
        freeAbovePaise: 250000,
        radiusKm: 8,
      })
      .expect(200);
    await testApp.prisma.shop.update({
      where: { id: shopId },
      data: { status: 'ACTIVE' },
    });
    const product = async (productName: string, prices: number[]) =>
      (
        (
          await request(server())
            .post(`/v1/shops/${shopId}/catalogue/products`)
            .set('Authorization', auth)
            .send({
              source: 'own',
              name: productName,
              categoryId,
              brandName: 'Local Brand',
              packs: prices.map((pricePaise, index) => ({
                quantity: index + 1,
                unit: 'LITRE',
                pricePaise,
              })),
            })
            .expect(201)
        ).body as { id: string; packs: { id: string }[] }
      ).packs.map((pack) => pack.id);
    const primer = await product('Wall Primer', [50000, 95000]);
    const putty = await product('Wall Putty', [30000]);
    return { auth, shopId, packs: [...primer, ...putty] };
  }
  type Shop = Awaited<ReturnType<typeof liveShop>>;

  async function customer(phone: string, displayName = 'Ravi Painter') {
    return testApp.prisma.user.create({
      data: { authSubject: randomUUID(), phone, displayName },
    });
  }

  const place = (
    shop: Shop,
    userId: string,
    extra: Partial<PlaceOrderInput> = {},
  ) =>
    placement.place({
      shopId: shop.shopId,
      userId,
      fulfilment: 'PICKUP',
      items: [
        { shopProductPackId: shop.packs[0], quantity: 2 },
        { shopProductPackId: shop.packs[2], quantity: 1 },
      ],
      ...extra,
    });

  const call = (
    shop: Shop,
    method: 'get' | 'post',
    path: string,
    body?: object,
    shopId = shop.shopId,
  ) => {
    const req = request(server())
      [method](`/v1/shops/${shopId}/orders${path}`)
      .set('Authorization', shop.auth);
    return body ? req.send(body) : req;
  };
  const detail = async (shop: Shop, orderId: string) =>
    (await call(shop, 'get', `/${orderId}`).expect(200)).body as OrderDetail;

  describe('placing an order', () => {
    it('copies prices, numbers orders per shop and records the shop customer', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await customer('+919000000001');
      const first = await place(shop, ravi.id, { siteLabel: 'Green Villa' });
      const second = await place(shop, ravi.id);
      expect([first.number, second.number]).toEqual([1001, 1002]);

      const order = await detail(shop, first.id);
      expect(order.status).toBe('NEW');
      expect(
        order.items.map((i) => [i.productName, i.packLabel, i.countedPaise]),
      ).toEqual([
        ['Wall Primer', '1 L', 100000],
        ['Wall Putty', '1 L', 30000],
      ]);
      expect(order.totals).toEqual({
        itemsPaise: 130000,
        deliveryChargePaise: 0,
        totalPaise: 130000,
      });
      expect(order.customer).toEqual(
        expect.objectContaining({
          name: 'Ravi Painter',
          phone: '+919000000001',
          hasApp: true,
        }),
      );
      expect(order.nextSteps).toEqual(['PACKING', 'CANCELLED']);
      expect(order.events.map((e) => [e.type, e.actor])).toEqual([
        ['placed', 'CUSTOMER'],
      ]);
      expect(await testApp.prisma.shopCustomer.count()).toBe(1);

      // A price change later does not change the order.
      await testApp.prisma.shopProductPack.update({
        where: { id: shop.packs[0] },
        data: { pricePaise: 99999 },
      });
      expect((await detail(shop, first.id)).totals.itemsPaise).toBe(130000);

      // Another shop starts its own numbers.
      const other = await liveShop('919999900002', 'Other Paints');
      expect((await place(other, ravi.id)).number).toBe(1001);
    });

    it('charges delivery inside the radius, free from the free-delivery amount', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await customer('+919000000001');
      const small = await place(shop, ravi.id, {
        fulfilment: 'DELIVERY',
        delivery: NEAR,
      });
      const order = await detail(shop, small.id);
      expect(order.totals).toEqual({
        itemsPaise: 130000,
        deliveryChargePaise: 4000,
        totalPaise: 134000,
      });
      expect(order.delivery?.distanceKm).toBeGreaterThan(5);
      expect(order.nextSteps).toEqual(['PACKING', 'CANCELLED']);

      const big = await place(shop, ravi.id, {
        fulfilment: 'DELIVERY',
        delivery: NEAR,
        items: [{ shopProductPackId: shop.packs[1], quantity: 3 }],
      });
      expect((await detail(shop, big.id)).totals.deliveryChargePaise).toBe(0);

      await expect(
        place(shop, ravi.id, { fulfilment: 'DELIVERY', delivery: FAR }),
      ).rejects.toMatchObject({ problem: { code: 'delivery_out_of_range' } });
    });

    it('refuses unavailable packs, other shops’ packs and shops that are not Live', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const other = await liveShop('919999900002', 'Other Paints');
      const ravi = await customer('+919000000001');

      await testApp.prisma.shopProductPack.update({
        where: { id: shop.packs[2] },
        data: { available: false },
      });
      await expect(place(shop, ravi.id)).rejects.toMatchObject({
        problem: { code: 'pack_not_available' },
      });
      await expect(
        place(shop, ravi.id, {
          items: [{ shopProductPackId: other.packs[0], quantity: 1 }],
        }),
      ).rejects.toMatchObject({ problem: { code: 'shop_pack_not_found' } });

      await testApp.prisma.shop.update({
        where: { id: other.shopId },
        data: { status: 'DRAFT' },
      });
      await expect(
        place(other, ravi.id, {
          items: [{ shopProductPackId: other.packs[0], quantity: 1 }],
        }),
      ).rejects.toMatchObject({
        problem: { code: 'shop_not_accepting_orders' },
      });
      expect(await testApp.prisma.order.count()).toBe(0);
    });
  });

  describe('order steps', () => {
    it('moves through the steps for pickup and refuses wrong steps', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await customer('+919000000001');
      const { id } = await place(shop, ravi.id);

      const skip = await call(shop, 'post', `/${id}/status`, {
        to: 'COMPLETED',
      }).expect(409);
      expect(skip.body.code).toBe('order_status_invalid');
      await call(shop, 'post', `/${id}/status`, { to: 'PACKING' }).expect(200);
      await call(shop, 'post', `/${id}/status`, {
        to: 'OUT_FOR_DELIVERY',
      }).expect(409);
      const ready = (
        await call(shop, 'post', `/${id}/status`, {
          to: 'READY_FOR_PICKUP',
        }).expect(200)
      ).body as OrderDetail;
      expect(ready.nextSteps).toEqual(['COMPLETED']);
      expect(ready.canEditItems).toBe(false);
      await call(shop, 'post', `/${id}/status`, {
        to: 'CANCELLED',
        reason: 'No',
      }).expect(409);
      const done = (
        await call(shop, 'post', `/${id}/status`, { to: 'COMPLETED' }).expect(
          200,
        )
      ).body as OrderDetail;
      expect(done.status).toBe('COMPLETED');
      expect(done.events.map((e) => e.type)).toEqual([
        'placed',
        'status_changed',
        'status_changed',
        'status_changed',
      ]);
      const audits = await testApp.prisma.auditEvent.count({
        where: { action: 'order.status_changed', shopId: shop.shopId },
      });
      expect(audits).toBe(3);
    });

    it('cancels with a reason (shop) or before it is ready (customer)', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await customer('+919000000001');
      const a = await place(shop, ravi.id);
      const noReason = await call(shop, 'post', `/${a.id}/status`, {
        to: 'CANCELLED',
      }).expect(400);
      expect(noReason.body.errors[0].path).toBe('reason');
      const cancelled = (
        await call(shop, 'post', `/${a.id}/status`, {
          to: 'CANCELLED',
          reason: 'Shop closed today.',
        }).expect(200)
      ).body as OrderDetail & { cancelled: { by: string; reason: string } };
      expect(cancelled.cancelled).toMatchObject({
        by: 'SHOP',
        reason: 'Shop closed today.',
      });
      expect(cancelled.nextSteps).toEqual([]);

      const b = await place(shop, ravi.id, {
        fulfilment: 'DELIVERY',
        delivery: NEAR,
      });
      await call(shop, 'post', `/${b.id}/status`, { to: 'PACKING' }).expect(
        200,
      );
      await call(shop, 'post', `/${b.id}/status`, {
        to: 'OUT_FOR_DELIVERY',
      }).expect(200);
      await expect(
        placement.cancelByCustomer(shop.shopId, ravi.id, b.id),
      ).rejects.toMatchObject({
        problem: { code: 'order_status_invalid' },
      });

      const c = await place(shop, ravi.id);
      const someoneElse = await customer('+919000000002', 'Someone Else');
      await expect(
        placement.cancelByCustomer(shop.shopId, someoneElse.id, c.id),
      ).rejects.toMatchObject({
        problem: { code: 'order_not_found' },
      });
      await placement.cancelByCustomer(
        shop.shopId,
        ravi.id,
        c.id,
        'Changed my mind',
      );
      expect((await detail(shop, c.id)).status).toBe('CANCELLED');
    });

    it('lets only one of two simultaneous step changes win', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await customer('+919000000001');
      const { id } = await place(shop, ravi.id);
      const results = await Promise.all([
        call(shop, 'post', `/${id}/status`, { to: 'PACKING' }),
        call(shop, 'post', `/${id}/status`, { to: 'PACKING' }),
      ]);
      expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        200, 409,
      ]);
      const events = await testApp.prisma.orderEvent.count({
        where: { orderId: id, type: 'status_changed' },
      });
      expect(events).toBe(1);
    });
  });

  describe('items', () => {
    it('marks an item not available and the total drops', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await customer('+919000000001');
      const { id } = await place(shop, ravi.id);
      const putty = (await detail(shop, id)).items[1];
      const short = await call(
        shop,
        'post',
        `/${id}/items/${putty.id}/not-available`,
        { message: 'x' },
      ).expect(400);
      expect(short.body.errors[0].path).toBe('message');
      const order = (
        await call(shop, 'post', `/${id}/items/${putty.id}/not-available`, {
          message: 'Stock not available.',
        }).expect(200)
      ).body as OrderDetail;
      expect(order.items[1]).toMatchObject({
        status: 'NOT_AVAILABLE',
        shopNote: 'Stock not available.',
        countedPaise: 0,
      });
      expect(order.totals.totalPaise).toBe(100000);
      await call(shop, 'post', `/${id}/items/${putty.id}/not-available`, {
        message: 'Again.',
      }).expect(409);
    });

    it('suggests a substitute that counts once the customer accepts', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await customer('+919000000001');
      const { id } = await place(shop, ravi.id);
      const primer = (await detail(shop, id)).items[0];

      const noMessage = await call(
        shop,
        'post',
        `/${id}/items/${primer.id}/substitute`,
        {
          shopProductPackId: shop.packs[1],
          quantity: 1,
        },
      ).expect(400);
      expect(noMessage.body.code).toBe('message_required');

      const offered = (
        await call(shop, 'post', `/${id}/items/${primer.id}/substitute`, {
          shopProductPackId: shop.packs[1],
          quantity: 1,
          message: 'Only the 2 L tin is in stock.',
        }).expect(200)
      ).body as OrderDetail;
      const offer = offered.items[2];
      expect(offer).toMatchObject({
        status: 'SUBSTITUTE_OFFERED',
        substituteForId: primer.id,
        packLabel: '2 L',
        countedPaise: 0,
      });
      expect(offered.items[0].status).toBe('NOT_AVAILABLE');
      expect(offered.totals.itemsPaise).toBe(30000);
      const twice = await call(
        shop,
        'post',
        `/${id}/items/${primer.id}/substitute`,
        {
          shopProductPackId: shop.packs[1],
          quantity: 1,
        },
      ).expect(409);
      expect(twice.body.code).toBe('substitute_already_offered');

      await placement.answerSubstitute(
        shop.shopId,
        ravi.id,
        id,
        offer.id,
        true,
      );
      const accepted = await detail(shop, id);
      expect(accepted.items.map((i) => i.status)).toEqual([
        'SUBSTITUTED',
        'OK',
        'OK',
      ]);
      expect(accepted.totals.itemsPaise).toBe(30000 + 95000);
    });

    it('records payment once ready and returns after completion (owner)', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await customer('+919000000001');
      const { id } = await place(shop, ravi.id);
      const early = await call(shop, 'post', `/${id}/payment`, {
        method: 'UPI',
      }).expect(409);
      expect(early.body.code).toBe('order_payment_not_allowed');
      await call(shop, 'post', `/${id}/status`, { to: 'PACKING' }).expect(200);
      await call(shop, 'post', `/${id}/status`, {
        to: 'READY_FOR_PICKUP',
      }).expect(200);
      await call(shop, 'post', `/${id}/payment`, { method: 'CHEQUE' }).expect(
        400,
      );
      const paid = (
        await call(shop, 'post', `/${id}/payment`, { method: 'UPI' }).expect(
          200,
        )
      ).body as OrderDetail;
      expect(paid.payment).toMatchObject({ status: 'PAID', method: 'UPI' });
      expect(paid.canRecordPayment).toBe(false);
      expect(
        (
          await call(shop, 'post', `/${id}/payment`, { method: 'CASH' }).expect(
            409,
          )
        ).body.code,
      ).toBe('order_already_paid');

      const primer = paid.items[0];
      await call(shop, 'post', `/${id}/items/${primer.id}/return`, {
        quantity: 1,
        reason: 'Damaged tin',
      }).expect(409);
      await call(shop, 'post', `/${id}/status`, { to: 'COMPLETED' }).expect(
        200,
      );
      const tooMany = await call(
        shop,
        'post',
        `/${id}/items/${primer.id}/return`,
        {
          quantity: 3,
          reason: 'Damaged tin',
        },
      ).expect(409);
      expect(tooMany.body.code).toBe('order_return_too_many');
      const returned = (
        await call(shop, 'post', `/${id}/items/${primer.id}/return`, {
          quantity: 1,
          reason: 'Damaged tin',
        }).expect(200)
      ).body as OrderDetail;
      expect(returned.items[0]).toMatchObject({
        returnedQuantity: 1,
        countedPaise: 50000,
      });
      expect(returned.totals.totalPaise).toBe(80000);
      expect(returned.events.at(-1)).toMatchObject({
        type: 'item_returned',
        data: { reason: 'Damaged tin', quantity: 1 },
      });
      const audit = await testApp.prisma.auditEvent.findFirstOrThrow({
        where: { action: 'order.item_returned' },
      });
      expect(JSON.stringify(audit.metadata)).not.toContain('Damaged');
    });
  });

  describe('the list', () => {
    it('filters by tab, search, fulfilment and payment, with counts and pages', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await customer('+919000000001', 'Ravi Painter');
      const meena = await customer('+919000000002', 'Meena Thomas');
      const a = await place(shop, ravi.id);
      await place(shop, meena.id, { fulfilment: 'DELIVERY', delivery: NEAR });
      const c = await place(shop, meena.id);
      await call(shop, 'post', `/${a.id}/status`, { to: 'PACKING' }).expect(
        200,
      );
      await call(shop, 'post', `/${c.id}/status`, {
        to: 'CANCELLED',
        reason: 'Duplicate',
      }).expect(200);

      const all = (await call(shop, 'get', '').expect(200)).body;
      expect(all.total).toBe(3);
      expect(all.items.map((o: { number: number }) => o.number)).toEqual([
        1003, 1002, 1001,
      ]);
      expect(all.counts).toMatchObject({
        all: 3,
        open: 2,
        NEW: 1,
        PACKING: 1,
        CANCELLED: 1,
      });
      expect(all.items[2]).toMatchObject({
        itemCount: 2,
        notAvailableCount: 0,
        totalPaise: 130000,
      });

      expect(all.counts.ready).toBe(0);
      expect(
        (await call(shop, 'get', '?status=ready').expect(200)).body.total,
      ).toBe(0);
      const open = (await call(shop, 'get', '?status=open').expect(200)).body;
      expect(open.total).toBe(2);
      const byName = (await call(shop, 'get', '?q=meena').expect(200)).body;
      expect(byName.total).toBe(2);
      expect(byName.counts.all).toBe(2);
      expect(
        (await call(shop, 'get', '?q=%231001').expect(200)).body.total,
      ).toBe(1);
      expect(
        (await call(shop, 'get', '?q=90000%2000001').expect(200)).body.total,
      ).toBe(1);
      expect(
        (await call(shop, 'get', '?fulfilment=DELIVERY').expect(200)).body
          .total,
      ).toBe(1);
      expect(
        (await call(shop, 'get', '?payment=PAID').expect(200)).body.total,
      ).toBe(0);
      const paged = (await call(shop, 'get', '?pageSize=10&page=2').expect(200))
        .body;
      expect(paged.items).toEqual([]);
      await call(shop, 'get', '?pageSize=7').expect(400);
      await call(shop, 'get', '?status=LOST').expect(400);
    });
  });

  describe('overview summary (ORD-003)', () => {
    it('counts steps, unpaid and today in Indian time, for this shop only', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const other = await liveShop('919999900002', 'Other Paints');
      const ravi = await customer('+919000000001');
      const step = (id: string, to: string, extra: object = {}) =>
        call(shop, 'post', `/${id}/status`, { to, ...extra }).expect(200);

      await place(shop, ravi.id); // stays NEW
      const packing = await place(shop, ravi.id);
      await step(packing.id, 'PACKING');
      const ready = await place(shop, ravi.id); // 130000
      await step(ready.id, 'PACKING');
      await step(ready.id, 'READY_FOR_PICKUP');
      // Completed today with one item not available and one unit returned.
      const done = await place(shop, ravi.id);
      const putty = (await detail(shop, done.id)).items[1];
      await call(shop, 'post', `/${done.id}/items/${putty.id}/not-available`, {
        message: 'Stock not available.',
      }).expect(200);
      await step(done.id, 'PACKING');
      await step(done.id, 'READY_FOR_PICKUP');
      await call(shop, 'post', `/${done.id}/payment`, {
        method: 'CASH',
      }).expect(200);
      await step(done.id, 'COMPLETED');
      const primer = (await detail(shop, done.id)).items[0];
      await call(shop, 'post', `/${done.id}/items/${primer.id}/return`, {
        quantity: 1,
        reason: 'Dented',
      }).expect(200); // 100000 - 50000 = 50000
      // Completed two days ago: not today's sales, still unpaid.
      const old = await place(shop, ravi.id);
      await step(old.id, 'PACKING');
      await step(old.id, 'READY_FOR_PICKUP');
      await step(old.id, 'COMPLETED');
      const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
      await testApp.prisma.order.update({
        where: { id: old.id },
        data: { completedAt: twoDaysAgo, placedAt: twoDaysAgo },
      });
      const cancelled = await place(shop, ravi.id);
      await step(cancelled.id, 'CANCELLED', { reason: 'Duplicate' });
      await place(other, ravi.id);

      const summary = (await call(shop, 'get', '/summary').expect(200)).body;
      expect(summary).toEqual({
        new: 1,
        packing: 1,
        ready: 1,
        unpaid: { count: 2, totalPaise: 130000 + 130000 },
        today: { placed: 5, completed: 1, salesPaise: 50000 },
      });

      const foreign = await call(
        other,
        'get',
        '/summary',
        undefined,
        shop.shopId,
      );
      expect(foreign.status).toBe(404);
      const theirs = (await call(other, 'get', '/summary').expect(200)).body;
      expect(theirs.new).toBe(1);
      expect(theirs.today.salesPaise).toBe(0);
    });
  });

  describe('tenant isolation', () => {
    it('hides one shop’s orders from another shop on every route', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const other = await liveShop('919999900002', 'Other Paints');
      const ravi = await customer('+919000000001');
      const { id } = await place(shop, ravi.id);
      const itemId = (await detail(shop, id)).items[0].id;
      await place(other, ravi.id);

      // The other owner's list holds only their own order.
      const list = (await call(other, 'get', '').expect(200)).body;
      expect(list.total).toBe(1);
      expect(list.items[0].id).not.toBe(id);

      const attempts: [string, string, object?][] = [
        ['get', `/${id}`],
        ['post', `/${id}/status`, { to: 'PACKING' }],
        ['post', `/${id}/items/${itemId}/not-available`, { message: 'Gone.' }],
        [
          'post',
          `/${id}/items/${itemId}/substitute`,
          { shopProductPackId: other.packs[0], quantity: 1, message: 'Try.' },
        ],
        ['post', `/${id}/payment`, { method: 'CASH' }],
        ['post', `/${id}/items/${itemId}/return`, { quantity: 1, reason: 'x' }],
      ];
      for (const [method, path, body] of attempts) {
        // Through the other owner's own shop id: the order is not found.
        const own = await call(other, method as 'get' | 'post', path, body);
        expect(own.status).toBe(404);
        expect(own.body.code).toBe('order_not_found');
        // Through the first shop's id: not a member, the shop is not found.
        const foreign = await call(
          other,
          method as 'get' | 'post',
          path,
          body,
          shop.shopId,
        );
        expect(foreign.status).toBe(404);
        expect(foreign.body.code).toBe('shop_not_found');
      }
      // Nothing changed.
      const order = await detail(shop, id);
      expect(order.status).toBe('NEW');
      expect(order.events).toHaveLength(1);

      // A substitute can't use another shop's pack.
      const sub = await call(
        shop,
        'post',
        `/${id}/items/${itemId}/substitute`,
        {
          shopProductPackId: other.packs[0],
          quantity: 1,
          message: 'Try this.',
        },
      ).expect(404);
      expect(sub.body.code).toBe('shop_pack_not_found');

      // Malformed ids are not found, never a server error.
      await call(shop, 'get', '/not-a-uuid').expect(404);
      await call(shop, 'post', `/${id}/items/not-a-uuid/not-available`, {
        message: 'Gone.',
      }).expect(404);
    });

    it('keeps the order timeline append-only', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await customer('+919000000001');
      const { id } = await place(shop, ravi.id);
      await expect(
        testApp.prisma.orderEvent.deleteMany({ where: { orderId: id } }),
      ).rejects.toThrow();
    });
  });
});
