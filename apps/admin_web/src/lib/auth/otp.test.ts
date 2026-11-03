import { describe, expect, it } from 'vitest';
import {
  isOtpCode,
  OTP_MESSAGES,
  otpRequestErrorMessage,
  otpVerifyErrorMessage,
} from './otp';

describe('otpRequestErrorMessage', () => {
  it.each([
    [{ code: 'over_sms_send_rate_limit', status: 429 }],
    [{ code: 'over_request_rate_limit' }],
    [{ status: 429 }],
  ])('asks the user to wait for %j', (error) => {
    expect(otpRequestErrorMessage(error)).toBe(OTP_MESSAGES.waitBeforeResend);
  });

  it('explains a failed SMS', () => {
    expect(otpRequestErrorMessage({ code: 'sms_send_failed' })).toBe(
      OTP_MESSAGES.sendFailed,
    );
  });

  it('falls back to a generic message', () => {
    expect(otpRequestErrorMessage(null)).toBe(OTP_MESSAGES.unavailable);
  });
});

describe('otpVerifyErrorMessage', () => {
  it.each([[{ code: 'otp_expired', status: 403 }], [{ status: 403 }]])(
    'reports a wrong or expired code for %j',
    (error) => {
      expect(otpVerifyErrorMessage(error)).toBe(OTP_MESSAGES.wrongCode);
    },
  );

  it('reports too many attempts', () => {
    expect(otpVerifyErrorMessage({ status: 429 })).toBe(
      OTP_MESSAGES.tooManyAttempts,
    );
  });

  it('falls back to a generic message', () => {
    expect(otpVerifyErrorMessage({ code: 'unexpected_failure' })).toBe(
      OTP_MESSAGES.unavailable,
    );
  });
});

describe('isOtpCode', () => {
  it.each([
    ['123456', true],
    ['12345', false],
    ['1234567', false],
    ['12a456', false],
  ])('%s → %s', (value, expected) => {
    expect(isOtpCode(value)).toBe(expected);
  });
});
