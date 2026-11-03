import { z } from 'zod';

export const SIGN_IN_MESSAGES = {
  invalidCredentials: 'Email or password is incorrect.',
  rateLimited: 'Too many sign-in attempts. Wait a few minutes and try again.',
  unavailable: "We couldn't sign you in right now. Try again in a moment.",
  noPlatformAccess: "This account doesn't have platform access.",
} as const;

export const platformSignInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: 'Enter your email address.' })
    .pipe(z.email({ error: 'Enter a valid email address.' })),
  password: z.string().min(1, { error: 'Enter your password.' }),
});

export type PlatformSignInInput = z.infer<typeof platformSignInSchema>;

export interface SignInFormState {
  /** Echoed back so the field keeps its value after a failed attempt. */
  email: string;
  formError?: string;
  fieldErrors?: Partial<Record<keyof PlatformSignInInput, string>>;
}

export function fieldErrorsFrom(
  error: z.ZodError<PlatformSignInInput>,
): SignInFormState['fieldErrors'] {
  const fieldErrors: SignInFormState['fieldErrors'] = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if ((field === 'email' || field === 'password') && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * Maps a Supabase Auth error to a message safe to show. Wrong email and wrong
 * password get the same message so the form does not reveal which accounts
 * exist.
 */
export function signInErrorMessage(
  error: { code?: string; status?: number } | null,
): string {
  if (error?.code === 'invalid_credentials') {
    return SIGN_IN_MESSAGES.invalidCredentials;
  }
  if (error?.status === 429 || error?.code === 'over_request_rate_limit') {
    return SIGN_IN_MESSAGES.rateLimited;
  }
  return SIGN_IN_MESSAGES.unavailable;
}
