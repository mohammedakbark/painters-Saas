'use client';

import { type FormEvent, startTransition, useActionState } from 'react';
import { FormStatus } from '@/components/catalogue/form-status';
import type { FormAction } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { Field } from '@/components/ui/field';
import { RequiredFieldsNote } from '@/components/ui/field-label';
import { TextareaField } from '@/components/ui/textarea-field';
import { SheetCancel, useCloseSheetOnSave } from '@/components/ui/side-sheet';
import type { DeliverySettings } from '@/lib/api/shop-settings';
import { paiseToInput } from '@/lib/money';
import { MAX_RADIUS_KM } from '@/lib/shops/settings';

/** Submits in a transition so a failed save keeps the ticked box. */
function useSettingsForm(action: FormAction) {
  const [state, formAction, pending] = useActionState(action, {});
  useCloseSheetOnSave(state);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }
  return { state, formAction, pending, onSubmit };
}

/** Delivery on or off with its charge, free-delivery amount and distance. */
export function DeliveryForm({
  action,
  delivery,
  canEdit,
}: {
  action: FormAction;
  delivery: DeliverySettings;
  canEdit: boolean;
}) {
  const { state, formAction, pending, onSubmit } = useSettingsForm(action);
  const values = state.values;
  const errors = state.fieldErrors ?? {};
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <FormStatus state={state} />
      <CheckboxField
        label="Deliver orders"
        name="enabled"
        description="Customers can then choose delivery at checkout. Pickup at the shop is always offered."
        defaultChecked={values ? values.enabled === 'on' : delivery.enabled}
        disabled={!canEdit}
      />
      <div className="grid gap-4 medium:grid-cols-3 medium:items-start">
        <Field
          label="Delivery charge"
          name="charge"
          prefix="₹"
          inputMode="decimal"
          description="A flat charge per order. Enter 0 for free delivery."
          defaultValue={values?.charge ?? paiseToInput(delivery.chargePaise)}
          error={errors.charge}
          disabled={!canEdit}
        />
        <Field
          label="Free delivery from (optional)"
          name="freeAbove"
          prefix="₹"
          inputMode="decimal"
          description="Orders of this amount or more are delivered free."
          defaultValue={
            values?.freeAbove ?? paiseToInput(delivery.freeAbovePaise)
          }
          error={errors.freeAbove}
          disabled={!canEdit}
        />
        <Field
          label="Delivery distance (km)"
          name="radius"
          inputMode="numeric"
          description={`How far from your shop's map location you deliver, up to ${MAX_RADIUS_KM} km.`}
          defaultValue={
            values?.radius ??
            (delivery.radiusKm === null ? '' : String(delivery.radiusKm))
          }
          error={errors.radius}
          disabled={!canEdit}
        />
      </div>
      {canEdit ? (
        <div>
          <Button type="submit" pending={pending} pendingLabel="Saving…">
            Save delivery
          </Button>
        </div>
      ) : null}
    </form>
  );
}

/** Add or edit one ready-made message (in a side sheet). */
export function OrderMessageForm({
  action,
  initial = '',
  submitLabel,
}: {
  action: FormAction;
  initial?: string;
  submitLabel: string;
}) {
  const { state, formAction, pending, onSubmit } = useSettingsForm(action);
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <FormStatus state={state} />
      <RequiredFieldsNote />
      <TextareaField
        label="Message"
        name="message"
        required
        maxLength={160}
        rows={3}
        description="Sent to the customer with an item that is not available. Up to 160 characters."
        defaultValue={state.values?.message ?? initial}
        error={state.fieldErrors?.message}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={pending} pendingLabel="Saving…">
          {submitLabel}
        </Button>
        <SheetCancel />
      </div>
    </form>
  );
}
