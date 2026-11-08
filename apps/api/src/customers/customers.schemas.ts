import { z } from 'zod';
import { CustomerKind } from '../generated/prisma/enums.js';

// Limits match the CHECK constraints in the ORD-001 and ORD-004 migrations.

export const CUSTOMER_LIMITS = { maxActiveSites: 50 } as const;
export const CUSTOMER_PAGE_SIZES = [10, 25, 50] as const;

const name = z
  .string({ error: 'Enter the name.' })
  .trim()
  .min(1, { error: 'Enter the name.' })
  .max(120, { error: 'The name can be at most 120 characters.' });

const kind = z.enum(CustomerKind, {
  error: 'Choose Painter or Customer.',
});

export const CreateCustomerRequestSchema = z
  .object({
    name,
    /** Any common Indian mobile format; stored as E.164. */
    phone: z
      .string({ error: 'Enter the mobile number.' })
      .trim()
      .min(1, { error: 'Enter the mobile number.' })
      .max(20, { error: 'Enter a 10-digit Indian mobile number.' }),
    kind,
  })
  .meta({ id: 'CreateCustomerRequest' });

export const UpdateCustomerRequestSchema = z
  .object({
    name: name.optional(),
    kind: kind.optional(),
    phone: z
      .string()
      .trim()
      .min(1, { error: 'Enter the mobile number.' })
      .max(20, { error: 'Enter a 10-digit Indian mobile number.' })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Nothing to change.',
  })
  .meta({ id: 'UpdateCustomerRequest' });

export const CustomerListQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(60, { error: 'Search can be at most 60 characters.' })
      .optional()
      .meta({ description: 'Name or mobile number.' }),
    kind: kind.optional(),
    page: z.coerce
      .number({ error: 'page must be a number.' })
      .int({ error: 'page must be a whole number.' })
      .min(1, { error: 'page must be at least 1.' })
      .default(1),
    pageSize: z.coerce
      .number({ error: 'pageSize must be a number.' })
      .refine(
        (value) => (CUSTOMER_PAGE_SIZES as readonly number[]).includes(value),
        { error: 'pageSize must be 10, 25 or 50.' },
      )
      .default(25),
  })
  .meta({ id: 'CustomerListQuery' });

const coordinate = (min: number, max: number) =>
  z.number({ error: 'Enter the map position as numbers.' }).min(min).max(max);

const siteFields = {
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
  pin: z
    .object({
      latitude: coordinate(-90, 90),
      longitude: coordinate(-180, 180),
    })
    .nullable(),
};

export const CreateSiteRequestSchema = z
  .object({
    name: siteFields.name,
    ownerName: siteFields.ownerName.optional(),
    address: siteFields.address,
    pin: siteFields.pin.optional(),
  })
  .meta({ id: 'CreateSiteRequest' });

export const UpdateSiteRequestSchema = z
  .object({
    name: siteFields.name.optional(),
    ownerName: siteFields.ownerName.optional(),
    address: siteFields.address.optional(),
    pin: siteFields.pin.optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Nothing to change.',
  })
  .meta({ id: 'UpdateSiteRequest' });

export const SiteSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    ownerName: z.string().nullable(),
    address: z.string(),
    pin: z.object({ latitude: z.number(), longitude: z.number() }).nullable(),
    archived: z.boolean(),
  })
  .meta({ id: 'Site' });

const customerFields = {
  id: z.uuid(),
  name: z.string(),
  /** E.164. Visible only to this shop. */
  phone: z.string(),
  kind: z.enum(CustomerKind),
  /** Linked to an app account (orders placed in the app). */
  hasApp: z.boolean(),
};

export const CustomerListPageSchema = z
  .object({
    items: z.array(
      z.object({
        ...customerFields,
        siteCount: z.int(),
        orderCount: z.int(),
        lastOrderAt: z.iso.datetime().nullable(),
      }),
    ),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
  })
  .meta({ id: 'CustomerListPage' });

export const CustomerDetailSchema = z
  .object({
    ...customerFields,
    sites: z.array(SiteSchema),
    orderCount: z.int(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'CustomerDetail' });

export type CreateCustomerRequest = z.infer<typeof CreateCustomerRequestSchema>;
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerRequestSchema>;
export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;
export type CreateSiteRequest = z.infer<typeof CreateSiteRequestSchema>;
export type UpdateSiteRequest = z.infer<typeof UpdateSiteRequestSchema>;
export type SiteResponse = z.infer<typeof SiteSchema>;
export type CustomerListPage = z.infer<typeof CustomerListPageSchema>;
export type CustomerDetail = z.infer<typeof CustomerDetailSchema>;
