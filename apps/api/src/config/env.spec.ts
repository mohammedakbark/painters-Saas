import { EnvValidationError, validateEnv } from './env.js';

const VALID_DATABASE_URL =
  'postgresql://user:not-a-real-password@localhost:5432/paintshop_dev';

describe('validateEnv', () => {
  it('returns typed values for a valid environment', () => {
    expect(
      validateEnv({
        NODE_ENV: 'production',
        PORT: '8080',
        DATABASE_URL: VALID_DATABASE_URL,
      }),
    ).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      DATABASE_URL: VALID_DATABASE_URL,
    });
  });

  it('defaults NODE_ENV to development and PORT to 3000', () => {
    expect(validateEnv({ DATABASE_URL: VALID_DATABASE_URL })).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
    });
  });

  it('treats blank values as missing', () => {
    expect(() => validateEnv({ DATABASE_URL: '   ' })).toThrow(
      'DATABASE_URL is required.',
    );
  });

  it.each(['0', '65536', '3000.5', 'abc'])('rejects PORT=%s', (port) => {
    expect(() =>
      validateEnv({ PORT: port, DATABASE_URL: VALID_DATABASE_URL }),
    ).toThrow(/PORT must be an integer/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() =>
      validateEnv({ NODE_ENV: 'staging', DATABASE_URL: VALID_DATABASE_URL }),
    ).toThrow(/NODE_ENV must be one of/);
  });

  it('rejects a non-Postgres DATABASE_URL', () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /DATABASE_URL must be a postgres/,
    );
  });

  it('reports every problem at once', () => {
    try {
      validateEnv({ NODE_ENV: 'staging', PORT: 'abc' });
      expect.unreachable('validateEnv should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).problems).toHaveLength(3);
    }
  });

  it('never includes the DATABASE_URL value in the error message', () => {
    const secretLookingUrl = 'mysql://admin:super-secret@db.internal/prod';
    expect(() => validateEnv({ DATABASE_URL: secretLookingUrl })).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining('super-secret'),
      }),
    );
  });
});
