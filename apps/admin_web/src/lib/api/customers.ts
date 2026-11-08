import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';

// Mirrors CustomerListPage, CustomerDetail and Site in
// packages/api_contracts/openapi.json (ORD-004).

export type CustomerKind = 'PAINTER' | 'CUSTOMER';
const kind = z.enum(['PAINTER', 'CUSTOMER']);

const siteSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerName: z.string().nullable(),
  address: z.string(),
  pin: z.object({ latitude: z.number(), longitude: z.number() }).nullable(),
  archived: z.boolean(),
});

const listPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
      kind,
      hasApp: z.boolean(),
      siteCount: z.number().int(),
      orderCount: z.number().int(),
      lastOrderAt: z.string().nullable(),
    }),
  ),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const detailSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  kind,
  hasApp: z.boolean(),
  sites: z.array(siteSchema),
  orderCount: z.number().int(),
  createdAt: z.string(),
});

export type Site = z.infer<typeof siteSchema>;
export type CustomerListPage = z.infer<typeof listPageSchema>;
export type CustomerRow = CustomerListPage['items'][number];
export type CustomerDetail = z.infer<typeof detailSchema>;

export interface SiteBody {
  name?: string;
  ownerName?: string | null;
  address?: string;
  pin?: { latitude: number; longitude: number } | null;
  archived?: boolean;
}

const base = (shopId: string) =>
  `/v1/shops/${encodeURIComponent(shopId)}/customers`;
const one = (shopId: string, customerId: string) =>
  `${base(shopId)}/${encodeURIComponent(customerId)}`;

export function listCustomers(
  token: string,
  shopId: string,
  params: { q?: string; kind?: CustomerKind; page: number; pageSize: number },
): Promise<CustomerListPage> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set('q', params.q);
  if (params.kind) search.set('kind', params.kind);
  return apiRequest(`${base(shopId)}?${search.toString()}`, {
    token,
    schema: listPageSchema,
  });
}

export function getCustomer(
  token: string,
  shopId: string,
  customerId: string,
): Promise<CustomerDetail> {
  return apiRequest(one(shopId, customerId), { token, schema: detailSchema });
}

export function createCustomer(
  token: string,
  shopId: string,
  body: { name: string; phone: string; kind: CustomerKind },
): Promise<CustomerDetail> {
  return apiRequest(base(shopId), {
    token,
    schema: detailSchema,
    method: 'POST',
    body,
  });
}

export function updateCustomer(
  token: string,
  shopId: string,
  customerId: string,
  body: { name?: string; phone?: string; kind?: CustomerKind },
): Promise<CustomerDetail> {
  return apiRequest(one(shopId, customerId), {
    token,
    schema: detailSchema,
    method: 'PATCH',
    body,
  });
}

export function createSite(
  token: string,
  shopId: string,
  customerId: string,
  body: SiteBody,
): Promise<Site> {
  return apiRequest(`${one(shopId, customerId)}/sites`, {
    token,
    schema: siteSchema,
    method: 'POST',
    body,
  });
}

export function updateSite(
  token: string,
  shopId: string,
  customerId: string,
  siteId: string,
  body: SiteBody,
): Promise<Site> {
  return apiRequest(
    `${one(shopId, customerId)}/sites/${encodeURIComponent(siteId)}`,
    { token, schema: siteSchema, method: 'PATCH', body },
  );
}
