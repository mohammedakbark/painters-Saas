import { z } from 'zod';

// Limits match the CHECK constraints in the SHP-008 migrations.

export const DELIVERY_LIMITS = {
  maxChargePaise: 1_000_000,
  minFreeAbovePaise: 100,
  maxFreeAbovePaise: 1_000_000_000,
  minRadiusKm: 1,
  maxRadiusKm: 50,
} as const;

export const ORDER_MESSAGE_LIMITS = { max: 10, minLength: 2, maxLength: 160 };

export const UpdateDeliverySettingsRequestSchema = z
  .object({
    enabled: z.boolean({ error: 'enabled must be true or false.' }),
    chargePaise: z
      .int({ error: 'Enter the delivery charge in paise.' })
      .min(0, { error: 'The delivery charge cannot be negative.' })
      .max(DELIVERY_LIMITS.maxChargePaise, {
        error: 'The delivery charge can be at most ₹10,000.',
      })
      .nullable(),
    freeAbovePaise: z
      .int({ error: 'Enter the free delivery amount in paise.' })
      .min(DELIVERY_LIMITS.minFreeAbovePaise, {
        error: 'The free delivery amount must be at least ₹1.',
      })
      .max(DELIVERY_LIMITS.maxFreeAbovePaise, {
        error: 'The free delivery amount is too large.',
      })
      .nullable(),
    radiusKm: z
      .int({ error: 'Enter the delivery distance in whole km.' })
      .min(DELIVERY_LIMITS.minRadiusKm, {
        error: 'The delivery distance must be at least 1 km.',
      })
      .max(DELIVERY_LIMITS.maxRadiusKm, {
        error: 'The delivery distance can be at most 50 km.',
      })
      .nullable(),
  })
  .superRefine((value, context) => {
    if (!value.enabled) {
      return;
    }
    if (value.chargePaise === null) {
      context.addIssue({
        code: 'custom',
        path: ['chargePaise'],
        message: 'Enter the delivery charge (0 for free delivery).',
      });
    }
    if (value.radiusKm === null) {
      context.addIssue({
        code: 'custom',
        path: ['radiusKm'],
        message: 'Enter how far you deliver, in km.',
      });
    }
  })
  .meta({ id: 'UpdateDeliverySettingsRequest' });

const orderMessage = z
  .string({ error: 'Enter the message.' })
  .trim()
  .min(ORDER_MESSAGE_LIMITS.minLength, {
    error: 'Each message needs at least 2 characters.',
  })
  .max(ORDER_MESSAGE_LIMITS.maxLength, {
    error: 'Each message can be at most 160 characters.',
  });

export const UpdateOrderMessagesRequestSchema = z
  .object({
    messages: z
      .array(orderMessage)
      .max(ORDER_MESSAGE_LIMITS.max, {
        error: 'Keep at most 10 messages.',
      })
      .refine(
        (list) =>
          new Set(list.map((text) => text.toLowerCase())).size === list.length,
        { error: 'Each message must be different.' },
      ),
  })
  .meta({ id: 'UpdateOrderMessagesRequest' });

export const DeliverySettingsSchema = z
  .object({
    enabled: z.boolean(),
    chargePaise: z.int().nullable(),
    freeAbovePaise: z.int().nullable(),
    radiusKm: z.int().nullable(),
  })
  .meta({ id: 'DeliverySettings' });

export const ShopSettingsResponseSchema = z
  .object({
    shopId: z.uuid(),
    /** Pickup is always offered (D-046). */
    pickup: z.literal(true),
    delivery: DeliverySettingsSchema,
    /** Delivery needs the shop's map location (D-049). */
    hasLocation: z.boolean(),
    orderMessages: z.array(z.string()),
    updatedAt: z.iso.datetime().nullable(),
  })
  .meta({ id: 'ShopSettings' });

export type UpdateDeliverySettingsRequest = z.infer<
  typeof UpdateDeliverySettingsRequestSchema
>;
export type UpdateOrderMessagesRequest = z.infer<
  typeof UpdateOrderMessagesRequestSchema
>;
export type ShopSettingsResponse = z.infer<typeof ShopSettingsResponseSchema>;
