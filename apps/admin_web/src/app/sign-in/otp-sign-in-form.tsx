'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { OtpFormState } from '@/lib/auth/otp';
import { formatIndianMobile } from '@/lib/phone';

export type OtpAction = (
  previous: OtpFormState,
  formData: FormData,
) => Promise<OtpFormState>;

const INITIAL_STATE: OtpFormState = { step: 'phone', phoneInput: '' };

export function OtpSignInForm({ action }: { action: OtpAction }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  if (state.step === 'phone') {
    return (
      <form action={formAction} noValidate className="flex flex-col gap-5">
        <Field
          label="Mobile number"
          name="phone"
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          required
          description="Indian mobile number. We will send you a 6-digit code."
          placeholder="98765 43210"
          defaultValue={state.phoneInput}
          error={state.error}
        />
        <Button
          type="submit"
          name="intent"
          value="request"
          pending={pending}
          pendingLabel="Sending code…"
        >
          Send code
        </Button>
      </form>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="phone" value={state.phone} />
      {state.notice ? (
        <Alert tone="info" title="Code sent">
          {state.notice}
        </Alert>
      ) : null}
      <Field
        label="6-digit code"
        name="code"
        type="text"
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        description={`Sent to ${formatIndianMobile(state.phone)}.`}
        error={state.error}
      />
      <Button
        type="submit"
        name="intent"
        value="verify"
        pending={pending}
        pendingLabel="Checking…"
      >
        Sign in
      </Button>
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="secondary"
          name="intent"
          value="resend"
          disabled={pending}
        >
          Resend code
        </Button>
        <Button
          type="submit"
          variant="secondary"
          name="intent"
          value="change"
          disabled={pending}
        >
          Use a different number
        </Button>
      </div>
    </form>
  );
}
