import { z } from 'zod';

/** At most this many shops are listed on "My bills" (a bound, not a rule). */
export const MY_BILLS_MAX_SHOPS = 100;

const page = z.coerce
  .number({ error: 'page must be a number.' })
  .int({ error: 'page must be a whole number.' })
  .min(1, { error: 'page must be at least 1.' })
  .default(1);

export const MyBillQuerySchema = z.object({ page }).meta({ id: 'MyBillQuery' });
export type MyBillQuery = z.infer<typeof MyBillQuerySchema>;

const shop = z.object({ id: z.uuid(), name: z.string() });

/** The caller's bill with each shop (BIL-003). */
export const MyBillListSchema = z
  .object({
    items: z.array(
      z.object({
        shop,
        /** Positive: the caller owes the shop; negative: the shop owes them. */
        balancePaise: z.int(),
        lastEntryAt: z.iso.datetime(),
      }),
    ),
  })
  .meta({ id: 'MyBillList' });

export type MyBillList = z.infer<typeof MyBillListSchema>;

/**
 * The caller's bill with one shop. The shop's notes on payments are not
 * shown to the customer; everything else matches what the shop sees.
 */
export const MyBillSchema = z
  .object({
    shop,
    balancePaise: z.int(),
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
          method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']).nullable(),
        }),
      ),
      page: z.int(),
      hasMore: z.boolean(),
    }),
  })
  .meta({ id: 'MyBill' });

export type MyBill = z.infer<typeof MyBillSchema>;
