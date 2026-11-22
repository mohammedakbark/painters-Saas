import { HttpStatus, Injectable } from '@nestjs/common';
import type { CurrentUserContext } from '../auth/current-user.js';
import { ProblemException } from '../common/http/problem-details.js';
import type { Prisma } from '../generated/prisma/client.js';
import { DeliveryLocationsService } from '../delivery-locations/delivery-locations.service.js';
import { OrderPlacementService } from '../orders/order-placement.service.js';
import { customerCanCancel } from '../orders/order-rules.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AnswerSubstituteRequest,
  CancelMyOrderRequest,
  MyOrder,
  MyOrderList,
  MyOrderListQuery,
  PlacedOrder,
  PlaceOrderRequest,
} from './customer-orders.schemas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 20;

const orderNotFound = () =>
  new ProblemException(HttpStatus.NOT_FOUND, {
    detail: 'This order was not found.',
    code: 'order_not_found',
  });

const fieldProblem = (code: string, path: string, message: string) =>
  new ProblemException(HttpStatus.BAD_REQUEST, {
    detail: message,
    code,
    errors: [{ path, message }],
  });

const DETAIL_SELECT = {
  id: true,
  number: true,
  status: true,
  fulfilment: true,
  siteLabel: true,
  deliveryAddress: true,
  itemsTotalPaise: true,
  deliveryChargePaise: true,
  totalPaise: true,
  paymentStatus: true,
  paymentMethod: true,
  paidPaise: true,
  cancelledBy: true,
  cancelReason: true,
  cancelledAt: true,
  placedAt: true,
  readyAt: true,
  completedAt: true,
  shop: { select: { id: true, name: true } },
  items: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      productName: true,
      brandName: true,
      packLabel: true,
      shadeCode: true,
      shadeName: true,
      unitPricePaise: true,
      quantity: true,
      returnedQuantity: true,
      status: true,
      shopNote: true,
      substituteForId: true,
    },
  },
} as const satisfies Prisma.OrderSelect;

/**
 * A customer's own orders in the Customer App (CUS-006, D-045, D-047,
 * D-049, D-053). Every query is keyed by the verified caller through the
 * shop's record of them (`shop_customers.user_id`), so nobody sees another
 * person's orders. Placing, cancelling and answering substitutes reuse
 * OrderPlacementService, which re-checks shop, packs, prices and delivery
 * area on the server. Shop-internal fields (staff, phone, events) are never
 * returned.
 */
@Injectable()
export class CustomerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly placement: OrderPlacementService,
    private readonly locations: DeliveryLocationsService,
  ) {}

  async place(
    user: CurrentUserContext,
    input: PlaceOrderRequest,
  ): Promise<PlacedOrder> {
    const person = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { customerType: true },
    });
    const painter = person?.customerType === 'PAINTER';

    let siteLabel: string | undefined;
    let customerSiteId: string | undefined;
    let delivery: PlaceOrderInputDelivery | undefined;

    if (painter) {
      // A painter orders only for a site (D-049).
      if (!input.siteId) {
        throw fieldProblem('site_required', 'siteId', 'Choose a site.');
      }
      const site = await this.prisma.customerSite.findFirst({
        where: { id: input.siteId, userId: user.id, archivedAt: null },
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      });
      if (!site) {
        throw fieldProblem('site_not_found', 'siteId', 'Choose a site.');
      }
      siteLabel = site.name;
      customerSiteId = site.id;
      if (input.fulfilment === 'DELIVERY') {
        delivery = {
          address: `${site.name}, ${site.address}`.slice(0, 300),
          latitude: site.latitude.toNumber(),
          longitude: site.longitude.toNumber(),
        };
      }
    } else {
      if (input.siteId) {
        throw fieldProblem(
          'site_not_allowed',
          'siteId',
          'Sites are for painters.',
        );
      }
      if (input.fulfilment === 'DELIVERY') {
        if (!input.deliveryLocationId) {
          throw fieldProblem(
            'delivery_location_required',
            'deliveryLocationId',
            'Choose where to deliver.',
          );
        }
        const place = await this.locations.activeOwn(
          this.prisma,
          user,
          input.deliveryLocationId,
        );
        delivery = {
          address: place.address,
          latitude: place.latitude.toNumber(),
          longitude: place.longitude.toNumber(),
        };
      }
    }

    return this.placement.place({
      shopId: input.shopId,
      userId: user.id,
      fulfilment: input.fulfilment,
      items: input.items,
      siteLabel,
      customerSiteId,
      delivery,
      clientRequestId: input.clientRequestId,
      expectedTotalPaise: input.expectedTotalPaise,
    });
  }

  async list(
    user: CurrentUserContext,
    query: MyOrderListQuery,
  ): Promise<MyOrderList> {
    const rows = await this.prisma.order.findMany({
      where: { customer: { userId: user.id } },
      orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        number: true,
        placedAt: true,
        status: true,
        fulfilment: true,
        siteLabel: true,
        totalPaise: true,
        shop: { select: { id: true, name: true } },
        items: { select: { quantity: true, status: true } },
      },
    });
    const page = rows.slice(0, PAGE_SIZE);
    return {
      page: query.page,
      hasMore: rows.length > PAGE_SIZE,
      items: page.map((row) => ({
        id: row.id,
        number: row.number,
        shop: row.shop,
        placedAt: row.placedAt.toISOString(),
        status: row.status,
        fulfilment: row.fulfilment,
        siteLabel: row.siteLabel,
        itemCount: row.items
          .filter((item) => item.status === 'OK')
          .reduce((sum, item) => sum + item.quantity, 0),
        totalPaise: row.totalPaise,
        needsAnswer:
          row.status !== 'CANCELLED' &&
          row.items.some((item) => item.status === 'SUBSTITUTE_OFFERED'),
      })),
    };
  }

  async get(user: CurrentUserContext, orderId: string): Promise<MyOrder> {
    const row = UUID.test(orderId)
      ? await this.prisma.order.findFirst({
          where: { id: orderId, customer: { userId: user.id } },
          select: DETAIL_SELECT,
        })
      : null;
    if (!row) throw orderNotFound();
    return {
      id: row.id,
      number: row.number,
      shop: row.shop,
      status: row.status,
      fulfilment: row.fulfilment,
      siteLabel: row.siteLabel,
      deliveryAddress: row.deliveryAddress,
      items: row.items,
      totals: {
        itemsPaise: row.itemsTotalPaise,
        deliveryPaise: row.deliveryChargePaise,
        totalPaise: row.totalPaise,
      },
      payment: {
        status: row.paymentStatus,
        method: row.paymentMethod,
        paidPaise: row.paidPaise,
      },
      cancelled:
        row.cancelledBy && row.cancelledAt
          ? {
              by: row.cancelledBy,
              reason: row.cancelReason,
              at: row.cancelledAt.toISOString(),
            }
          : null,
      placedAt: row.placedAt.toISOString(),
      readyAt: row.readyAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      canCancel: customerCanCancel(row.status),
    };
  }

  async cancel(
    user: CurrentUserContext,
    orderId: string,
    input: CancelMyOrderRequest,
  ): Promise<MyOrder> {
    const shopId = await this.shopOf(user, orderId);
    await this.placement.cancelByCustomer(
      shopId,
      user.id,
      orderId,
      input.reason,
    );
    return this.get(user, orderId);
  }

  async answerSubstitute(
    user: CurrentUserContext,
    orderId: string,
    itemId: string,
    input: AnswerSubstituteRequest,
  ): Promise<MyOrder> {
    const shopId = await this.shopOf(user, orderId);
    if (!UUID.test(itemId)) throw orderNotFound();
    await this.placement.answerSubstitute(
      shopId,
      user.id,
      orderId,
      itemId,
      input.accept,
    );
    return this.get(user, orderId);
  }

  /** The shop of the caller's own order; 404 for anyone else's. */
  private async shopOf(
    user: CurrentUserContext,
    orderId: string,
  ): Promise<string> {
    const row = UUID.test(orderId)
      ? await this.prisma.order.findFirst({
          where: { id: orderId, customer: { userId: user.id } },
          select: { shopId: true },
        })
      : null;
    if (!row) throw orderNotFound();
    return row.shopId;
  }
}

type PlaceOrderInputDelivery = {
  address: string;
  latitude: number;
  longitude: number;
};
