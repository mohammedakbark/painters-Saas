import { z } from 'zod';
import {
  PlatformRole,
  ShopRole,
  ShopStatus,
} from '../generated/prisma/enums.js';

export const MeResponseSchema = z
  .object({
    id: z.uuid(),
    email: z.email().nullable(),
    phone: z
      .string()
      .nullable()
      .meta({ description: 'E.164, for example +919999900001.' }),
    displayName: z.string().nullable(),
    platformRole: z
      .enum(PlatformRole)
      .nullable()
      .meta({ description: 'Null unless the caller is a platform admin.' }),
    shopMemberships: z
      .array(
        z.object({
          shopId: z.uuid(),
          shopName: z.string(),
          shopStatus: z.enum(ShopStatus),
          role: z.enum(ShopRole),
        }),
      )
      .meta({ description: 'Shops the caller belongs to, most recent first.' }),
  })
  .meta({ id: 'MeResponse' });

export type MeResponse = z.infer<typeof MeResponseSchema>;
