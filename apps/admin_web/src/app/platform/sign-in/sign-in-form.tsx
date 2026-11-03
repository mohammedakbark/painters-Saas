'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { SignInFormState } from '@/lib/auth/sign-in';

export type SignInAction = (
  previous: SignInFormState,
  formData: FormData,
) => Promise<SignInFormState>;

const INITIAL_STATE: SignInFormState = { email: '' };

export function SignInForm({ action }: { action: SignInAction }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError ? (
        <Alert tone="error" title="Sign-in failed">
          {state.formError}
        </Alert>
      ) : null}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        required
        defaultValue={state.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <Button type="submit" pending={pending} pendingLabel="Signing in…">
        Sign in
      </Button>
    </form>
  );
}
