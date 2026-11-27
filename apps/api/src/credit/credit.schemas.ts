import { z } from 'zod';
import { CreditEventKind, IdDocumentType } from '../generated/prisma/enums.js';

/** ₹10,00,000 (owner's limit range, CRD-001), in paise. */
export const CREDIT_MAX_LIMIT_PAISE = 10_00_000_00;
export const CREDIT_EVENTS_PAGE_SIZE = 20;

const page = z.coerce
  .number({ error: 'page must be a number.' })
  .int({ error: 'page must be a whole number.' })
  .min(1, { error: 'page must be at least 1.' })
  .default(1);

export const CreditQuerySchema = z.object({ page }).meta({ id: 'CreditQuery' });
export type CreditQuery = z.infer<typeof CreditQuerySchema>;

export const CreditWarningSchema = z
  .object({
    kind: z.enum(['over_limit', 'no_credit']),
    /** With this order; null without credit or money-figure permission. */
    owedPaise: z.int().nullable(),
    limitPaise: z.int().nullable(),
  })
  .meta({ id: 'CreditWarning' });

export const CreditSchema = z
  .object({
    customerId: z.uuid(),
    status: z.enum(['none', 'active', 'stopped']),
    limitPaise: z.int().nullable(),
    /** The bill balance plus accepted orders not on the bill yet. */
    owedPaise: z.int(),
    /** limit − owed; negative when over the limit; null without credit. */
    leftPaise: z.int().nullable(),
    idCheck: z
      .object({
        type: z.enum(IdDocumentType),
        last4: z.string(),
        checkedBy: z.string(),
        checkedAt: z.iso.datetime(),
      })
      .nullable(),
    /** Credit needs a connected Customer App account (D-064 rule 3). */
    eligible: z.boolean(),
    ineligibleReason: z.enum(['no_app_account']).nullable(),
    events: z.object({
      items: z.array(
        z.object({
          id: z.uuid(),
          kind: z.enum(CreditEventKind),
          limitPaise: z.int().nullable(),
          previousPaise: z.int().nullable(),
          owedPaise: z.int().nullable(),
          idType: z.enum(IdDocumentType).nullable(),
          idLast4: z.string().nullable(),
          reason: z.string().nullable(),
          order: z.object({ id: z.uuid(), number: z.int() }).nullable(),
          by: z.string(),
          at: z.iso.datetime(),
        }),
      ),
      page: z.int(),
      hasMore: z.boolean(),
    }),
  })
  .meta({ id: 'Credit' });

export type Credit = z.infer<typeof CreditSchema>;

const clientRequestId = z.uuid({ error: 'clientRequestId must be a UUID.' });

export const IdCheckRequestSchema = z
  .object({
    type: z.enum(IdDocumentType, { error: 'Choose the document.' }),
    last4: z
      .string({ error: 'Enter the last 4 characters.' })
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{4}$/, {
        error:
          'Enter only the last 4 letters or digits, never the full number.',
      }),
    sawOriginal: z.literal(true, {
      error: 'Tick that you saw the original document.',
    }),
    clientRequestId,
  })
  .meta({ id: 'IdCheckRequest' });

export type IdCheckRequest = z.infer<typeof IdCheckRequestSchema>;

const reason = z
  .string({ error: 'Enter a reason.' })
  .trim()
  .min(2, { error: 'The reason needs at least 2 characters.' })
  .max(300, { error: 'The reason can be at most 300 characters.' });

export const CreditChangeRequestSchema = z
  .discriminatedUnion(
    'action',
    [
      z.object({
        action: z.enum(['give', 'change']),
        limitPaise: z
          .int({ error: 'Enter the limit.' })
          .min(100, { error: 'The limit must be at least ₹1.' })
          .max(CREDIT_MAX_LIMIT_PAISE, {
            error: 'The limit can be at most ₹10,00,000.',
          })
          .refine((value) => value % 100 === 0, {
            error: 'Enter the limit in whole rupees.',
          }),
        reason,
        clientRequestId,
      }),
      z.object({ action: z.literal('stop'), reason, clientRequestId }),
    ],
    { error: 'action must be give, change or stop.' },
  )
  .meta({ id: 'CreditChangeRequest' });

export type CreditChangeRequest = z.infer<typeof CreditChangeRequestSchema>;
