import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  SHOP_PERMISSIONS,
  type ShopPermission,
} from '../src/shop-access/shop-permissions.js';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

/**
 * Shop permissions (SHP-010, D-056). Employees don't exist yet, so a test
 * resolver gives the owner fewer permissions; every protected route must then
 * answer 403 without changing anything, and tenant isolation stays as before.
 */
describe('Shop permissions (SHP-010, e2e, real Postgres)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;
  let categoryId: string;

  beforeAll(async () => {
    issuer = await createTestTokenIssuer();
    testApp = await createTestApp({ keys: issuer.keys });
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

  /** A Live shop with one product, one customer and one ready order. */
  async function liveShop(phone: string) {
    const auth = `Bearer ${await issuer.sign({ sub: randomUUID(), phone })}`;
    const shopId = (
      (
        await request(server())
          .post('/v1/shops')
          .set('Authorization', auth)
          .send({ shopName: 'Lakshmi Paints', ownerName: 'Anil Kumar' })
          .expect(201)
      ).body as { id: string }
    ).id;
    const call = (method: 'get' | 'post' | 'put' | 'patch', path: string) =>
      request(server())
        [method](`/v1/shops/${shopId}${path}`)
        .set('Authorization', auth);
    await testApp.prisma.shop.update({
      where: { id: shopId },
      data: { status: 'ACTIVE' },
    });
    const product = (
      await call('post', '/catalogue/products')
        .send({
          source: 'own',
          name: 'Wall Primer',
          categoryId,
          brandName: 'Local Brand',
          packs: [{ quantity: 1, unit: 'LITRE', pricePaise: 50000 }],
        })
        .expect(201)
    ).body as { id: string; packs: { id: string }[] };
    const customer = (
      await call('post', '/customers')
        .send({ name: 'Ravi', phone: '98765 43210', kind: 'CUSTOMER' })
        .expect(201)
    ).body as { id: string };
    const order = (
      await call('post', '/orders')
        .send({
          customerId: customer.id,
          fulfilment: 'PICKUP',
          items: [{ shopProductPackId: product.packs[0]!.id, quantity: 1 }],
          handedOver: false,
        })
        .expect(201)
    ).body as { id: string };
    for (const to of ['PACKING', 'READY_FOR_PICKUP']) {
      const response = await call('post', `/orders/${order.id}/status`).send({
        to,
      });
      expect(response.status).toBeLessThan(300);
    }
    return { shopId, auth, call, product, customer, order };
  }
  type Shop = Awaited<ReturnType<typeof liveShop>>;

  /** One request per protected job, and the permission it needs. */
  const ROUTES: {
    permission: ShopPermission;
    name: string;
    send: (shop: Shop) => request.Test;
  }[] = [
    {
      permission: 'orders.handle',
      name: 'list orders',
      send: (s) => s.call('get', '/orders'),
    },
    {
      permission: 'orders.handle',
      name: 'move an order',
      send: (s) =>
        s
          .call('post', `/orders/${s.order.id}/status`)
          .send({ to: 'COMPLETED' }),
    },
    {
      permission: 'orders.payments',
      name: 'record a payment',
      send: (s) =>
        s
          .call('post', `/orders/${s.order.id}/payment`)
          .send({ method: 'CASH' }),
    },
    {
      permission: 'orders.record',
      name: 'record an order',
      send: (s) =>
        s.call('post', '/orders').send({
          customerId: s.customer.id,
          fulfilment: 'PICKUP',
          items: [{ shopProductPackId: s.product.packs[0]!.id, quantity: 1 }],
          handedOver: false,
        }),
    },
    {
      permission: 'customers.manage',
      name: 'edit a customer',
      send: (s) =>
        s.call('patch', `/customers/${s.customer.id}`).send({ name: 'Ravi K' }),
    },
    {
      permission: 'catalogue.view',
      name: 'list products',
      send: (s) => s.call('get', '/catalogue/products'),
    },
    {
      permission: 'catalogue.manage',
      name: 'change a product',
      send: (s) =>
        s
          .call('patch', `/catalogue/products/${s.product.id}`)
          .send({ status: 'ARCHIVED' }),
    },
    {
      permission: 'shop.profile',
      name: 'change the location',
      send: (s) =>
        s
          .call('put', '/location')
          .send({ latitude: 9.98, longitude: 76.27, source: 'MAP_PIN' }),
    },
    {
      permission: 'shop.settings',
      name: 'change delivery',
      send: (s) =>
        s.call('put', '/settings/delivery').send({
          enabled: false,
          chargePaise: null,
          freeAbovePaise: null,
          radiusKm: null,
        }),
    },
  ];

  it.each(ROUTES)(
    'refuses "$name" without $permission and changes nothing',
    async ({ permission, send }) => {
      const shop = await liveShop('919999900001');
      const orders = () =>
        testApp.prisma.order.findMany({ orderBy: { id: 'asc' } });
      const before = await orders();
      testApp.permissions.restrict(
        shop.shopId,
        SHOP_PERMISSIONS.filter((key) => key !== permission),
      );

      const response = await send(shop).expect(403);

      expect(response.body).toMatchObject({ code: 'shop_permission_denied' });
      expect(await orders()).toEqual(before);
      const product = await testApp.prisma.shopProduct.findUniqueOrThrow({
        where: { id: shop.product.id },
      });
      expect(product.status).toBe('ACTIVE');

      testApp.permissions.restrict(shop.shopId, [permission]);
      expect((await send(shop)).status).not.toBe(403);
    },
  );

  it('lets any order permission read an order, and nothing else', async () => {
    const shop = await liveShop('919999900001');
    const read = () => shop.call('get', `/orders/${shop.order.id}`);

    for (const permission of [
      'orders.handle',
      'orders.payments',
      'orders.record',
    ] as const) {
      testApp.permissions.restrict(shop.shopId, [permission]);
      await read().expect(200);
    }
    testApp.permissions.restrict(
      shop.shopId,
      SHOP_PERMISSIONS.filter((key) => !key.startsWith('orders.')),
    );
    await read().expect(403);
  });

  it('tells the member what they may do', async () => {
    const shop = await liveShop('919999900001');
    const permissions = async () =>
      (
        (await shop.call('get', '').expect(200)).body as {
          permissions: string[];
        }
      ).permissions;

    expect(await permissions()).toEqual([...SHOP_PERMISSIONS]);
    testApp.permissions.restrict(shop.shopId, ['orders.handle']);
    expect(await permissions()).toEqual(['orders.handle']);
  });

  it('lets order work read the packs, messages and customers it needs', async () => {
    const shop = await liveShop('919999900001');

    testApp.permissions.restrict(shop.shopId, ['orders.handle']);
    await shop.call('get', '/catalogue/product-rows').expect(200);
    await shop.call('get', '/settings').expect(200);
    await shop.call('get', '/customers').expect(403);

    testApp.permissions.restrict(shop.shopId, ['orders.record']);
    await shop.call('get', '/catalogue/product-rows').expect(200);
    await shop.call('get', '/settings').expect(200);
    await shop.call('get', '/customers').expect(200);
    await shop.call('get', `/customers/${shop.customer.id}`).expect(200);
    await shop.call('get', '/orders').expect(403);
  });

  it('hides money figures without reports.view', async () => {
    const shop = await liveShop('919999900001');
    type Summary = {
      ready: number;
      unpaid: { count: number; totalPaise: number | null };
      today: { salesPaise: number | null };
    };
    const summary = async () =>
      (await shop.call('get', '/orders/summary').expect(200)).body as Summary;

    const full = await summary();
    expect(full.unpaid).toEqual({ count: 1, totalPaise: 50000 });
    expect(full.today.salesPaise).toBe(0);

    testApp.permissions.restrict(shop.shopId, ['orders.handle']);
    const counts = await summary();
    expect(counts.unpaid).toEqual({ count: 1, totalPaise: null });
    expect(counts.today.salesPaise).toBeNull();
    expect(counts.ready).toBe(1);
  });

  it("never opens another shop's data, whatever the permissions", async () => {
    const mine = await liveShop('919999900001');
    const theirs = await liveShop('919999900002');

    testApp.permissions.restrict(mine.shopId, [...SHOP_PERMISSIONS]);
    await request(server())
      .get(`/v1/shops/${theirs.shopId}/orders/${theirs.order.id}`)
      .set('Authorization', mine.auth)
      .expect(404);
    await request(server())
      .get(`/v1/shops/${mine.shopId}/orders/${theirs.order.id}`)
      .set('Authorization', mine.auth)
      .expect(404);
  });
});
