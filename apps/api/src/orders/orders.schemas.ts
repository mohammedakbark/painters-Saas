import { z } from 'zod';
import {
  OrderFulfilment,
  OrderItemStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethod,
} from '../generated/prisma/enums.js';

// Limits match the CHECK constraints in the ORD-001 migration.

export const ORDER_LIMITS = {
  maxItems: 50,
  maxQuantity: 999,
  noteMin: 2,
  noteMax: 200,
  reasonMax: 200,
} as const;

export const ORDER_PAGE_SIZES = [10, 25, 50] as const;

const statusValues = Object.values(OrderStatus) as [
  OrderStatus,
  ...OrderStatus[],
];

export const OrderListQuerySchema = z
  .object({
    status: z
      .enum(['all', 'open', 'ready', ...statusValues], {
        error: 'status must be all, open, ready or an order status.',
      })
      .default('all')
      .meta({
        description:
          'open: new, packing, ready for pickup and out for delivery. ready: ready for pickup and out for delivery.',
      }),
    q: z
      .string()
      .trim()
      .max(60, { error: 'Search can be at most 60 characters.' })
      .optional()
      .meta({ description: 'Order number, customer name or mobile number.' }),
    fulfilment: z
      .enum(OrderFulfilment, {
        error: 'fulfilment must be PICKUP or DELIVERY.',
      })
      .optional(),
    payment: z
      .enum(OrderPaymentStatus, { error: 'payment must be UNPAID or PAID.' })
      .optional(),
    page: z.coerce
      .number({ error: 'page must be a number.' })
      .int({ error: 'page must be a whole number.' })
      .min(1, { error: 'page must be at least 1.' })
      .default(1),
    pageSize: z.coerce
      .number({ error: 'pageSize must be a number.' })
      .refine(
        (value) => (ORDER_PAGE_SIZES as readonly number[]).includes(value),
        { error: 'pageSize must be 10, 25 or 50.' },
      )
      .default(25),
  })
  .meta({ id: 'OrderListQuery' });

const customerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  /** E.164. Shown only to the shop the order belongs to. */
  phone: z.string(),
  /** Whether the customer orders through the app (D-054). */
  hasApp: z.boolean(),
});

export const OrderListPageSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.uuid(),
        number: z.int(),
        placedAt: z.iso.datetime(),
        status: z.enum(OrderStatus),
        fulfilment: z.enum(OrderFulfilment),
        customer: customerSchema,
        siteLabel: z.string().nullable(),
        itemCount: z.int(),
        notAvailableCount: z.int(),
        totalPaise: z.int(),
        paymentStatus: z.enum(OrderPaymentStatus),
      }),
    ),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
    /** Orders per status tab, with the search and other filters applied. */
    counts: z.object({
      all: z.int(),
      open: z.int(),
      ready: z.int(),
      NEW: z.int(),
      PACKING: z.int(),
      READY_FOR_PICKUP: z.int(),
      OUT_FOR_DELIVERY: z.int(),
      COMPLETED: z.int(),
      CANCELLED: z.int(),
    }),
  })
  .meta({ id: 'OrderListPage' });

export const OrderItemSchema = z
  .object({
    id: z.uuid(),
    position: z.int(),
    shopProductPackId: z.uuid().nullable(),
    productName: z.string(),
    brandName: z.string().nullable(),
    packLabel: z.string(),
    shadeCode: z.string().nullable(),
    shadeName: z.string().nullable(),
    unitPricePaise: z.int(),
    quantity: z.int(),
    returnedQuantity: z.int(),
    /** What this line adds to the total (0 unless the status is OK). */
    countedPaise: z.int(),
    status: z.enum(OrderItemStatus),
    shopNote: z.string().nullable(),
    substituteForId: z.uuid().nullable(),
  })
  .meta({ id: 'OrderItem' });

export const OrderDetailSchema = z
  .object({
    id: z.uuid(),
    number: z.int(),
    status: z.enum(OrderStatus),
    fulfilment: z.enum(OrderFulfilment),
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
    items: z.array(OrderItemSchema),
    totals: z.object({
      itemsPaise: z.int(),
      deliveryChargePaise: z.int(),
      totalPaise: z.int(),
    }),
    payment: z.object({
      status: z.enum(OrderPaymentStatus),
      method: z.enum(PaymentMethod).nullable(),
      paidAt: z.iso.datetime().nullable(),
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
    /** Steps the shop can take now. */
    nextSteps: z.array(z.enum(OrderStatus)),
    canEditItems: z.boolean(),
    canRecordPayment: z.boolean(),
    canReturnItems: z.boolean(),
    events: z.array(
      z.object({
        id: z.uuid(),
        type: z.string(),
        actor: z.enum(['CUSTOMER', 'SHOP', 'SYSTEM']),
        data: z.record(z.string(), z.unknown()),
        createdAt: z.iso.datetime(),
      }),
    ),
  })
  .meta({ id: 'OrderDetail' });

const reason = z
  .string({ error: 'Enter a reason.' })
  .trim()
  .min(1, { error: 'Enter a reason.' })
  .max(ORDER_LIMITS.reasonMax, {
    error: 'The reason can be at most 200 characters.',
  });

export const UpdateOrderStatusRequestSchema = z
  .object({
    to: z.enum(OrderStatus, { error: 'Choose the next step.' }),
    reason: reason.optional(),
  })
  .superRefine((value, context) => {
    if (value.to === 'CANCELLED' && !value.reason) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Tell the customer why the order is cancelled.',
      });
    }
  })
  .meta({ id: 'UpdateOrderStatusRequest' });

const note = z
  .string({ error: 'Enter a message for the customer.' })
  .trim()
  .min(ORDER_LIMITS.noteMin, {
    error: 'The message needs at least 2 characters.',
  })
  .max(ORDER_LIMITS.noteMax, {
    error: 'The message can be at most 200 characters.',
  });

export const MarkItemNotAvailableRequestSchema = z
  .object({ message: note })
  .meta({ id: 'MarkItemNotAvailableRequest' });

const quantity = z
  .int({ error: 'Enter the quantity as a whole number.' })
  .min(1, { error: 'The quantity must be at least 1.' })
  .max(ORDER_LIMITS.maxQuantity, { error: 'The quantity can be at most 999.' });

const shadeText = (max: number) => z.string().trim().min(1).max(max).optional();

export const OfferSubstituteRequestSchema = z
  .object({
    shopProductPackId: z.uuid({ error: 'Choose a pack size.' }),
    quantity,
    shadeCode: shadeText(40),
    shadeName: shadeText(80),
    message: note.optional(),
  })
  .meta({ id: 'OfferSubstituteRequest' });

export const RecordPaymentRequestSchema = z
  .object({
    method: z.enum(PaymentMethod, {
      error: 'Choose cash, UPI or bank transfer.',
    }),
  })
  .meta({ id: 'RecordPaymentRequest' });

export const ReturnItemRequestSchema = z
  .object({ quantity, reason })
  .meta({ id: 'ReturnItemRequest' });

export const OrderSummarySchema = z
  .object({
    new: z.int(),
    packing: z.int(),
    /** Ready for pickup plus out for delivery. */
    ready: z.int(),
    /** Ready, out for delivery or completed orders not yet paid. */
    unpaid: z.object({ count: z.int(), totalPaise: z.int() }),
    /** The Indian calendar day (Asia/Kolkata). */
    today: z.object({
      placed: z.int(),
      completed: z.int(),
      /** Totals of orders completed today (D-053, owner 2026-11-08). */
      salesPaise: z.int(),
    }),
  })
  .meta({ id: 'OrderSummary' });

export type OrderSummary = z.infer<typeof OrderSummarySchema>;
export type OrderListQuery = z.infer<typeof OrderListQuerySchema>;
export type OrderListPage = z.infer<typeof OrderListPageSchema>;
export type OrderDetail = z.infer<typeof OrderDetailSchema>;
export type OrderItemResponse = z.infer<typeof OrderItemSchema>;
export type UpdateOrderStatusRequest = z.infer<
  typeof UpdateOrderStatusRequestSchema
>;
export type MarkItemNotAvailableRequest = z.infer<
  typeof MarkItemNotAvailableRequestSchema
>;
export type OfferSubstituteRequest = z.infer<
  typeof OfferSubstituteRequestSchema
>;
export type RecordPaymentRequest = z.infer<typeof RecordPaymentRequestSchema>;
export type ReturnItemRequest = z.infer<typeof ReturnItemRequestSchema>;
