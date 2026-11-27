'use client';

import {
  type FormEvent,
  type ReactNode,
  startTransition,
  useActionState,
  useMemo,
} from 'react';
import { FormStatus } from '@/components/catalogue/form-status';
import type { FormAction } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { Field } from '@/components/ui/field';
import { RequiredFieldsNote } from '@/components/ui/field-label';
import { SelectField } from '@/components/ui/select-field';
import {
  SheetCancel,
  SideSheet,
  useCloseSheetOnSave,
} from '@/components/ui/side-sheet';
import { TextareaField } from '@/components/ui/textarea-field';
import { ID_TYPE_LABEL } from '@/lib/credit/labels';
import { formatRupees, paiseToInput } from '@/lib/money';

export const CREDIT_ID_SHEET = 'credit-id-check';
export const CREDIT_GIVE_SHEET = 'credit-give';
export const CREDIT_CHANGE_SHEET = 'credit-change';
export const CREDIT_STOP_SHEET = 'credit-stop';

/**
 * A credit form in a side sheet (D-051). One request key per attempt and a
 * new one only after a save, so a double click or a retry records once.
 */
function CreditForm({
  action,
  submitLabel,
  children,
}: {
  action: FormAction;
  submitLabel: string;
  children: (state: Awaited<ReturnType<FormAction>>) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const savedState = state.saved ? state : null;
  const requestId = useMemo(() => {
    void savedState;
    return crypto.randomUUID();
  }, [savedState]);
  useCloseSheetOnSave(state);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <FormStatus state={state} />
      <RequiredFieldsNote />
      <input type="hidden" name="clientRequestId" value={requestId} />
      {children(state)}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={pending} pendingLabel="Saving…">
          {submitLabel}
        </Button>
        <SheetCancel />
      </div>
    </form>
  );
}

const reasonField = (
  state: Awaited<ReturnType<FormAction>>,
  description: string,
) => (
  <TextareaField
    label="Reason"
    name="reason"
    rows={2}
    required
    maxLength={300}
    description={description}
    defaultValue={state.values?.reason ?? ''}
    error={state.fieldErrors?.reason}
  />
);

/** Record that the shop saw the original ID: type and last 4 only. */
export function IdCheckSheet({ action }: { action: FormAction }) {
  return (
    <SideSheet
      id={CREDIT_ID_SHEET}
      title="Check ID"
      description="Look at the original document at the counter. Only its type and last 4 characters are kept; nothing is uploaded."
    >
      <CreditForm action={action} submitLabel="Save ID check">
        {(state) => (
          <>
            <SelectField
              label="Document"
              name="type"
              required
              defaultValue={state.values?.type ?? 'AADHAAR'}
              error={state.fieldErrors?.type}
              options={Object.entries(ID_TYPE_LABEL).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Field
              label="Last 4 characters"
              name="last4"
              required
              maxLength={4}
              autoComplete="off"
              className="uppercase"
              description="Never type the full number."
              defaultValue={state.values?.last4 ?? ''}
              error={state.fieldErrors?.last4}
            />
            <CheckboxField
              label="I saw the original document"
              name="sawOriginal"
              required
              error={state.fieldErrors?.sawOriginal}
            />
          </>
        )}
      </CreditForm>
    </SideSheet>
  );
}

/** Give credit, or change the limit, with a reason. */
export function CreditLimitSheet({
  kind,
  action,
  currentPaise,
}: {
  kind: 'give' | 'change';
  action: FormAction;
  currentPaise: number | null;
}) {
  const give = kind === 'give';
  return (
    <SideSheet
      id={give ? CREDIT_GIVE_SHEET : CREDIT_CHANGE_SHEET}
      title={give ? 'Give credit' : 'Change limit'}
      description={
        give
          ? 'The customer can owe you up to this amount. You are warned when an order goes past it.'
          : `The limit is ${formatRupees(currentPaise ?? 0)} now.`
      }
    >
      <CreditForm
        action={action}
        submitLabel={give ? 'Give credit' : 'Change limit'}
      >
        {(state) => (
          <>
            <Field
              label="Credit limit (₹)"
              name="limit"
              inputMode="numeric"
              required
              autoComplete="off"
              description="Whole rupees, up to ₹10,00,000."
              defaultValue={
                state.values?.limit ??
                (currentPaise ? paiseToInput(currentPaise) : '')
              }
              error={state.fieldErrors?.limit}
            />
            {reasonField(state, 'For example: regular painter, pays monthly.')}
          </>
        )}
      </CreditForm>
    </SideSheet>
  );
}

/** Stop credit. What the customer owes stays on the bill. */
export function StopCreditSheet({ action }: { action: FormAction }) {
  return (
    <SideSheet
      id={CREDIT_STOP_SHEET}
      title="Stop credit"
      description="The customer still owes what is on the bill. New orders show a No credit warning."
    >
      <CreditForm action={action} submitLabel="Stop credit">
        {(state) => reasonField(state, 'For example: late payments.')}
      </CreditForm>
    </SideSheet>
  );
}
