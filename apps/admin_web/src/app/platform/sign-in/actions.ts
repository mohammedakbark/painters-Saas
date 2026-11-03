'use server';

import { redirect } from 'next/navigation';
import { getMe, type Me } from '@/lib/api/me';
import {
  fieldErrorsFrom,
  platformSignInSchema,
  SIGN_IN_MESSAGES,
  type SignInFormState,
  signInErrorMessage,
} from '@/lib/auth/sign-in';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Signs in with email + password, then asks the API whether the account is a
 * platform admin. Accounts without platform access are signed out again.
 */
export async function signInToPlatform(
  _previous: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  const input = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };
  const parsed = platformSignInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      email: input.email,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const { email } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.session) {
    return { email, formError: signInErrorMessage(error) };
  }

  let me: Me;
  try {
    me = await getMe(data.session.access_token);
  } catch {
    await supabase.auth.signOut({ scope: 'local' });
    return { email, formError: SIGN_IN_MESSAGES.unavailable };
  }
  if (me.platformRole !== 'SUPER_ADMIN') {
    await supabase.auth.signOut({ scope: 'local' });
    return { email, formError: SIGN_IN_MESSAGES.noPlatformAccess };
  }

  redirect('/platform');
}
