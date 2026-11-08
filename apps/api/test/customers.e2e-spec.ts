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
const SITE = {
  name: 'Green Villa',
  ownerName: 'Thomas Mathew',
  address: 'Green Villa, near St. Mary’s Church, Edappally, Kochi',
  pin: { latitude: 10.0261, longitude: 76.3086 },
};

describe('Customers, sites and orders recorded by the shop (ORD-004, e2e, real Postgres)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;
  let categoryId: string;

  beforeAll(async () => {
    issuer = await createTestTokenIssuer();
    testApp = await createTestApp({ keys: issuer.keys });
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

  async function liveShop(phone: string, name: string, live = true) {
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
    if (live) {
      await testApp.prisma.shop.update({
        where: { id: shopId },
        data: { status: 'ACTIVE' },
      });
    }
    const packs = (
      (
        await request(server())
          .post(`/v1/shops/${shopId}/catalogue/products`)
          .set('Authorization', auth)
          .send({
            source: 'own',
            name: 'Wall Primer',
            categoryId,
            brandName: 'Local Brand',
            packs: [
              { quantity: 1, unit: 'LITRE', pricePaise: 50000 },
              { quantity: 4, unit: 'LITRE', pricePaise: 180000 },
            ],
          })
          .expect(201)
      ).body as { packs: { id: string }[] }
    ).packs.map((pack) => pack.id);
    return { auth, shopId, packs };
  }
  type Shop = Awaited<ReturnType<typeof liveShop>>;

  const api = (
    shop: Shop,
    method: 'get' | 'post' | 'patch',
    path: string,
    body?: object,
    shopId = shop.shopId,
  ) => {
    const req = request(server())
      [method](`/v1/shops/${shopId}${path}`)
      .set('Authorization', shop.auth);
    return body ? req.send(body) : req;
  };

  const addPainter = async (
    shop: Shop,
    phone = '98765 43210',
    name = 'Ravi Painter',
  ) =>
    (
      await api(shop, 'post', '/customers', {
        name,
        phone,
        kind: 'PAINTER',
      }).expect(201)
    ).body as {
      id: string;
      phone: string;
    };

  describe('customers', () => {
    it('records a customer by mobile, private to the shop, and audits without personal values', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await addPainter(shop, '+91 98765-43210');
      expect(ravi).toMatchObject({
        name: 'Ravi Painter',
        phone: '+919876543210',
        kind: 'PAINTER',
        hasApp: false,
        sites: [],
        orderCount: 0,
      });
      const again = await api(shop, 'post', '/customers', {
        name: 'Ravi again',
        phone: '09876543210',
        kind: 'CUSTOMER',
      }).expect(409);
      expect(again.body.code).toBe('customer_phone_taken');
      const bad = await api(shop, 'post', '/customers', {
        name: 'X',
        phone: '12345',
        kind: 'CUSTOMER',
      }).expect(400);
      expect(bad.body.code).toBe('phone_invalid');

      const edited = (
        await api(shop, 'patch', `/customers/${ravi.id}`, {
          name: 'Ravi Kumar',
          kind: 'CUSTOMER',
          phone: '9876500000',
        }).expect(200)
      ).body;
      expect(edited).toMatchObject({
        name: 'Ravi Kumar',
        kind: 'CUSTOMER',
        phone: '+919876500000',
      });

      const audits = await testApp.prisma.auditEvent.findMany({
        where: { shopId: shop.shopId, entityType: 'shop_customer' },
      });
      expect(audits.map((a) => a.action).sort()).toEqual([
        'shop_customer.created',
        'shop_customer.updated',
      ]);
      expect(JSON.stringify(audits)).not.toContain('Ravi');
      expect(JSON.stringify(audits)).not.toContain('98765');

      // Another shop can record the same mobile; neither sees the other's.
      const other = await liveShop('919999900002', 'Other Paints');
      await addPainter(other, '9876500000', 'Ravi at Other');
      const list = (await api(shop, 'get', '/customers').expect(200)).body;
      expect(list.total).toBe(1);
      expect(list.items[0].name).toBe('Ravi Kumar');
    });

    it('keeps an app user’s account and the shop’s record separate (D-055)', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      await addPainter(shop, '9000000001', 'Ravi (shop record)');
      const appUser = await testApp.prisma.user.create({
        data: {
          authSubject: randomUUID(),
          phone: '+919000000001',
          displayName: 'Ravi App',
        },
      });
      // The app order still works and gets its own linked record.
      await testApp.app.get(OrderPlacementService).place({
        shopId: shop.shopId,
        userId: appUser.id,
        fulfilment: 'PICKUP',
        items: [{ shopProductPackId: shop.packs[0], quantity: 1 }],
      });
      const list = (await api(shop, 'get', '/customers?q=90000').expect(200))
        .body;
      expect(
        list.items.map(
          (c: { name: string; hasApp: boolean; orderCount: number }) => [
            c.name,
            c.hasApp,
            c.orderCount,
          ],
        ),
      ).toEqual([
        ['Ravi (shop record)', false, 0],
        ['Ravi App', true, 1],
      ]);
      // The app user's mobile can't be changed by the shop.
      const appRecord = list.items.find((c: { hasApp: boolean }) => c.hasApp);
      const blocked = await api(shop, 'patch', `/customers/${appRecord.id}`, {
        phone: '9000000009',
      }).expect(409);
      expect(blocked.body.code).toBe('customer_phone_from_app');
      // Sites are only for painters the shop recorded.
      const noSites = await api(
        shop,
        'post',
        `/customers/${appRecord.id}/sites`,
        SITE,
      ).expect(409);
      expect(noSites.body.code).toBe('sites_for_painters_only');
    });

    it('searches by name or mobile and filters by type, with pages', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      await addPainter(shop, '9000000001', 'Ravi Painter');
      await api(shop, 'post', '/customers', {
        name: 'Meena Thomas',
        phone: '9000000002',
        kind: 'CUSTOMER',
      }).expect(201);
      expect(
        (await api(shop, 'get', '/customers?q=meena').expect(200)).body.total,
      ).toBe(1);
      expect(
        (await api(shop, 'get', '/customers?q=90000%2000001').expect(200)).body
          .total,
      ).toBe(1);
      expect(
        (await api(shop, 'get', '/customers?kind=PAINTER').expect(200)).body
          .items[0].name,
      ).toBe('Ravi Painter');
      await api(shop, 'get', '/customers?pageSize=7').expect(400);
    });
  });

  describe('sites', () => {
    it('adds, edits, archives and restores painters’ sites', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await addPainter(shop);
      const site = (
        await api(shop, 'post', `/customers/${ravi.id}/sites`, SITE).expect(201)
      ).body;
      expect(site).toMatchObject({
        name: 'Green Villa',
        ownerName: 'Thomas Mathew',
        pin: SITE.pin,
        archived: false,
      });
      const dup = await api(shop, 'post', `/customers/${ravi.id}/sites`, {
        ...SITE,
        name: 'green villa',
      }).expect(409);
      expect(dup.body.code).toBe('site_name_taken');
      const noPin = (
        await api(shop, 'post', `/customers/${ravi.id}/sites`, {
          name: 'Rose Cottage',
          address: 'Rose Cottage, Kakkanad',
        }).expect(201)
      ).body;
      expect(noPin.pin).toBeNull();
      await api(shop, 'post', `/customers/${ravi.id}/sites`, {
        name: 'X',
        address: 'Kochi',
      }).expect(400);

      const archived = (
        await api(shop, 'patch', `/customers/${ravi.id}/sites/${site.id}`, {
          archived: true,
        }).expect(200)
      ).body;
      expect(archived.archived).toBe(true);
      const restored = (
        await api(shop, 'patch', `/customers/${ravi.id}/sites/${site.id}`, {
          archived: false,
          pin: null,
        }).expect(200)
      ).body;
      expect(restored).toMatchObject({ archived: false, pin: null });

      const detail = (
        await api(shop, 'get', `/customers/${ravi.id}`).expect(200)
      ).body;
      expect(detail.sites.map((s: { name: string }) => s.name)).toEqual([
        'Green Villa',
        'Rose Cottage',
      ]);
      const audit = await testApp.prisma.auditEvent.findMany({
        where: { entityType: 'shop_site' },
      });
      expect(JSON.stringify(audit)).not.toContain('Villa');
    });

    it('allows at most 50 active sites', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await addPainter(shop);
      await testApp.prisma.shopSite.createMany({
        data: Array.from({ length: 50 }, (_, i) => ({
          shopId: shop.shopId,
          customerId: ravi.id,
          name: `Site ${i + 1}`,
          address: 'Somewhere, Kochi',
        })),
      });
      const full = await api(
        shop,
        'post',
        `/customers/${ravi.id}/sites`,
        SITE,
      ).expect(409);
      expect(full.body.code).toBe('site_limit');
    });
  });

  describe('orders recorded by the shop', () => {
    it('records a phone order as new, with site and delivery charge', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const ravi = await addPainter(shop);
      const site = (
        await api(shop, 'post', `/customers/${ravi.id}/sites`, SITE).expect(201)
      ).body;
      const order = (
        await api(shop, 'post', '/orders', {
          customerId: ravi.id,
          siteId: site.id,
          fulfilment: 'DELIVERY',
          items: [
            {
              shopProductPackId: shop.packs[0],
              quantity: 2,
              shadeCode: 'L123',
            },
          ],
        }).expect(201)
      ).body;
      expect(order).toMatchObject({
        number: 1001,
        status: 'NEW',
        source: 'SHOP',
        siteLabel: 'Green Villa',
        customer: { name: 'Ravi Painter', hasApp: false },
        totals: {
          itemsPaise: 100000,
          deliveryChargePaise: 4000,
          totalPaise: 104000,
        },
        payment: { status: 'UNPAID' },
      });
      expect(order.delivery.address).toBe(SITE.address);
      expect(order.delivery.distanceKm).toBeGreaterThan(5);
      expect(
        order.events.map((e: { type: string; actor: string }) => [
          e.type,
          e.actor,
        ]),
      ).toEqual([['recorded', 'SHOP']]);
      const listed = (
        await api(shop, 'get', `/orders?customerId=${ravi.id}`).expect(200)
      ).body;
      expect(listed.items[0]).toMatchObject({
        source: 'SHOP',
        siteLabel: 'Green Villa',
      });
    });

    it('records a counter sale as handed over and paid, with a typed address and no pin', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const meena = (
        await api(shop, 'post', '/customers', {
          name: 'Meena',
          phone: '9000000002',
          kind: 'CUSTOMER',
        }).expect(201)
      ).body;
      const counter = (
        await api(shop, 'post', '/orders', {
          customerId: meena.id,
          fulfilment: 'PICKUP',
          items: [{ shopProductPackId: shop.packs[1], quantity: 1 }],
          handedOver: true,
          paymentMethod: 'UPI',
        }).expect(201)
      ).body;
      expect(counter).toMatchObject({
        status: 'COMPLETED',
        payment: { status: 'PAID', method: 'UPI' },
        nextSteps: [],
        canReturnItems: true,
      });
      expect(counter.events.map((e: { type: string }) => e.type)).toEqual([
        'recorded',
        'paid',
      ]);

      const typed = (
        await api(shop, 'post', '/orders', {
          customerId: meena.id,
          fulfilment: 'DELIVERY',
          deliveryAddress: 'Flat 4B, Marine Drive, Kochi',
          items: [{ shopProductPackId: shop.packs[1], quantity: 2 }],
        }).expect(201)
      ).body;
      expect(typed.delivery).toEqual({
        address: 'Flat 4B, Marine Drive, Kochi',
        latitude: null,
        longitude: null,
        distanceKm: null,
      });
      expect(typed.totals.deliveryChargePaise).toBe(0); // free from ₹2,500

      // The summary counts both; the paid counter sale is today's sales.
      const summary = (await api(shop, 'get', '/orders/summary').expect(200))
        .body;
      expect(summary.today).toMatchObject({ completed: 1, salesPaise: 180000 });

      const noAddress = await api(shop, 'post', '/orders', {
        customerId: meena.id,
        fulfilment: 'DELIVERY',
        items: [{ shopProductPackId: shop.packs[0], quantity: 1 }],
      }).expect(400);
      expect(noAddress.body.code).toBe('delivery_address_required');
      const paidNotHanded = await api(shop, 'post', '/orders', {
        customerId: meena.id,
        fulfilment: 'PICKUP',
        items: [{ shopProductPackId: shop.packs[0], quantity: 1 }],
        paymentMethod: 'CASH',
      }).expect(400);
      expect(paidNotHanded.body.errors[0].path).toBe('paymentMethod');
    });

    it('refuses unavailable packs, other shops’ records and shops that are not Live', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const other = await liveShop('919999900002', 'Other Paints');
      const ravi = await addPainter(shop);
      const site = (
        await api(shop, 'post', `/customers/${ravi.id}/sites`, SITE).expect(201)
      ).body;
      const theirs = await addPainter(other, '9000000005', 'Their painter');
      const theirSite = (
        await api(other, 'post', `/customers/${theirs.id}/sites`, SITE).expect(
          201,
        )
      ).body;
      const base = {
        fulfilment: 'PICKUP',
        items: [{ shopProductPackId: shop.packs[0], quantity: 1 }],
      };

      await testApp.prisma.shopProductPack.update({
        where: { id: shop.packs[1] },
        data: { available: false },
      });
      const unavailable = await api(shop, 'post', '/orders', {
        ...base,
        customerId: ravi.id,
        items: [{ shopProductPackId: shop.packs[1], quantity: 1 }],
      }).expect(409);
      expect(unavailable.body.code).toBe('pack_not_available');
      expect(
        (
          await api(shop, 'post', '/orders', {
            ...base,
            customerId: theirs.id,
          }).expect(404)
        ).body.code,
      ).toBe('customer_not_found');
      expect(
        (
          await api(shop, 'post', '/orders', {
            ...base,
            customerId: ravi.id,
            siteId: theirSite.id,
          }).expect(404)
        ).body.code,
      ).toBe('site_not_found');
      expect(
        (
          await api(shop, 'post', '/orders', {
            ...base,
            customerId: ravi.id,
            items: [{ shopProductPackId: other.packs[0], quantity: 1 }],
          }).expect(404)
        ).body.code,
      ).toBe('shop_pack_not_found');

      // Through another shop's id: not a member.
      expect(
        (
          await api(
            other,
            'post',
            '/orders',
            { ...base, customerId: ravi.id },
            shop.shopId,
          ).expect(404)
        ).body.code,
      ).toBe('shop_not_found');
      // An archived site can't be used.
      await api(shop, 'patch', `/customers/${ravi.id}/sites/${site.id}`, {
        archived: true,
      }).expect(200);
      await api(shop, 'post', '/orders', {
        ...base,
        customerId: ravi.id,
        siteId: site.id,
      }).expect(404);

      const draft = await liveShop('919999900003', 'Draft Paints', false);
      const someone = await addPainter(draft, '9000000006');
      const notLive = await api(draft, 'post', '/orders', {
        fulfilment: 'PICKUP',
        customerId: someone.id,
        items: [{ shopProductPackId: draft.packs[0], quantity: 1 }],
      }).expect(409);
      expect(notLive.body.code).toBe('shop_not_accepting_orders');
      expect(
        await testApp.prisma.order.count({ where: { shopId: shop.shopId } }),
      ).toBe(0);
    });
  });

  describe('tenant isolation', () => {
    it('hides one shop’s customers and sites from another on every route', async () => {
      const shop = await liveShop('919999900001', 'Lakshmi Paints');
      const other = await liveShop('919999900002', 'Other Paints');
      const ravi = await addPainter(shop);
      const site = (
        await api(shop, 'post', `/customers/${ravi.id}/sites`, SITE).expect(201)
      ).body;
      const attempts: ['get' | 'post' | 'patch', string, object?][] = [
        ['get', `/customers/${ravi.id}`],
        ['patch', `/customers/${ravi.id}`, { name: 'Taken' }],
        ['post', `/customers/${ravi.id}/sites`, SITE],
        ['patch', `/customers/${ravi.id}/sites/${site.id}`, { archived: true }],
      ];
      for (const [method, path, body] of attempts) {
        const own = await api(other, method, path, body);
        expect(own.status).toBe(404);
        expect(own.body.code).toBe('customer_not_found');
        const foreign = await api(other, method, path, body, shop.shopId);
        expect(foreign.status).toBe(404);
        expect(foreign.body.code).toBe('shop_not_found');
      }
      expect(
        (await api(other, 'get', '/customers').expect(200)).body.total,
      ).toBe(0);
      const unchanged = (
        await api(shop, 'get', `/customers/${ravi.id}`).expect(200)
      ).body;
      expect(unchanged).toMatchObject({
        name: 'Ravi Painter',
        sites: [{ archived: false }],
      });
      await api(shop, 'get', '/customers/not-a-uuid').expect(404);
      await api(shop, 'patch', `/customers/${ravi.id}/sites/not-a-uuid`, {
        archived: true,
      }).expect(404);
    });
  });
});
