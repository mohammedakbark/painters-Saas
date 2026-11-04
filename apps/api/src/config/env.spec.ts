import { EnvValidationError, validateEnv } from './env.js';

const VALID_DATABASE_URL =
  'postgresql://user:not-a-real-password@localhost:5432/paintshop_dev';

/** A complete, valid environment for local development. */
const VALID = {
  DATABASE_URL: VALID_DATABASE_URL,
  AUTH_ISSUER: 'http://127.0.0.1:54321/auth/v1',
  AUTH_JWKS_URL: 'http://127.0.0.1:54321/auth/v1/.well-known/jwks.json',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SECRET_KEY: 'sb_secret_placeholder',
  STORAGE_S3_ENDPOINT: 'http://127.0.0.1:54321/storage/v1/s3',
  STORAGE_S3_REGION: 'local',
  STORAGE_S3_ACCESS_KEY_ID: 'access-key-placeholder',
  STORAGE_S3_SECRET_ACCESS_KEY: 'secret-placeholder',
  STORAGE_BUCKET: 'shop-media',
  STORAGE_PUBLIC_BASE_URL:
    'http://127.0.0.1:54321/storage/v1/object/public/shop-media',
} as const;

const PRODUCTION_URLS = {
  AUTH_ISSUER: 'https://example.supabase.co/auth/v1',
  AUTH_JWKS_URL: 'https://example.supabase.co/auth/v1/.well-known/jwks.json',
  SUPABASE_URL: 'https://example.supabase.co',
  STORAGE_S3_ENDPOINT: 'https://example.supabase.co/storage/v1/s3',
  STORAGE_PUBLIC_BASE_URL:
    'https://example.supabase.co/storage/v1/object/public/shop-media',
} as const;

function problemsOf(raw: Record<string, unknown>): readonly string[] {
  try {
    validateEnv(raw);
  } catch (error) {
    expect(error).toBeInstanceOf(EnvValidationError);
    return (error as EnvValidationError).problems;
  }
  return expect.unreachable('validateEnv should have thrown');
}

describe('validateEnv', () => {
  it('returns typed values for a valid environment', () => {
    expect(
      validateEnv({
        ...VALID,
        ...PRODUCTION_URLS,
        NODE_ENV: 'production',
        PORT: '8080',
        AUTH_AUDIENCE: 'authenticated',
      }),
    ).toEqual({
      ...VALID,
      ...PRODUCTION_URLS,
      NODE_ENV: 'production',
      PORT: 8080,
      AUTH_AUDIENCE: 'authenticated',
      STORAGE_S3_FORCE_PATH_STYLE: true,
    });
  });

  it('defaults NODE_ENV, PORT and AUTH_AUDIENCE', () => {
    expect(validateEnv(VALID)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      AUTH_AUDIENCE: 'authenticated',
    });
  });

  it('ignores unrelated variables', () => {
    expect(validateEnv({ ...VALID, PATH: '/usr/bin' })).not.toHaveProperty(
      'PATH',
    );
  });

  it('treats blank values as missing', () => {
    expect(problemsOf({ ...VALID, DATABASE_URL: '   ' })).toEqual([
      'DATABASE_URL is required.',
    ]);
  });

  it.each(['0', '65536', '3000.5', 'abc'])('rejects PORT=%s', (port) => {
    expect(problemsOf({ ...VALID, PORT: port })).toEqual([
      'PORT must be an integer between 1 and 65535.',
    ]);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(problemsOf({ ...VALID, NODE_ENV: 'staging' })[0]).toMatch(
      /NODE_ENV must be one of/,
    );
  });

  it('rejects a non-Postgres DATABASE_URL', () => {
    expect(
      problemsOf({ ...VALID, DATABASE_URL: 'mysql://localhost/db' })[0],
    ).toMatch(/DATABASE_URL must be a postgres/);
  });

  it.each([
    'AUTH_ISSUER',
    'AUTH_JWKS_URL',
    'SUPABASE_URL',
    'STORAGE_S3_ENDPOINT',
    'STORAGE_PUBLIC_BASE_URL',
  ])('rejects a non-http %s', (name) => {
    expect(problemsOf({ ...VALID, [name]: 'ftp://example.com' })).toEqual([
      `${name} must be an http(s) URL.`,
    ]);
  });

  it('requires https for auth, Supabase and storage URLs in production', () => {
    expect(problemsOf({ ...VALID, NODE_ENV: 'production' })).toEqual([
      'AUTH_ISSUER must use https:// in production.',
      'AUTH_JWKS_URL must use https:// in production.',
      'SUPABASE_URL must use https:// in production.',
      'STORAGE_S3_ENDPOINT must use https:// in production.',
      'STORAGE_PUBLIC_BASE_URL must use https:// in production.',
    ]);
  });

  it('reads the path-style flag and validates the bucket name', () => {
    expect(
      validateEnv({ ...VALID, STORAGE_S3_FORCE_PATH_STYLE: 'false' })
        .STORAGE_S3_FORCE_PATH_STYLE,
    ).toBe(false);
    expect(
      problemsOf({ ...VALID, STORAGE_S3_FORCE_PATH_STYLE: 'yes' }),
    ).toEqual(['STORAGE_S3_FORCE_PATH_STYLE must be true or false.']);
    expect(problemsOf({ ...VALID, STORAGE_BUCKET: 'Shop_Media' })).toEqual([
      'STORAGE_BUCKET must be a valid bucket name.',
    ]);
  });

  it('reports every problem at once', () => {
    expect(problemsOf({ NODE_ENV: 'staging', PORT: 'abc' })).toHaveLength(13);
  });

  it('never includes secret values in the error message', () => {
    const secretLookingUrl = 'mysql://admin:super-secret@db.internal/prod';
    expect(() =>
      validateEnv({
        ...VALID,
        DATABASE_URL: secretLookingUrl,
        SUPABASE_URL: 'not a url sb_secret_leak',
      }),
    ).toThrow(
      expect.objectContaining({
        message: expect.not.stringMatching(/super-secret|sb_secret_leak/),
      }),
    );
  });
});
