import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';

// Mirrors Credit, IdCheckRequest and CreditChangeRequest in
// packages/api_contracts/openapi.json (CRD-001, D-064).

export const ID_TYPES = [
  'AADHAAR',
  'PAN',
  'VOTER_ID',
  'DRIVING_LICENCE',
  'PASSPORT',
] as const;
export type IdType = (typeof ID_TYPES)[number];
export type CreditStatus = 'none' | 'active' | 'stopped';
export type CreditEventKind =
  'ID_CHECKED' | 'GIVEN' | 'LIMIT_CHANGED' | 'STOPPED' | 'OVERRIDE';

const creditSchema = z.object({
  customerId: z.string(),
  status: z.enum(['none', 'active', 'stopped']),
  limitPaise: z.number().int().nullable(),
  owedPaise: z.number().int(),
  leftPaise: z.number().int().nullable(),
  idCheck: z
    .object({
      type: z.enum(ID_TYPES),
      last4: z.string(),
      checkedBy: z.string(),
      checkedAt: z.string(),
    })
    .nullable(),
  eligible: z.boolean(),
  ineligibleReason: z.enum(['no_app_account']).nullable(),
  events: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        kind: z.enum([
          'ID_CHECKED',
          'GIVEN',
          'LIMIT_CHANGED',
          'STOPPED',
          'OVERRIDE',
        ]),
        limitPaise: z.number().int().nullable(),
        previousPaise: z.number().int().nullable(),
        owedPaise: z.number().int().nullable(),
        idType: z.enum(ID_TYPES).nullable(),
        idLast4: z.string().nullable(),
        reason: z.string().nullable(),
        order: z
          .object({ id: z.string(), number: z.number().int() })
          .nullable(),
        by: z.string(),
        at: z.string(),
      }),
    ),
    page: z.number().int(),
    hasMore: z.boolean(),
  }),
});

export type Credit = z.infer<typeof creditSchema>;
export type CreditEvent = Credit['events']['items'][number];

/** An order's standing with the customer's credit (OrderDetail, CRD-001). */
export const creditWarningSchema = z.object({
  kind: z.enum(['over_limit', 'no_credit']),
  owedPaise: z.number().int().nullable(),
  limitPaise: z.number().int().nullable(),
});
export type CreditWarning = z.infer<typeof creditWarningSchema>;

export type CreditChangeBody =
  | {
      action: 'give' | 'change';
      limitPaise: number;
      reason: string;
      clientRequestId: string;
    }
  | { action: 'stop'; reason: string; clientRequestId: string };

const creditPath = (shopId: string, customerId: string) =>
  `/v1/shops/${encodeURIComponent(shopId)}/customers/${encodeURIComponent(customerId)}/credit`;

export function getCredit(
  token: string,
  shopId: string,
  customerId: string,
  page = 1,
): Promise<Credit> {
  return apiRequest(`${creditPath(shopId, customerId)}?page=${page}`, {
    token,
    schema: creditSchema,
  });
}

export function checkCreditId(
  token: string,
  shopId: string,
  customerId: string,
  body: {
    type: IdType;
    last4: string;
    sawOriginal: true;
    clientRequestId: string;
  },
): Promise<Credit> {
  return apiRequest(`${creditPath(shopId, customerId)}/id-check`, {
    token,
    schema: creditSchema,
    method: 'POST',
    body,
  });
}

export function changeCredit(
  token: string,
  shopId: string,
  customerId: string,
  body: CreditChangeBody,
): Promise<Credit> {
  return apiRequest(creditPath(shopId, customerId), {
    token,
    schema: creditSchema,
    method: 'PUT',
    body,
  });
}
