import { z } from 'zod';
import { CustomerType } from '../generated/prisma/enums.js';

/** The caller's Customer App profile (CUS-001, D-036). */
export const CustomerProfileResponseSchema = z
  .object({
    displayName: z.string().nullable(),
    phone: z
      .string()
      .nullable()
      .meta({ description: 'E.164, for example +919999900001.' }),
    customerType: z.enum(CustomerType).nullable().meta({
      description:
        'PAINTER (Painter/Contractor) or CUSTOMER (Normal Customer); null until chosen.',
    }),
    complete: z.boolean().meta({
      description:
        'True once the name and the customer type are set. The Customer App asks for them until then.',
    }),
  })
  .meta({ id: 'CustomerProfileResponse' });

export type CustomerProfileResponse = z.infer<
  typeof CustomerProfileResponseSchema
>;

export const UpdateCustomerProfileRequestSchema = z
  .object({
    displayName: z
      .string({ error: 'Enter your name.' })
      .trim()
      .min(1, { error: 'Enter your name.' })
      .max(100, { error: 'Your name must be at most 100 characters.' }),
    customerType: z.enum(CustomerType, {
      error: 'Choose Painter/Contractor or Normal Customer.',
    }),
  })
  .meta({ id: 'UpdateCustomerProfileRequest' });

export type UpdateCustomerProfileRequest = z.infer<
  typeof UpdateCustomerProfileRequestSchema
>;
