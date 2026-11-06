'use server';

import { redirect } from 'next/navigation';
import {
  afterVerifyPath,
  isOtpCode,
  OTP_MESSAGES,
  type OtpFormState,
  otpRequestErrorMessage,
  otpVerifyErrorMessage,
  parseAuthMode,
} from '@/lib/auth/otp';
import { formatIndianMobile, parseIndianMobile } from '@/lib/phone';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Two-step mobile OTP sign-in for shop owners and staff. The account is
 * created on first sign-in (shops self-register, D-024). Intents:
 * `request` (send a code), `verify`, `resend` and `change` (edit the number).
 * `mode` (`sign-in` | `register`, WEB-002) only chooses where to go after
 * the code is verified; it is mapped to a fixed path, never used as a URL.
 */
export async function otpSignIn(
  previous: OtpFormState,
  formData: FormData,
): Promise<OtpFormState> {
  const intent = String(formData.get('intent') ?? 'request');

  if (intent === 'request') {
    const phoneInput = String(formData.get('phone') ?? '');
    const phone = parseIndianMobile(phoneInput);
    if (!phone) {
      return { step: 'phone', phoneInput, error: OTP_MESSAGES.invalidPhone };
    }
    const error = await sendCode(phone);
    return error
      ? { step: 'phone', phoneInput, error }
      : {
          step: 'code',
          phone,
          notice: codeSentNotice(phone),
          sentAt: Date.now(),
        };
  }

  // Errors on the code step keep the time of the last code sent.
  const sentAt = previous.step === 'code' ? previous.sentAt : undefined;

  // The remaining intents act on the number from step 1, re-validated here.
  const phone = parseIndianMobile(String(formData.get('phone') ?? ''));
  if (!phone) {
    return { step: 'phone', phoneInput: '', error: OTP_MESSAGES.invalidPhone };
  }

  if (intent === 'change') {
    return { step: 'phone', phoneInput: formatIndianMobile(phone) };
  }

  if (intent === 'resend') {
    const error = await sendCode(phone);
    return error
      ? { step: 'code', phone, error, sentAt }
      : {
          step: 'code',
          phone,
          notice: `We sent a new code to ${formatIndianMobile(phone)}.`,
          sentAt: Date.now(),
        };
  }

  const code = String(formData.get('code') ?? '').trim();
  if (!isOtpCode(code)) {
    return { step: 'code', phone, error: OTP_MESSAGES.invalidCode, sentAt };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: code,
    type: 'sms',
  });
  if (error || !data.session) {
    return {
      step: 'code',
      phone,
      error: otpVerifyErrorMessage(error),
      sentAt,
    };
  }
  redirect(afterVerifyPath(parseAuthMode(formData.get('mode'))));
}

async function sendCode(phone: string): Promise<string | undefined> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: true, channel: 'sms' },
  });
  return error ? otpRequestErrorMessage(error) : undefined;
}

function codeSentNotice(phone: string): string {
  return `We sent a 6-digit code to ${formatIndianMobile(phone)}.`;
}
