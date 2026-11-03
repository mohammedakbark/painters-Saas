import { z } from 'zod';
import { ShopRole, ShopStatus } from '../generated/prisma/enums.js';

export const RegisterShopRequestSchema = z
  .object({
    shopName: z
      .string({ error: 'Enter the shop name.' })
      .trim()
      .min(2, { error: 'The shop name must be at least 2 characters.' })
      .max(120, { error: 'The shop name must be at most 120 characters.' }),
    ownerName: z
      .string({ error: 'Enter your name.' })
      .trim()
      .min(1, { error: 'Enter your name.' })
      .max(100, { error: 'Your name must be at most 100 characters.' }),
  })
  .meta({ id: 'RegisterShopRequest' });

export type RegisterShopRequest = z.infer<typeof RegisterShopRequestSchema>;

/** A shop as seen by one of its members. */
export const MyShopResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    status: z.enum(ShopStatus),
    myRole: z.enum(ShopRole),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'MyShop' });

export type MyShopResponse = z.infer<typeof MyShopResponseSchema>;
