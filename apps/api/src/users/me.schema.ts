import { z } from 'zod';
import { PlatformRole } from '../generated/prisma/enums.js';

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
  })
  .meta({ id: 'MeResponse' });

export type MeResponse = z.infer<typeof MeResponseSchema>;
