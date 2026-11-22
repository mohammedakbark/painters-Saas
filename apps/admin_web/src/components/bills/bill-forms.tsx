'use client';

import {
  type FormEvent,
  startTransition,
  useActionState,
  useMemo,
} from 'react';
import { FormStatus } from '@/components/catalogue/form-status';
import type { FormAction } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Button } from '@/components/ui/button';
import { RadioGroupField } from '@/components/ui/choice-group-fields';
import { Field } from '@/components/ui/field';
import { RequiredFieldsNote } from '@/components/ui/field-label';
import {
  SheetCancel,
  SideSheet,
  useCloseSheetOnSave,
} from '@/components/ui/side-sheet';
import { TextareaField } from '@/components/ui/textarea-field';
import { formatRupees, paiseToInput } from '@/lib/money';
import { PAYMENT_METHOD_LABEL } from '@/lib/orders/labels';

export const BILL_PAYMENT_SHEET = 'bill-payment';
export const BILL_REFUND_SHEET = 'bill-refund';

/**
 * Record a payment or a refund on the running bill (BIL-001), in a side
 * sheet (D-051). The amount starts at what is owed and can be lowered, never
 * raised above it (the API refuses). One request key per form, so a double
 * click records once; a new key after each save.
 */
export function BillMoneySheet({
  kind,
  action,
  maxPaise,
}: {
  kind: 'payment' | 'refund';
  action: FormAction;
  maxPaise: number;
}) {
  const payment = kind === 'payment';
  return (
    <SideSheet
      id={payment ? BILL_PAYMENT_SHEET : BILL_REFUND_SHEET}
      title={payment ? 'Record payment' : 'Record refund'}
      description={
        payment
          ? `The customer owes ${formatRupees(maxPaise)}. Any amount up to that pays their oldest orders first.`
          : `You owe the customer ${formatRupees(maxPaise)} after a return. Record what you paid back.`
      }
    >
      <BillMoneyForm kind={kind} action={action} maxPaise={maxPaise} />
    </SideSheet>
  );
}

function BillMoneyForm({
  kind,
  action,
  maxPaise,
}: {
  kind: 'payment' | 'refund';
  action: FormAction;
  maxPaise: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // One key per attempt; a new one only after a save, so a retry after an
  // error or a lost response never records twice.
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

  const payment = kind === 'payment';
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
      <Field
        label="Amount (₹)"
        name="amount"
        inputMode="decimal"
        required
        autoComplete="off"
        defaultValue={state.values?.amount ?? paiseToInput(maxPaise)}
        description={`At most ${formatRupees(maxPaise)}.`}
        error={state.fieldErrors?.amount}
      />
      <RadioGroupField
        legend={payment ? 'Paid by' : 'Paid back by'}
        name="method"
        required
        defaultValue={state.values?.method ?? 'CASH'}
        error={state.fieldErrors?.method}
        options={Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      <TextareaField
        label="Note"
        name="note"
        rows={2}
        maxLength={300}
        description="Optional, for example a UPI reference."
        defaultValue={state.values?.note ?? ''}
        error={state.fieldErrors?.note}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={pending} pendingLabel="Saving…">
          {payment ? 'Record payment' : 'Record refund'}
        </Button>
        <SheetCancel />
      </div>
    </form>
  );
}
