import { describe, expect, it } from 'vitest';
import {
  fieldErrorsFrom,
  platformSignInSchema,
  SIGN_IN_MESSAGES,
  signInErrorMessage,
} from './sign-in';

describe('platformSignInSchema', () => {
  it('trims and lower-cases the email', () => {
    expect(
      platformSignInSchema.parse({
        email: '  Admin@Example.COM ',
        password: 'x',
      }),
    ).toEqual({ email: 'admin@example.com', password: 'x' });
  });

  it.each([
    [
      { email: '', password: '' },
      { email: 'Enter your email address.', password: 'Enter your password.' },
    ],
    [
      { email: 'not-an-email', password: 'x' },
      { email: 'Enter a valid email address.' },
    ],
  ])('reports one message per field for %j', (input, expected) => {
    const result = platformSignInSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(fieldErrorsFrom(result.error!)).toEqual(expected);
  });
});

describe('signInErrorMessage', () => {
  it('uses one message for a wrong email or password', () => {
    expect(
      signInErrorMessage({ code: 'invalid_credentials', status: 400 }),
    ).toBe(SIGN_IN_MESSAGES.invalidCredentials);
  });

  it.each([[{ status: 429 }], [{ code: 'over_request_rate_limit' }]])(
    'reports rate limiting for %j',
    (error) => {
      expect(signInErrorMessage(error)).toBe(SIGN_IN_MESSAGES.rateLimited);
    },
  );

  it.each([[null], [{ code: 'unexpected_failure', status: 500 }]])(
    'falls back to a generic message for %j',
    (error) => {
      expect(signInErrorMessage(error)).toBe(SIGN_IN_MESSAGES.unavailable);
    },
  );
});
