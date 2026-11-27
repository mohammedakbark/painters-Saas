import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';
import type { CustomerKind } from './customers';

// Mirrors BillListPage, Bill and BillMoneyRequest in
// packages/api_contracts/openapi.json (BIL-001, D-062).

const method = z.enum(['CASH', 'UPI', 'BANK_TRANSFER']);
export type BillStatus = 'owing' | 'shop_owes' | 'settled' | 'over_limit';
export type BillEntryKind = 'CHARGE' | 'ADJUSTMENT' | 'PAYMENT' | 'REFUND';

const listPageSchema = z.object({
  items: z.array(
    z.object({
      customer: z.object({
        id: z.string(),
        name: z.string(),
        phone: z.string(),
        kind: z.enum(['PAINTER', 'CUSTOMER']),
      }),
      balancePaise: z.number().int(),
      lastEntryAt: z.string(),
      credit: z.object({
        status: z.enum(['none', 'active', 'stopped']),
        limitPaise: z.number().int().nullable(),
      }),
    }),
  ),
  totals: z.object({
    owingPaise: z.number().int(),
    shopOwesPaise: z.number().int(),
  }),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const billSchema = z.object({
  customerId: z.string(),
  balancePaise: z.number().int(),
  sites: z.array(
    z.object({
      label: z.string(),
      billedPaise: z.number().int(),
      orderCount: z.number().int(),
    }),
  ),
  entries: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        kind: z.enum(['CHARGE', 'ADJUSTMENT', 'PAYMENT', 'REFUND']),
        amountPaise: z.number().int(),
        createdAt: z.string(),
        order: z
          .object({
            id: z.string(),
            number: z.number().int(),
            siteLabel: z.string().nullable(),
          })
          .nullable(),
        method: method.nullable(),
        note: z.string().nullable(),
      }),
    ),
    page: z.number().int(),
    hasMore: z.boolean(),
  }),
});

export type BillListPage = z.infer<typeof listPageSchema>;
export type BillRow = BillListPage['items'][number];
export type Bill = z.infer<typeof billSchema>;
export type BillEntry = Bill['entries']['items'][number];

export interface BillMoneyBody {
  amountPaise: number;
  method: z.infer<typeof method>;
  note?: string | null;
  clientRequestId: string;
}

const shopBase = (shopId: string) => `/v1/shops/${encodeURIComponent(shopId)}`;
const billPath = (shopId: string, customerId: string) =>
  `${shopBase(shopId)}/customers/${encodeURIComponent(customerId)}/bill`;

export function listBills(
  token: string,
  shopId: string,
  params: {
    q?: string;
    kind?: CustomerKind;
    status?: BillStatus;
    page: number;
    pageSize: number;
  },
): Promise<BillListPage> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  if (params.kind) search.set('kind', params.kind);
  if (params.status) search.set('status', params.status);
  return apiRequest(`${shopBase(shopId)}/bills?${search.toString()}`, {
    token,
    schema: listPageSchema,
  });
}

export function getBill(
  token: string,
  shopId: string,
  customerId: string,
  page = 1,
): Promise<Bill> {
  return apiRequest(`${billPath(shopId, customerId)}?page=${page}`, {
    token,
    schema: billSchema,
  });
}

export function recordBillMoney(
  token: string,
  shopId: string,
  customerId: string,
  kind: 'payments' | 'refunds',
  body: BillMoneyBody,
): Promise<Bill> {
  return apiRequest(`${billPath(shopId, customerId)}/${kind}`, {
    token,
    schema: billSchema,
    method: 'POST',
    body,
  });
}
