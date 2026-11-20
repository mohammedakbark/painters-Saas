import { z } from 'zod';

export const MAX_ACTIVE_LOCATIONS = 20;

/** India only, like the shop and site pins. */
const pin = z.object(
  {
    latitude: z
      .number({ error: 'Choose the place on the map.' })
      .min(6, { error: 'The place must be in India.' })
      .max(38, { error: 'The place must be in India.' }),
    longitude: z
      .number({ error: 'Choose the place on the map.' })
      .min(68, { error: 'The place must be in India.' })
      .max(98, { error: 'The place must be in India.' }),
  },
  { error: 'Choose the place on the map.' },
);

const fields = {
  label: z
    .string({ error: 'Enter a name for this place, such as Home.' })
    .trim()
    .min(1, { error: 'Enter a name for this place, such as Home.' })
    .max(40, { error: 'The name can be at most 40 characters.' }),
  address: z
    .string({ error: 'Enter the house or business name and place.' })
    .trim()
    .min(5, { error: 'Enter the house or business name and place.' })
    .max(300, { error: 'The address can be at most 300 characters.' }),
  pin,
};

/** A saved delivery place (CUS-006, D-061): the map pin is required (D-049). */
export const CreateDeliveryLocationRequestSchema = z
  .object({ label: fields.label, address: fields.address, pin: fields.pin })
  .meta({ id: 'CreateDeliveryLocationRequest' });

export type CreateDeliveryLocationRequest = z.infer<
  typeof CreateDeliveryLocationRequestSchema
>;

export const UpdateDeliveryLocationRequestSchema = z
  .object({
    label: fields.label.optional(),
    address: fields.address.optional(),
    pin: fields.pin.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Nothing to change.',
  })
  .meta({ id: 'UpdateDeliveryLocationRequest' });

export type UpdateDeliveryLocationRequest = z.infer<
  typeof UpdateDeliveryLocationRequestSchema
>;

export const DeliveryLocationSchema = z
  .object({
    id: z.uuid(),
    label: z.string(),
    address: z.string(),
    pin: z.object({ latitude: z.number(), longitude: z.number() }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'DeliveryLocation' });

export type DeliveryLocation = z.infer<typeof DeliveryLocationSchema>;

export const DeliveryLocationListSchema = z
  .object({ items: z.array(DeliveryLocationSchema) })
  .meta({ id: 'DeliveryLocationList' });

export type DeliveryLocationList = z.infer<typeof DeliveryLocationListSchema>;
