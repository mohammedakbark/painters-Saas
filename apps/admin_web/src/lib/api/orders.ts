import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';

// Mirrors OrderListPage and OrderDetail in packages/api_contracts/openapi.json (ORD-001).

export const ORDER_STATUSES = [
  'NEW',
  'PACKING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Fulfilment = 'PICKUP' | 'DELIVERY';
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER';

const status = z.enum(ORDER_STATUSES);
const fulfilment = z.enum(['PICKUP', 'DELIVERY']);
const paymentStatus = z.enum(['UNPAID', 'PAID']);

const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  hasApp: z.boolean(),
});

const listPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      number: z.number().int(),
      placedAt: z.string(),
      status,
      fulfilment,
      customer: customerSchema,
      siteLabel: z.string().nullable(),
      itemCount: z.number().int(),
      notAvailableCount: z.number().int(),
      totalPaise: z.number().int(),
      paymentStatus,
    }),
  ),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  counts: z.object({
    all: z.number().int(),
    open: z.number().int(),
    ready: z.number().int(),
    NEW: z.number().int(),
    PACKING: z.number().int(),
    READY_FOR_PICKUP: z.number().int(),
    OUT_FOR_DELIVERY: z.number().int(),
    COMPLETED: z.number().int(),
    CANCELLED: z.number().int(),
  }),
});

const itemSchema = z.object({
  id: z.string(),
  position: z.number().int(),
  shopProductPackId: z.string().nullable(),
  productName: z.string(),
  brandName: z.string().nullable(),
  packLabel: z.string(),
  shadeCode: z.string().nullable(),
  shadeName: z.string().nullable(),
  unitPricePaise: z.number().int(),
  quantity: z.number().int(),
  returnedQuantity: z.number().int(),
  countedPaise: z.number().int(),
  status: z.enum([
    'OK',
    'NOT_AVAILABLE',
    'SUBSTITUTED',
    'SUBSTITUTE_OFFERED',
    'SUBSTITUTE_DECLINED',
  ]),
  shopNote: z.string().nullable(),
  substituteForId: z.string().nullable(),
});

const detailSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  status,
  fulfilment,
  customer: customerSchema,
  siteLabel: z.string().nullable(),
  delivery: z
    .object({
      address: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      distanceKm: z.number(),
    })
    .nullable(),
  items: z.array(itemSchema),
  totals: z.object({
    itemsPaise: z.number().int(),
    deliveryChargePaise: z.number().int(),
    totalPaise: z.number().int(),
  }),
  payment: z.object({
    status: paymentStatus,
    method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']).nullable(),
    paidAt: z.string().nullable(),
  }),
  cancelled: z
    .object({
      by: z.enum(['CUSTOMER', 'SHOP']),
      reason: z.string().nullable(),
      at: z.string(),
    })
    .nullable(),
  placedAt: z.string(),
  readyAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  nextSteps: z.array(status),
  canEditItems: z.boolean(),
  canRecordPayment: z.boolean(),
  canReturnItems: z.boolean(),
  events: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      actor: z.enum(['CUSTOMER', 'SHOP', 'SYSTEM']),
      data: z.record(z.string(), z.unknown()),
      createdAt: z.string(),
    }),
  ),
});

const summarySchema = z.object({
  new: z.number().int(),
  packing: z.number().int(),
  ready: z.number().int(),
  unpaid: z.object({ count: z.number().int(), totalPaise: z.number().int() }),
  today: z.object({
    placed: z.number().int(),
    completed: z.number().int(),
    salesPaise: z.number().int(),
  }),
});

export type OrderSummary = z.infer<typeof summarySchema>;
export type OrderListPage = z.infer<typeof listPageSchema>;
export type OrderRow = OrderListPage['items'][number];
export type OrderDetail = z.infer<typeof detailSchema>;
export type OrderItem = OrderDetail['items'][number];
export type OrderEvent = OrderDetail['events'][number];

export const ORDER_TABS = [
  'open',
  'NEW',
  'PACKING',
  'ready',
  'COMPLETED',
  'CANCELLED',
  'all',
] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

export interface OrderListParams {
  status: OrderTab;
  q?: string;
  fulfilment?: Fulfilment;
  payment?: 'UNPAID' | 'PAID';
  page: number;
  pageSize: number;
}

const base = (shopId: string) =>
  `/v1/shops/${encodeURIComponent(shopId)}/orders`;
const orderPath = (shopId: string, orderId: string, rest = '') =>
  `${base(shopId)}/${encodeURIComponent(orderId)}${rest}`;
const itemPath = (
  shopId: string,
  orderId: string,
  itemId: string,
  rest: string,
) => orderPath(shopId, orderId, `/items/${encodeURIComponent(itemId)}${rest}`);

export function listOrders(
  token: string,
  shopId: string,
  params: OrderListParams,
): Promise<OrderListPage> {
  const search = new URLSearchParams({
    status: params.status,
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  if (params.fulfilment) search.set('fulfilment', params.fulfilment);
  if (params.payment) search.set('payment', params.payment);
  return apiRequest(`${base(shopId)}?${search.toString()}`, {
    token,
    schema: listPageSchema,
  });
}

/** Order figures for the Overview (ORD-003). */
export function getOrderSummary(
  token: string,
  shopId: string,
): Promise<OrderSummary> {
  return apiRequest(`${base(shopId)}/summary`, {
    token,
    schema: summarySchema,
  });
}

export function getOrder(
  token: string,
  shopId: string,
  orderId: string,
): Promise<OrderDetail> {
  return apiRequest(orderPath(shopId, orderId), {
    token,
    schema: detailSchema,
  });
}

const post = (token: string, path: string, body: object) =>
  apiRequest(path, { token, schema: detailSchema, method: 'POST', body });

export function changeOrderStatus(
  token: string,
  shopId: string,
  orderId: string,
  body: { to: OrderStatus; reason?: string },
): Promise<OrderDetail> {
  return post(token, orderPath(shopId, orderId, '/status'), body);
}

export function markItemNotAvailable(
  token: string,
  shopId: string,
  orderId: string,
  itemId: string,
  message: string,
): Promise<OrderDetail> {
  return post(token, itemPath(shopId, orderId, itemId, '/not-available'), {
    message,
  });
}

export function offerSubstitute(
  token: string,
  shopId: string,
  orderId: string,
  itemId: string,
  body: {
    shopProductPackId: string;
    quantity: number;
    shadeCode?: string;
    message?: string;
  },
): Promise<OrderDetail> {
  return post(token, itemPath(shopId, orderId, itemId, '/substitute'), body);
}

export function recordPayment(
  token: string,
  shopId: string,
  orderId: string,
  method: PaymentMethod,
): Promise<OrderDetail> {
  return post(token, orderPath(shopId, orderId, '/payment'), { method });
}

export function returnItem(
  token: string,
  shopId: string,
  orderId: string,
  itemId: string,
  body: { quantity: number; reason: string },
): Promise<OrderDetail> {
  return post(token, itemPath(shopId, orderId, itemId, '/return'), body);
}
