'use client';

import {
  type ReactNode,
  useActionState,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { AuthMode, OtpFormState } from '@/lib/auth/otp';
import { formatIndianMobile } from '@/lib/phone';

export type OtpAction = (
  previous: OtpFormState,
  formData: FormData,
) => Promise<OtpFormState>;

const INITIAL_STATE: OtpFormState = { step: 'phone', phoneInput: '' };

/** Seconds before another code can be requested (Supabase rate limit). */
export const RESEND_WAIT_SECONDS = 60;

function formatWait(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Counts down from RESEND_WAIT_SECONDS from mount. The code step remounts
 * (React key) for every code sent, which restarts it.
 */
function useCountdown(): number {
  const [left, setLeft] = useState(RESEND_WAIT_SECONDS);
  useEffect(() => {
    const timer = setInterval(
      () => setLeft((value) => (value > 0 ? value - 1 : 0)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  return left;
}

export function OtpSignInForm({
  action,
  mode = 'sign-in',
}: {
  action: OtpAction;
  mode?: AuthMode;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const modeInput = <input type="hidden" name="mode" value={mode} />;

  if (state.step === 'phone') {
    return (
      <form action={formAction} noValidate className="flex flex-col gap-5">
        {modeInput}
        <Field
          label="Mobile number"
          name="phone"
          type="tel"
          prefix="+91"
          autoComplete="tel-national"
          inputMode="tel"
          required
          description="We'll send a 6-digit code to this number."
          placeholder="98765 43210"
          defaultValue={state.phoneInput.replace(/^\+91\s*/, '')}
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
    <CodeStep
      key={state.sentAt ?? 'code'}
      state={state}
      formAction={formAction}
      pending={pending}
      mode={mode}
      modeInput={modeInput}
    />
  );
}

function CodeStep({
  state,
  formAction,
  pending,
  mode,
  modeInput,
}: {
  state: Extract<OtpFormState, { step: 'code' }>;
  formAction: (formData: FormData) => void;
  pending: boolean;
  mode: AuthMode;
  modeInput: ReactNode;
}) {
  const verifyButton = useRef<HTMLButtonElement>(null);
  const waitLeft = useCountdown();

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {modeInput}
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
        autoFocus
        description={`Sent to ${formatIndianMobile(state.phone)}.`}
        error={state.error}
        className="text-center text-heading2 font-semibold tracking-[0.5em] tabular-nums"
        onChange={(event) => {
          const digits = event.currentTarget.value.replace(/\D/g, '');
          if (digits.length === 6 && !pending) {
            event.currentTarget.form?.requestSubmit(verifyButton.current);
          }
        }}
      />
      <Button
        ref={verifyButton}
        type="submit"
        name="intent"
        value="verify"
        pending={pending}
        pendingLabel="Checking…"
      >
        {mode === 'register' ? 'Verify and continue' : 'Sign in'}
      </Button>
      <div className="flex flex-wrap items-center justify-center gap-x-2">
        <Button
          type="submit"
          variant="tertiary"
          name="intent"
          value="change"
          disabled={pending}
        >
          Change number
        </Button>
        <Button
          type="submit"
          variant="tertiary"
          name="intent"
          value="resend"
          disabled={pending || waitLeft > 0}
        >
          {waitLeft > 0
            ? `Resend code in ${formatWait(waitLeft)}`
            : 'Resend code'}
        </Button>
      </div>
    </form>
  );
}
