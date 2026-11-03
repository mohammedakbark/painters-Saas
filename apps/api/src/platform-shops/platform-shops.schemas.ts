import { z } from 'zod';
import { ShopStatus } from '../generated/prisma/enums.js';

export const ShopRegistryQuerySchema = z
  .object({
    limit: z.coerce
      .number({ error: 'limit must be a whole number from 1 to 50.' })
      .int({ error: 'limit must be a whole number from 1 to 50.' })
      .min(1, { error: 'limit must be a whole number from 1 to 50.' })
      .max(50, { error: 'limit must be a whole number from 1 to 50.' })
      .default(20),
    cursor: z
      .uuid({ error: 'cursor must be the nextCursor of a previous page.' })
      .optional(),
  })
  .meta({ id: 'ShopRegistryQuery' });

export type ShopRegistryQuery = z.infer<typeof ShopRegistryQuerySchema>;

export const ShopRegistryEntrySchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    status: z.enum(ShopStatus),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    master: z
      .object({
        name: z.string().nullable(),
        phone: z
          .string()
          .nullable()
          .meta({ description: 'E.164 mobile number of the master account.' }),
      })
      .nullable(),
  })
  .meta({ id: 'ShopRegistryEntry' });

export type ShopRegistryEntry = z.infer<typeof ShopRegistryEntrySchema>;

export const ShopRegistryPageSchema = z
  .object({
    items: z.array(ShopRegistryEntrySchema),
    nextCursor: z.uuid().nullable().meta({
      description: 'Pass as `cursor` for the next page; null on the last page.',
    }),
  })
  .meta({ id: 'ShopRegistryPage' });

export type ShopRegistryPage = z.infer<typeof ShopRegistryPageSchema>;
