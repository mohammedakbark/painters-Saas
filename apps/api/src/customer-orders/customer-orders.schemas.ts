import { z } from 'zod';

const ORDER_STATUS = [
  'NEW',
  'PACKING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
] as const;

const line = z.object({
  shopProductPackId: z.uuid({ error: 'Choose a pack size.' }),
  quantity: z
    .number({ error: 'Enter a quantity.' })
    .int({ error: 'Enter a whole number.' })
    .min(1, { error: 'The quantity must be at least 1.' })
    .max(999, { error: 'The quantity can be at most 999.' }),
  shadeCode: z.string().trim().min(1).max(40).optional(),
  shadeName: z.string().trim().min(1).max(80).optional(),
});

/**
 * Place an order from the cart (CUS-006). A painter orders for one of their
 * sites (D-049): `siteId` is required and, for delivery, the site is the
 * address. A normal customer delivers to one of their saved places
 * (`deliveryLocationId`, D-061). `expectedTotalPaise` is the total shown at
 * checkout; `clientRequestId` makes a repeated request safe.
 */
export const PlaceOrderRequestSchema = z
  .object({
    shopId: z.uuid({ error: 'Choose a shop.' }),
    fulfilment: z.enum(['PICKUP', 'DELIVERY'], {
      error: 'Choose pickup or delivery.',
    }),
    siteId: z.uuid({ error: 'Choose a site.' }).optional(),
    deliveryLocationId: z
      .uuid({ error: 'Choose a delivery place.' })
      .optional(),
    items: z
      .array(line, { error: 'Add something to the cart.' })
      .min(1, { error: 'Add something to the cart.' })
      .max(50, { error: 'An order can have at most 50 lines.' }),
    expectedTotalPaise: z.number().int().min(0),
    clientRequestId: z.uuid(),
  })
  .meta({ id: 'PlaceOrderRequest' });

export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequestSchema>;

export const PlacedOrderSchema = z
  .object({ id: z.uuid(), number: z.number().int() })
  .meta({ id: 'PlacedOrder' });

export type PlacedOrder = z.infer<typeof PlacedOrderSchema>;

export const MyOrderListQuerySchema = z
  .object({
    page: z.coerce
      .number({ error: 'page must be a number.' })
      .int()
      .min(1)
      .max(1000)
      .default(1),
  })
  .meta({ id: 'MyOrderListQuery' });

export type MyOrderListQuery = z.infer<typeof MyOrderListQuerySchema>;

const shop = z.object({ id: z.uuid(), name: z.string() });

export const MyOrderSummarySchema = z
  .object({
    id: z.uuid(),
    number: z.number().int(),
    shop,
    placedAt: z.iso.datetime(),
    status: z.enum(ORDER_STATUS),
    fulfilment: z.enum(['PICKUP', 'DELIVERY']),
    siteLabel: z.string().nullable(),
    itemCount: z.number().int(),
    totalPaise: z.number().int(),
    /** A substitute waits for the customer's answer. */
    needsAnswer: z.boolean(),
  })
  .meta({ id: 'MyOrderSummary' });

export type MyOrderSummary = z.infer<typeof MyOrderSummarySchema>;

export const MyOrderListSchema = z
  .object({
    items: z.array(MyOrderSummarySchema),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .meta({ id: 'MyOrderList' });

export type MyOrderList = z.infer<typeof MyOrderListSchema>;

export const MyOrderSchema = z
  .object({
    id: z.uuid(),
    number: z.number().int(),
    shop,
    status: z.enum(ORDER_STATUS),
    fulfilment: z.enum(['PICKUP', 'DELIVERY']),
    siteLabel: z.string().nullable(),
    deliveryAddress: z.string().nullable(),
    items: z.array(
      z.object({
        id: z.uuid(),
        productName: z.string(),
        brandName: z.string().nullable(),
        packLabel: z.string(),
        shadeCode: z.string().nullable(),
        shadeName: z.string().nullable(),
        unitPricePaise: z.number().int(),
        quantity: z.number().int(),
        returnedQuantity: z.number().int(),
        status: z.enum([
          'OK',
          'NOT_AVAILABLE',
          'SUBSTITUTED',
          'SUBSTITUTE_OFFERED',
          'SUBSTITUTE_DECLINED',
        ]),
        /** The shop's message for a not-available item. */
        shopNote: z.string().nullable(),
        substituteForId: z.uuid().nullable(),
      }),
    ),
    totals: z.object({
      itemsPaise: z.number().int(),
      deliveryPaise: z.number().int(),
      totalPaise: z.number().int(),
    }),
    payment: z.object({
      status: z.enum(['UNPAID', 'PAID']),
      method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']).nullable(),
      /** Paid so far from the running bill (BIL-001); below the total is part paid. */
      paidPaise: z.number().int(),
    }),
    cancelled: z
      .object({
        by: z.enum(['CUSTOMER', 'SHOP']),
        reason: z.string().nullable(),
        at: z.iso.datetime(),
      })
      .nullable(),
    placedAt: z.iso.datetime(),
    readyAt: z.iso.datetime().nullable(),
    completedAt: z.iso.datetime().nullable(),
    canCancel: z.boolean(),
  })
  .meta({ id: 'MyOrder' });

export type MyOrder = z.infer<typeof MyOrderSchema>;

export const CancelMyOrderRequestSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(200, { error: 'The reason can be at most 200 characters.' })
      .optional(),
  })
  .meta({ id: 'CancelMyOrderRequest' });

export type CancelMyOrderRequest = z.infer<typeof CancelMyOrderRequestSchema>;

export const AnswerSubstituteRequestSchema = z
  .object({ accept: z.boolean({ error: 'Accept or decline.' }) })
  .meta({ id: 'AnswerSubstituteRequest' });

export type AnswerSubstituteRequest = z.infer<
  typeof AnswerSubstituteRequestSchema
>;
