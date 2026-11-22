import { z } from 'zod';
import { CustomerKind } from '../generated/prisma/enums.js';

/**
 * The caller's latest request to one shop (CON-001). It never says whether
 * the shop has a record of their mobile (D-054).
 */
export const MyConnectRequestSchema = z
  .object({
    status: z.enum(['NONE', 'PENDING', 'APPROVED', 'DECLINED']),
    requestedAt: z.iso.datetime().nullable(),
  })
  .meta({ id: 'MyConnectRequest' });

export type MyConnectRequest = z.infer<typeof MyConnectRequestSchema>;

/** Open requests that match one of the shop's own records by mobile. */
export const ConnectRequestListSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.uuid(),
        requestedAt: z.iso.datetime(),
        customer: z.object({
          id: z.uuid(),
          name: z.string(),
          phone: z.string(),
          kind: z.enum(CustomerKind),
        }),
        /**
         * The person already orders from the shop in the app: approving
         * merges this record into that one.
         */
        mergesIntoAppRecord: z.boolean(),
      }),
    ),
  })
  .meta({ id: 'ConnectRequestList' });

export type ConnectRequestList = z.infer<typeof ConnectRequestListSchema>;

export const ConnectDecisionSchema = z
  .object({
    /** The record now linked to the person's account. */
    customerId: z.uuid(),
    merged: z.boolean(),
  })
  .meta({ id: 'ConnectDecision' });

export type ConnectDecision = z.infer<typeof ConnectDecisionSchema>;
