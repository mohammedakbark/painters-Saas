import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';

// Mirrors ConnectRequestList and ConnectDecision in
// packages/api_contracts/openapi.json (CON-001, D-063).

const listSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      requestedAt: z.string(),
      customer: z.object({
        id: z.string(),
        name: z.string(),
        phone: z.string(),
        kind: z.enum(['PAINTER', 'CUSTOMER']),
      }),
      mergesIntoAppRecord: z.boolean(),
    }),
  ),
});

const decisionSchema = z.object({
  customerId: z.string(),
  merged: z.boolean(),
});

export type ConnectRequest = z.infer<typeof listSchema>['items'][number];

const base = (shopId: string) =>
  `/v1/shops/${encodeURIComponent(shopId)}/connect-requests`;

export function listConnectRequests(
  token: string,
  shopId: string,
): Promise<ConnectRequest[]> {
  return apiRequest(base(shopId), { token, schema: listSchema }).then(
    (list) => list.items,
  );
}

export function approveConnectRequest(
  token: string,
  shopId: string,
  requestId: string,
): Promise<z.infer<typeof decisionSchema>> {
  return apiRequest(
    `${base(shopId)}/${encodeURIComponent(requestId)}/approve`,
    {
      token,
      schema: decisionSchema,
      method: 'POST',
      body: {},
    },
  );
}

export function declineConnectRequest(
  token: string,
  shopId: string,
  requestId: string,
): Promise<void> {
  return apiRequest(
    `${base(shopId)}/${encodeURIComponent(requestId)}/decline`,
    {
      token,
      schema: z.undefined(),
      method: 'POST',
      body: {},
    },
  );
}
