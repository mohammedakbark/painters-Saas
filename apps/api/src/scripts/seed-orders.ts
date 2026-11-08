import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import type { CurrentUserContext } from '../auth/current-user.js';
import type { OrderStatus } from '../generated/prisma/enums.js';
import { OrderPlacementService } from '../orders/order-placement.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShopContext } from '../shop-access/shop-access.guard.js';

/**
 * Local development only: about 25 test orders for one Live shop, in every
 * step, so the Orders page and dashboard can be tried (ORD-001).
 *
 *   pnpm --filter api orders:seed-test [shopId]
 *
 * Without a shop id it uses the first Live shop with available pack sizes.
 * Test customers have mobiles +91 90000 000xx and cannot sign in. Orders go
 * through the same services as real ones. Runs once per shop: if the shop
 * already has orders from test customers it stops. Refuses to run when
 * NODE_ENV=production.
 */

const CUSTOMERS = [
  'Ravi Kumar',
  'Meena Thomas',
  'Suresh Painter',
  'Anitha George',
  'Joseph Contractor',
  'Fathima Rahman',
  'Vinod Nair',
  'Lakshmi Menon',
];
const TEST_PHONE_PREFIX = '+9190000000';
const SITES = ['Green Villa', 'Sea View Apartments', 'Rose Cottage'];

type Plan = {
  to: OrderStatus;
  delivery?: boolean;
  paid?: boolean;
  notAvailable?: boolean;
  substitute?: boolean;
  returned?: boolean;
};

const PLANS: Plan[] = [
  { to: 'NEW' },
  { to: 'NEW', delivery: true },
  { to: 'NEW', notAvailable: true },
  { to: 'NEW' },
  { to: 'NEW', delivery: true },
  { to: 'NEW' },
  { to: 'PACKING' },
  { to: 'PACKING', substitute: true },
  { to: 'PACKING', delivery: true },
  { to: 'PACKING' },
  { to: 'READY_FOR_PICKUP' },
  { to: 'READY_FOR_PICKUP', paid: true },
  { to: 'READY_FOR_PICKUP' },
  { to: 'OUT_FOR_DELIVERY', delivery: true },
  { to: 'OUT_FOR_DELIVERY', delivery: true, paid: true },
  { to: 'COMPLETED', paid: true },
  { to: 'COMPLETED', paid: true, delivery: true },
  { to: 'COMPLETED', paid: true, returned: true },
  { to: 'COMPLETED' },
  { to: 'COMPLETED', paid: true },
  { to: 'COMPLETED', paid: true },
  { to: 'COMPLETED', paid: true, delivery: true },
  { to: 'CANCELLED' },
  { to: 'CANCELLED', delivery: true },
  { to: 'CANCELLED' },
];

const PATHS: Record<OrderStatus, OrderStatus[]> = {
  NEW: [],
  PACKING: ['PACKING'],
  READY_FOR_PICKUP: ['PACKING', 'READY_FOR_PICKUP'],
  OUT_FOR_DELIVERY: ['PACKING', 'OUT_FOR_DELIVERY'],
  COMPLETED: ['PACKING', 'READY_FOR_PICKUP', 'COMPLETED'],
  CANCELLED: ['CANCELLED'],
};

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to create test orders in production.');
    process.exitCode = 1;
    return;
  }
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const prisma = app.get(PrismaService);
    const placement = app.get(OrderPlacementService);
    const orders = app.get(OrdersService);

    const shop = await prisma.shop.findFirst({
      where: {
        status: 'ACTIVE',
        ...(process.argv[2] ? { id: process.argv[2] } : {}),
        products: {
          some: { status: 'ACTIVE', packs: { some: { available: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        deliveryEnabled: true,
        memberships: { where: { role: 'MASTER' }, select: { userId: true } },
      },
    });
    const ownerId = shop?.memberships[0]?.userId;
    if (!shop || !ownerId) {
      console.error('No Live shop with available pack sizes was found.');
      process.exitCode = 1;
      return;
    }
    const existing = await prisma.order.count({
      where: {
        shopId: shop.id,
        customer: { phone: { startsWith: TEST_PHONE_PREFIX } },
      },
    });
    if (existing > 0) {
      console.log(`${shop.name} already has ${existing} test orders.`);
      return;
    }

    const packs = await prisma.shopProductPack.findMany({
      where: {
        shopId: shop.id,
        available: true,
        product: { status: 'ACTIVE' },
        OR: [
          { product: { catalogueProductId: null } },
          { product: { catalogueProduct: { active: true } } },
        ],
      },
      orderBy: { pricePaise: 'asc' },
      take: 8,
      select: { id: true },
    });
    if (packs.length < 2) {
      console.error(`${shop.name} needs at least 2 available pack sizes.`);
      process.exitCode = 1;
      return;
    }

    const customerIds: string[] = [];
    for (const [index, name] of CUSTOMERS.entries()) {
      const phone = `${TEST_PHONE_PREFIX}${String(index + 1).padStart(2, '0')}`;
      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: { authSubject: randomUUID(), phone, displayName: name },
        select: { id: true },
      });
      customerIds.push(user.id);
    }

    const owner: CurrentUserContext = {
      id: ownerId,
      authSubject: '',
      email: null,
      phone: null,
      displayName: null,
      platformRole: null,
    };
    const shopContext: ShopContext = { shopId: shop.id, role: 'MASTER' };
    const canDeliver =
      shop.deliveryEnabled && shop.latitude !== null && shop.longitude !== null;
    // About 2 km north-east of the shop's pin.
    const near =
      shop.latitude !== null && shop.longitude !== null
        ? {
            address: 'Test delivery address, near the shop',
            latitude: Number(shop.latitude) + 0.012,
            longitude: Number(shop.longitude) + 0.012,
          }
        : undefined;

    let created = 0;
    for (const [index, plan] of PLANS.entries()) {
      const userId = customerIds[index % customerIds.length];
      const delivery = Boolean(plan.delivery && canDeliver && near);
      const pick = (offset: number) =>
        packs[(index + offset) % packs.length].id;
      const { id } = await placement.place({
        shopId: shop.id,
        userId,
        fulfilment: delivery ? 'DELIVERY' : 'PICKUP',
        siteLabel: index % 3 === 0 ? SITES[index % SITES.length] : undefined,
        items: [
          { shopProductPackId: pick(0), quantity: 1 + (index % 3) },
          { shopProductPackId: pick(1), quantity: 1 },
        ],
        delivery: delivery ? near : undefined,
      });
      const detail = await orders.detail(shopContext, id);
      const [first, second] = detail.items;

      if (plan.notAvailable && second) {
        await orders.markNotAvailable(owner, shopContext, id, second.id, {
          message: 'Stock not available.',
        });
      }
      if (plan.substitute && first) {
        const after = await orders.offerSubstitute(
          owner,
          shopContext,
          id,
          first.id,
          {
            shopProductPackId: pick(2),
            quantity: 1,
            message: 'This size is out of stock. We can give this instead.',
          },
        );
        const offer = after.items.find(
          (item) => item.status === 'SUBSTITUTE_OFFERED',
        );
        if (offer) {
          await placement.answerSubstitute(shop.id, userId, id, offer.id, true);
        }
      }

      const path = PATHS[plan.to].map((step) =>
        delivery && step === 'READY_FOR_PICKUP' ? 'OUT_FOR_DELIVERY' : step,
      );
      for (const to of path) {
        if (plan.paid && to === 'COMPLETED') {
          await orders.recordPayment(owner, shopContext, id, {
            method: index % 2 === 0 ? 'CASH' : 'UPI',
          });
        }
        await orders.changeStatus(owner, shopContext, id, {
          to,
          ...(to === 'CANCELLED'
            ? { reason: 'Customer asked to cancel.' }
            : {}),
        });
      }
      if (plan.paid && plan.to !== 'COMPLETED') {
        await orders.recordPayment(owner, shopContext, id, { method: 'UPI' });
      }
      if (plan.returned && first) {
        await orders.returnItem(owner, shopContext, id, first.id, {
          quantity: 1,
          reason: 'Tin was damaged.',
        });
      }

      // Spread the orders over the last two weeks, newest open orders first.
      const hoursAgo = (index + 1) * 13;
      await prisma.order.update({
        where: { id },
        data: { placedAt: new Date(Date.now() - hoursAgo * 3_600_000) },
      });
      created += 1;
    }
    console.log(`Created ${created} test orders for ${shop.name}.`);
  } finally {
    await app.close();
  }
}

void main();
