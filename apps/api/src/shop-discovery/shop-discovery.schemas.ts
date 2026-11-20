import { z } from 'zod';

export const DISCOVERY_PAGE_SIZE_MAX = 50;

const latitude = z.coerce
  .number({ error: 'lat must be a number.' })
  .min(-90, { error: 'lat must be between -90 and 90.' })
  .max(90, { error: 'lat must be between -90 and 90.' });
const longitude = z.coerce
  .number({ error: 'lng must be a number.' })
  .min(-180, { error: 'lng must be between -180 and 180.' })
  .max(180, { error: 'lng must be between -180 and 180.' });

/** The phone's position, used only to sort; never stored or logged. */
const nearQuery = {
  lat: latitude.optional(),
  lng: longitude.optional(),
};

function bothOrNeither(value: { lat?: number; lng?: number }): boolean {
  return (value.lat === undefined) === (value.lng === undefined);
}
const BOTH_COORDINATES = {
  error: 'Send lat and lng together.',
  path: ['lat'],
};

export const FindShopsQuerySchema = z
  .object({
    ...nearQuery,
    district: z
      .string()
      .trim()
      .min(1)
      .max(80, { error: 'district can be at most 80 characters.' })
      .optional()
      .meta({
        description:
          'Used when there is no position: shops in this district come first (D-038).',
      }),
    q: z
      .string()
      .trim()
      .max(60, { error: 'Search can be at most 60 characters.' })
      .optional()
      .meta({ description: 'Part of the shop name.' }),
    page: z.coerce
      .number({ error: 'page must be a number.' })
      .int({ error: 'page must be a whole number.' })
      .min(1, { error: 'page must be at least 1.' })
      .default(1),
    pageSize: z.coerce
      .number({ error: 'pageSize must be a number.' })
      .int({ error: 'pageSize must be a whole number.' })
      .min(1, { error: 'pageSize must be at least 1.' })
      .max(DISCOVERY_PAGE_SIZE_MAX, {
        error: `pageSize can be at most ${DISCOVERY_PAGE_SIZE_MAX}.`,
      })
      .default(20),
  })
  .refine(bothOrNeither, BOTH_COORDINATES)
  .meta({ id: 'FindShopsQuery' });

export type FindShopsQuery = z.infer<typeof FindShopsQuerySchema>;

export const NearQuerySchema = z
  .object(nearQuery)
  .refine(bothOrNeither, BOTH_COORDINATES)
  .meta({ id: 'NearQuery' });

export type NearQuery = z.infer<typeof NearQuerySchema>;

/**
 * What any signed-in person may see of a Live shop (CUS-002, owner
 * 2026-11-20). Never the support mobile (question 39), staff, prices,
 * customers or order settings.
 */
export const PublicShopSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    photo: z
      .object({
        url: z.url().meta({ description: 'WebP, at most 1600 px.' }),
        thumbUrl: z.url().meta({ description: 'WebP, at most 480 px.' }),
        updatedAt: z.iso.datetime(),
      })
      .nullable(),
    address: z.object({
      line1: z.string().nullable(),
      line2: z.string().nullable(),
      landmark: z.string().nullable(),
      city: z.string().nullable(),
      district: z.string().nullable(),
      stateCode: z.string().nullable(),
      postalCode: z.string().nullable(),
    }),
    location: z
      .object({ latitude: z.number(), longitude: z.number() })
      .nullable(),
    delivery: z
      .object({
        enabled: z.boolean(),
        chargePaise: z.int().nullable(),
        freeAbovePaise: z.int().nullable(),
        radiusKm: z.int().nullable(),
      })
      .meta({
        description:
          'Pickup is always offered (D-046). When delivery is off the other values are null.',
      }),
    distanceKm: z.number().nullable().meta({
      description:
        'Straight-line distance from the position sent, rounded to 0.1 km; null without a position.',
    }),
    inMyShops: z.boolean(),
  })
  .meta({ id: 'PublicShop' });

export type PublicShop = z.infer<typeof PublicShopSchema>;

export const ShopSortSchema = z.enum(['distance', 'district', 'name']);

export const FindShopsPageSchema = z
  .object({
    items: z.array(PublicShopSchema),
    total: z.int(),
    page: z.int(),
    pageSize: z.int(),
    sort: ShopSortSchema.meta({
      description:
        'distance: nearest first; district: the chosen district first, then by name; name: by name.',
    }),
  })
  .meta({ id: 'FindShopsPage' });

export type FindShopsPage = z.infer<typeof FindShopsPageSchema>;

export const ShopDistrictsSchema = z
  .object({
    items: z.array(
      z.object({
        district: z.string(),
        stateCode: z.string().nullable(),
        shopCount: z.int(),
      }),
    ),
  })
  .meta({ id: 'ShopDistricts' });

export type ShopDistricts = z.infer<typeof ShopDistrictsSchema>;

export const MyShopsListSchema = z
  .object({ items: z.array(PublicShopSchema) })
  .meta({ id: 'MyShopsList' });

export type MyShopsList = z.infer<typeof MyShopsListSchema>;
