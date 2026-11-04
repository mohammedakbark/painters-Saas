import { z } from 'zod';
import { parseIndianMobile } from '../common/phone/indian-mobile.js';
import { ShopLocationSource, ShopStatus } from '../generated/prisma/enums.js';
import { INDIAN_STATE_CODES } from './indian-states.js';

// Limits match the CHECK constraints in the SHP-003 migration.

function requiredText(label: string, max: number) {
  return z
    .string({ error: `Enter the ${label}.` })
    .trim()
    .min(1, { error: `Enter the ${label}.` })
    .max(max, { error: `The ${label} must be at most ${max} characters.` });
}

/** Optional text: omitted, null or blank all mean "not set". */
function optionalText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, { error: `The ${label} must be at most ${max} characters.` })
    .nullable()
    .optional();
}

export const ShopAddressInputSchema = z
  .object({
    line1: requiredText('shop number, building and street', 200),
    line2: optionalText('area or locality', 200),
    landmark: optionalText('landmark', 120),
    city: requiredText('city or town', 80),
    district: requiredText('district', 80),
    stateCode: z.enum(INDIAN_STATE_CODES, { error: 'Choose the state.' }),
    postalCode: z
      .string({ error: 'Enter the 6-digit PIN code.' })
      .trim()
      .regex(/^[1-9]\d{5}$/, { error: 'Enter the 6-digit PIN code.' }),
  })
  .meta({ id: 'ShopAddressInput' });

/** India's bounding box (initial market; CHECK constraint in the migration). */
const LATITUDE = { min: 6, max: 38 } as const;
const LONGITUDE = { min: 68, max: 98 } as const;
const OUTSIDE_INDIA = 'The location must be in India.';

export const ShopLocationInputSchema = z
  .object({
    latitude: z
      .number({ error: 'Choose the shop location.' })
      .min(LATITUDE.min, { error: OUTSIDE_INDIA })
      .max(LATITUDE.max, { error: OUTSIDE_INDIA }),
    longitude: z
      .number({ error: 'Choose the shop location.' })
      .min(LONGITUDE.min, { error: OUTSIDE_INDIA })
      .max(LONGITUDE.max, { error: OUTSIDE_INDIA }),
    source: z.enum(ShopLocationSource, {
      error: 'Say how the location was chosen.',
    }),
  })
  .meta({ id: 'ShopLocationInput' });

export type ShopLocationInput = z.infer<typeof ShopLocationInputSchema>;

export const UpdateShopProfileRequestSchema = z
  .object({
    supportPhone: z
      .string({ error: 'Enter the support mobile number.' })
      .refine((value) => parseIndianMobile(value) !== null, {
        error: 'Enter a 10-digit Indian mobile number.',
      })
      .nullable()
      .meta({
        description:
          'Customer-support mobile (Indian). Null clears it. Stored as E.164.',
      }),
    address: ShopAddressInputSchema.nullable().meta({
      description: 'The full address, or null to clear it.',
    }),
    location: ShopLocationInputSchema.optional().meta({
      description: 'Omit to keep the current location.',
    }),
  })
  .meta({ id: 'UpdateShopProfileRequest' });

export type UpdateShopProfileRequest = z.infer<
  typeof UpdateShopProfileRequestSchema
>;

export const ShopProfileResponseSchema = z
  .object({
    shopId: z.uuid(),
    shopName: z.string(),
    status: z.enum(ShopStatus),
    supportPhone: z
      .string()
      .nullable()
      .meta({ description: 'E.164, for example +919876543210.' }),
    address: z
      .object({
        line1: z.string(),
        line2: z.string().nullable(),
        landmark: z.string().nullable(),
        city: z.string(),
        district: z.string(),
        stateCode: z.string(),
        stateName: z.string(),
        postalCode: z.string(),
      })
      .nullable(),
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        source: z.enum(ShopLocationSource),
        updatedAt: z.iso.datetime(),
      })
      .nullable(),
    photo: z
      .object({
        url: z.url().meta({ description: 'WebP, at most 1600 px.' }),
        thumbUrl: z.url().meta({ description: 'WebP, at most 480 px.' }),
        updatedAt: z.iso.datetime(),
      })
      .nullable(),
    updatedAt: z.iso
      .datetime()
      .nullable()
      .meta({ description: 'When the profile was last changed.' }),
  })
  .meta({ id: 'ShopProfile' });

export type ShopProfileResponse = z.infer<typeof ShopProfileResponseSchema>;

/** Checklist items (D-012). */
export const OnboardingItemKey = z.enum([
  'address',
  'location',
  'support_phone',
  'photo',
  'products',
]);

export const ShopOnboardingResponseSchema = z
  .object({
    items: z.array(
      z.object({
        key: OnboardingItemKey,
        done: z.boolean(),
        progress: z
          .object({ current: z.int(), required: z.int() })
          .optional()
          .meta({
            description:
              'Counted items, for example active products with a pack size.',
          }),
      }),
    ),
  })
  .meta({ id: 'ShopOnboarding' });

export type ShopOnboardingResponse = z.infer<
  typeof ShopOnboardingResponseSchema
>;
