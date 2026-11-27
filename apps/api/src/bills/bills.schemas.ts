import { z } from 'zod';
import { CustomerKind, PaymentMethod } from '../generated/prisma/enums.js';

export const BILL_PAGE_SIZES = [10, 25, 50] as const;
export const BILL_ENTRIES_PAGE_SIZE = 20;
/** ₹1 crore: a bound against typing mistakes, not a business limit. */
export const BILL_MAX_AMOUNT_PAISE = 10_000_000_00;

const page = z.coerce
  .number({ error: 'page must be a number.' })
  .int({ error: 'page must be a whole number.' })
  .min(1, { error: 'page must be at least 1.' })
  .default(1);

/** Which balances the Bills page shows (BIL-001). */
export const BillStatus = [
  'owing',
  'shop_owes',
  'settled',
  'over_limit',
] as const;

export const BillListQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(60, { error: 'Search can be at most 60 characters.' })
      .optional()
      .meta({ description: 'Name or mobile number.' }),
    kind: z
      .enum(CustomerKind, { error: 'kind must be PAINTER or CUSTOMER.' })
      .optional(),
    status: z
      .enum(BillStatus, {
        error: 'status must be owing, shop_owes, settled or over_limit.',
      })
      .optional()
      .meta({
        description:
          'owing: the customer owes; shop_owes: the shop owes; settled: 0; over_limit: owes more than their credit limit (CRD-001).',
      }),
    page,
    pageSize: z.coerce
      .number({ error: 'pageSize must be a number.' })
      .refine(
        (value) => (BILL_PAGE_SIZES as readonly number[]).includes(value),
        { error: 'pageSize must be 10, 25 or 50.' },
      )
      .default(25),
  })
  .meta({ id: 'BillListQuery' });

export type BillListQuery = z.infer<typeof BillListQuerySchema>;

export const BillListPageSchema = z
  .object({
    items: z.array(
      z.object({
        customer: z.object({
          id: z.uuid(),
          name: z.string(),
          phone: z.string(),
          kind: z.enum(CustomerKind),
        }),
        /** Positive: the customer owes; negative: the shop owes. */
        balancePaise: z.int(),
        lastEntryAt: z.iso.datetime(),
        /** The shop's credit (CRD-001); the limit needs money permission. */
        credit: z.object({
          status: z.enum(['none', 'active', 'stopped']),
          limitPaise: z.int().nullable(),
        }),
      }),
    ),
    /** Everything customers owe this shop, and what it owes them. */
    totals: z.object({ owingPaise: z.int(), shopOwesPaise: z.int() }),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
  })
  .meta({ id: 'BillListPage' });

export type BillListPage = z.infer<typeof BillListPageSchema>;

export const BillQuerySchema = z.object({ page }).meta({ id: 'BillQuery' });

export type BillQuery = z.infer<typeof BillQuerySchema>;

export const BillSchema = z
  .object({
    customerId: z.uuid(),
    /** Positive: the customer owes; negative: the shop owes; 0: settled. */
    balancePaise: z.int(),
    /** Painters: what was billed for each site; payments are not by site. */
    sites: z.array(
      z.object({
        label: z.string(),
        billedPaise: z.int(),
        orderCount: z.int(),
      }),
    ),
    entries: z.object({
      items: z.array(
        z.object({
          id: z.uuid(),
          kind: z.enum(['CHARGE', 'ADJUSTMENT', 'PAYMENT', 'REFUND']),
          amountPaise: z.int(),
          createdAt: z.iso.datetime(),
          order: z
            .object({
              id: z.uuid(),
              number: z.int(),
              siteLabel: z.string().nullable(),
            })
            .nullable(),
          method: z.enum(PaymentMethod).nullable(),
          note: z.string().nullable(),
        }),
      ),
      page: z.int(),
      hasMore: z.boolean(),
    }),
  })
  .meta({ id: 'Bill' });

export type Bill = z.infer<typeof BillSchema>;

/** A payment or refund the shop records (BIL-001). */
export const BillMoneyRequestSchema = z
  .object({
    amountPaise: z
      .int({ error: 'Enter the amount.' })
      .min(100, { error: 'The amount must be at least ₹1.' })
      .max(BILL_MAX_AMOUNT_PAISE, { error: 'The amount is too large.' }),
    method: z.enum(PaymentMethod, {
      error: 'Choose cash, UPI or bank transfer.',
    }),
    note: z
      .string()
      .trim()
      .max(300, { error: 'The note can be at most 300 characters.' })
      .transform((value) => value || null)
      .nullable()
      .optional(),
    clientRequestId: z.uuid({ error: 'clientRequestId must be a UUID.' }),
  })
  .meta({ id: 'BillMoneyRequest' });

export type BillMoneyRequest = z.infer<typeof BillMoneyRequestSchema>;
