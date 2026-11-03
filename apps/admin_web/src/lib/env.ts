import 'server-only';
import { z } from 'zod';

// Server-only configuration. None of these values are NEXT_PUBLIC_: sign-in
// runs in Server Actions, so the browser never needs the Supabase client and
// no auth configuration reaches the client bundle.
const serverEnvSchema = z.object({
  /** Supabase project URL, e.g. http://127.0.0.1:54321 locally. */
  SUPABASE_URL: z.url({ error: 'SUPABASE_URL must be a URL.' }),
  /** Publishable (anon) key. Not a secret, but kept server-side anyway. */
  SUPABASE_PUBLISHABLE_KEY: z
    .string({ error: 'SUPABASE_PUBLISHABLE_KEY is required.' })
    .min(1, { error: 'SUPABASE_PUBLISHABLE_KEY is required.' }),
  /** Base URL of the NestJS API, called only from the server. */
  API_BASE_URL: z.url({ error: 'API_BASE_URL must be a URL.' }),
});

export type ServerEnv = z.output<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Validated on first use (request time), so builds do not need these values. */
export function serverEnv(): ServerEnv {
  if (cached) {
    return cached;
  }
  const result = serverEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    API_BASE_URL: process.env.API_BASE_URL,
  });
  if (!result.success) {
    // Messages name the variable only; values are never echoed.
    throw new Error(
      `Invalid admin_web configuration: ${result.error.issues
        .map((issue) => issue.message)
        .join(' ')}`,
    );
  }
  cached = result.data;
  return cached;
}
