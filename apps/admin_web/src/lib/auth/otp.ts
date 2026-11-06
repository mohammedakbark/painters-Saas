/** State of the two-step mobile OTP sign-in form. */
export type OtpFormState =
  | { step: 'phone'; phoneInput: string; error?: string }
  | {
      step: 'code';
      /** E.164; the number the code was sent to. */
      phone: string;
      error?: string;
      notice?: string;
    };

export const OTP_MESSAGES = {
  invalidPhone: 'Enter a 10-digit Indian mobile number.',
  invalidCode: 'Enter the 6-digit code.',
  wrongCode: 'That code is incorrect or has expired.',
  waitBeforeResend: 'Wait a minute before requesting another code.',
  sendFailed: "We couldn't send a code to this number. Check it and try again.",
  tooManyAttempts: 'Too many attempts. Wait a few minutes and try again.',
  unavailable: "We couldn't sign you in right now. Try again in a moment.",
} as const;

type AuthErrorLike = { code?: string; status?: number } | null;

/** Message for a failed "send code" request (Supabase signInWithOtp). */
export function otpRequestErrorMessage(error: AuthErrorLike): string {
  if (
    error?.code === 'over_sms_send_rate_limit' ||
    error?.code === 'over_request_rate_limit' ||
    error?.status === 429
  ) {
    return OTP_MESSAGES.waitBeforeResend;
  }
  if (error?.code === 'sms_send_failed') {
    return OTP_MESSAGES.sendFailed;
  }
  return OTP_MESSAGES.unavailable;
}

/** Message for a failed code verification (Supabase verifyOtp). */
export function otpVerifyErrorMessage(error: AuthErrorLike): string {
  if (error?.code === 'otp_expired' || error?.status === 403) {
    return OTP_MESSAGES.wrongCode;
  }
  if (error?.code === 'over_request_rate_limit' || error?.status === 429) {
    return OTP_MESSAGES.tooManyAttempts;
  }
  return OTP_MESSAGES.unavailable;
}

export function isOtpCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

/** Which entry the visitor came from: `/sign-in` or `/register` (WEB-002). */
export type AuthMode = 'sign-in' | 'register';

/** Reads the form's mode. Anything unexpected counts as signing in. */
export function parseAuthMode(value: unknown): AuthMode {
  return value === 'register' ? 'register' : 'sign-in';
}

/**
 * Where to go once the code is verified: registering continues to the shop
 * details; signing in opens the shop list (which offers registration when
 * the account has no shop yet). Fixed paths only, never from the form.
 */
export function afterVerifyPath(mode: AuthMode): '/shops' | '/shops/new' {
  return mode === 'register' ? '/shops/new' : '/shops';
}
