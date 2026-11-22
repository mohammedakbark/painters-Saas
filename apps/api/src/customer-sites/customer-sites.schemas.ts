import { z } from 'zod';

export const MAX_ACTIVE_SITES = 100;

/** India only, like the shop map pins (SHP-003). */
const pin = z.object(
  {
    latitude: z
      .number({ error: 'Choose the site on the map.' })
      .min(6, { error: 'The site must be in India.' })
      .max(38, { error: 'The site must be in India.' }),
    longitude: z
      .number({ error: 'Choose the site on the map.' })
      .min(68, { error: 'The site must be in India.' })
      .max(98, { error: 'The site must be in India.' }),
  },
  { error: 'Choose the site on the map.' },
);

const fields = {
  name: z
    .string({ error: 'Enter the site name.' })
    .trim()
    .min(2, { error: 'The site name needs at least 2 characters.' })
    .max(80, { error: 'The site name can be at most 80 characters.' }),
  ownerName: z
    .string()
    .trim()
    .max(120, { error: 'The owner name can be at most 120 characters.' })
    .transform((value) => value || null)
    .nullable(),
  address: z
    .string({ error: 'Enter the address or place.' })
    .trim()
    .min(5, { error: 'Enter the house or business name and place.' })
    .max(300, { error: 'The address can be at most 300 characters.' }),
  pin,
};

/** A painter's new site (CUS-005): the map pin is required (D-049). */
export const CreateCustomerSiteRequestSchema = z
  .object({
    name: fields.name,
    ownerName: fields.ownerName.optional(),
    address: fields.address,
    pin: fields.pin,
  })
  .meta({ id: 'CreateCustomerSiteRequest' });

export type CreateCustomerSiteRequest = z.infer<
  typeof CreateCustomerSiteRequestSchema
>;

export const UpdateCustomerSiteRequestSchema = z
  .object({
    name: fields.name.optional(),
    ownerName: fields.ownerName.optional(),
    address: fields.address.optional(),
    pin: fields.pin.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Nothing to change.',
  })
  .meta({ id: 'UpdateCustomerSiteRequest' });

export type UpdateCustomerSiteRequest = z.infer<
  typeof UpdateCustomerSiteRequestSchema
>;

export const CustomerSiteListQuerySchema = z
  .object({
    archived: z
      .enum(['true', 'false'], { error: 'archived must be true or false.' })
      .default('false')
      .transform((value) => value === 'true')
      .meta({ description: 'true lists the archived sites.' }),
  })
  .meta({ id: 'CustomerSiteListQuery' });

export type CustomerSiteListQuery = z.infer<typeof CustomerSiteListQuerySchema>;

/**
 * What a site has cost so far (CUS-007, D-008): the totals of the painter's
 * orders for it, from every shop, cancelled orders left out.
 */
export const SiteSpendTotalsSchema = z
  .object({
    totalPaise: z.int(),
    shopCount: z.int(),
    orderCount: z.int(),
    lastOrderAt: z.iso.datetime().nullable(),
  })
  .meta({ id: 'SiteSpendTotals' });

export type SiteSpendTotals = z.infer<typeof SiteSpendTotalsSchema>;

export const CustomerSiteSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    ownerName: z.string().nullable(),
    address: z.string(),
    pin: z.object({ latitude: z.number(), longitude: z.number() }),
    archived: z.boolean(),
    spend: SiteSpendTotalsSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'CustomerSite' });

export type CustomerSite = z.infer<typeof CustomerSiteSchema>;

export const CustomerSiteListSchema = z
  .object({ items: z.array(CustomerSiteSchema) })
  .meta({ id: 'CustomerSiteList' });

export type CustomerSiteList = z.infer<typeof CustomerSiteListSchema>;

/** At most this many orders are listed on a site's spend page. */
export const MAX_SPEND_ORDERS = 200;

/** A site's spend by shop (CUS-007): each shop's orders stay separate. */
export const SiteSpendSchema = z
  .object({
    site: z.object({ id: z.uuid(), name: z.string(), archived: z.boolean() }),
    totalPaise: z.int(),
    shops: z.array(
      z.object({
        shop: z.object({ id: z.uuid(), name: z.string() }),
        totalPaise: z.int(),
        orderCount: z.int(),
        orders: z.array(
          z.object({
            id: z.uuid(),
            number: z.int(),
            placedAt: z.iso.datetime(),
            status: z.enum([
              'NEW',
              'PACKING',
              'READY_FOR_PICKUP',
              'OUT_FOR_DELIVERY',
              'COMPLETED',
            ]),
            totalPaise: z.int(),
          }),
        ),
      }),
    ),
    /** True when more than MAX_SPEND_ORDERS orders exist; totals stay exact. */
    ordersTruncated: z.boolean(),
  })
  .meta({ id: 'SiteSpend' });

export type SiteSpend = z.infer<typeof SiteSpendSchema>;
