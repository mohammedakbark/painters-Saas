import 'server-only';
import { z } from 'zod';
import { apiRequest } from './client';

// Mirrors MeResponse in packages/api_contracts/openapi.json.
const meSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  displayName: z.string().nullable(),
  platformRole: z.enum(['SUPER_ADMIN']).nullable(),
});

export type Me = z.infer<typeof meSchema>;

export function getMe(token: string): Promise<Me> {
  return apiRequest('/v1/me', { token, schema: meSchema });
}
