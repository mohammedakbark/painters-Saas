import { z } from 'zod';
import { ShopStatus } from '../generated/prisma/enums.js';

export const ShopRegistryQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(60, { error: 'Search for at most 60 characters.' })
      .optional()
      .meta({ description: 'Shop name, owner name or owner mobile.' }),
    status: z
      .enum(ShopStatus, { error: 'status must be a shop status.' })
      .optional(),
    sort: z
      .enum(['newest', 'oldest', 'name'], {
        error: 'sort must be newest, oldest or name.',
      })
      .default('newest'),
    page: z.coerce
      .number({ error: 'page must be a number.' })
      .int({ error: 'page must be a whole number.' })
      .min(1, { error: 'page must be at least 1.' })
      .default(1),
    pageSize: z.coerce
      .number({ error: 'pageSize must be 10, 25 or 50.' })
      .refine((value) => [10, 25, 50].includes(value), {
        error: 'pageSize must be 10, 25 or 50.',
      })
      .default(25),
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
    photoThumbUrl: z
      .url()
      .nullable()
      .meta({ description: 'The public shop photo, if any.' }),
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
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
    statusCounts: z
      .object({
        ALL: z.int(),
        DRAFT: z.int(),
        PENDING_REVIEW: z.int(),
        CHANGES_REQUESTED: z.int(),
        ACTIVE: z.int(),
      })
      .meta({ description: 'Shops per status for the current search.' }),
  })
  .meta({ id: 'ShopRegistryPage' });

export type ShopRegistryPage = z.infer<typeof ShopRegistryPageSchema>;
