import { z } from 'zod';

export const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

const DEFAULT_PORT = 3000;
const MAX_PORT = 65_535;
const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);
const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

/** URLs that must use HTTPS when NODE_ENV=production. */
const HTTPS_IN_PRODUCTION = [
  'AUTH_ISSUER',
  'AUTH_JWKS_URL',
  'SUPABASE_URL',
  'STORAGE_S3_ENDPOINT',
  'STORAGE_PUBLIC_BASE_URL',
] as const;

/** S3 bucket naming rules (lower case, 3–63 characters). */
const BUCKET_NAME = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

// Every message is static: validation errors name the variable but never echo
// its value, because values such as DATABASE_URL and SUPABASE_SECRET_KEY are
// credentials.
const required = (name: string) => ({ error: `${name} is required.` });

const httpUrl = (name: string) =>
  z
    .string(required(name))
    .refine(isHttpUrl, { error: `${name} must be an http(s) URL.` });

const portMessage = `PORT must be an integer between 1 and ${MAX_PORT}.`;

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(NODE_ENVIRONMENTS, {
        error: `NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}.`,
      })
      .default('development'),
    PORT: z
      .string()
      .regex(/^\d+$/, { error: portMessage })
      .transform(Number)
      .refine((port) => port >= 1 && port <= MAX_PORT, { error: portMessage })
      .default(DEFAULT_PORT),
    DATABASE_URL: z.string(required('DATABASE_URL')).refine(isPostgresUrl, {
      error:
        'DATABASE_URL must be a postgres:// or postgresql:// connection URL.',
    }),
    /** Expected `iss` claim, e.g. http://127.0.0.1:54321/auth/v1 locally. */
    AUTH_ISSUER: httpUrl('AUTH_ISSUER'),
    /** JWKS endpoint used to verify access-token signatures (asymmetric keys only). */
    AUTH_JWKS_URL: httpUrl('AUTH_JWKS_URL'),
    /** Expected `aud` claim. Supabase Auth issues `authenticated`. */
    AUTH_AUDIENCE: z.string().default('authenticated'),
    /** Supabase project URL, used by the server-only Auth admin client. */
    SUPABASE_URL: httpUrl('SUPABASE_URL'),
    /** Server-only Supabase secret key. Never send it to any client. */
    SUPABASE_SECRET_KEY: z.string(required('SUPABASE_SECRET_KEY')),

    // Object storage for public images through the S3 protocol (ADR 0007):
    // local Supabase Storage, hosted Supabase Storage or Cloudflare R2 by
    // configuration only. The credentials are server-only.
    STORAGE_S3_ENDPOINT: httpUrl('STORAGE_S3_ENDPOINT'),
    STORAGE_S3_REGION: z.string(required('STORAGE_S3_REGION')),
    STORAGE_S3_ACCESS_KEY_ID: z.string(required('STORAGE_S3_ACCESS_KEY_ID')),
    STORAGE_S3_SECRET_ACCESS_KEY: z.string(
      required('STORAGE_S3_SECRET_ACCESS_KEY'),
    ),
    /** Path-style URLs (`endpoint/bucket/key`); Supabase Storage needs them. */
    STORAGE_S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'], {
        error: 'STORAGE_S3_FORCE_PATH_STYLE must be true or false.',
      })
      .default('true')
      .transform((value) => value === 'true'),
    STORAGE_BUCKET: z.string(required('STORAGE_BUCKET')).regex(BUCKET_NAME, {
      error: 'STORAGE_BUCKET must be a valid bucket name.',
    }),
    /** Public URL prefix of the bucket; image URLs are this plus the object key. */
    STORAGE_PUBLIC_BASE_URL: httpUrl('STORAGE_PUBLIC_BASE_URL'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') {
      return;
    }
    for (const name of HTTPS_IN_PRODUCTION) {
      if (!env[name].startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: `${name} must use https:// in production.`,
        });
      }
    }
  });

/** Validated runtime configuration. Read it through `ConfigService<Env, true>`. */
export type Env = z.output<typeof envSchema>;

export class EnvValidationError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid environment configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validates environment variables at startup so the API fails fast with a clear
 * message. Blank values count as missing. Unknown variables are ignored.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(trimmedStrings(raw));
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => issue.message),
    );
  }
  return result.data;
}

function trimmedStrings(raw: Record<string, unknown>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value.trim() !== '') {
      values[key] = value.trim();
    }
  }
  return values;
}

function isPostgresUrl(value: string): boolean {
  return hasProtocol(value, POSTGRES_PROTOCOLS);
}

function isHttpUrl(value: string): boolean {
  return hasProtocol(value, HTTP_PROTOCOLS);
}

function hasProtocol(value: string, protocols: ReadonlySet<string>): boolean {
  try {
    return protocols.has(new URL(value).protocol);
  } catch {
    return false;
  }
}
