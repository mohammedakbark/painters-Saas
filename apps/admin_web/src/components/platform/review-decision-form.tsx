'use client';

import { type FormEvent, startTransition, useActionState } from 'react';
import { FormStatus } from '@/components/catalogue/form-status';
import { Button } from '@/components/ui/button';
import {
  CheckboxGroupField,
  RadioGroupField,
} from '@/components/ui/choice-group-fields';
import { TextareaField } from '@/components/ui/textarea-field';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import {
  REVIEW_NOTE_MAX,
  REVIEW_REASONS,
  reviewReasonLabel,
} from '@/lib/shops/review';

export type DecisionAction = (
  previous: CatalogueFormState,
  formData: FormData,
) => Promise<CatalogueFormState>;

const DECISIONS = [
  {
    value: 'APPROVED',
    label: 'Approve',
    description: 'The shop goes live for customers and painters.',
  },
  {
    value: 'CHANGES_REQUESTED',
    label: 'Request changes',
    description:
      'The owner sees the reasons and the note, fixes the shop and submits it again.',
  },
] as const;

/** Approve, or request changes with reasons and a note (PLT-002, D-032). */
export function ReviewDecisionForm({ action }: { action: DecisionAction }) {
  const [state, formAction, pending] = useActionState<
    CatalogueFormState,
    FormData
  >(action, {});
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  const chosenReasons = new Set(
    (values?.reasons ?? '').split(',').filter(Boolean),
  );

  // A transition submit keeps the radio, ticks and note after a failed save.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form
      action={formAction}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-5"
    >
      <FormStatus state={state} />
      <RadioGroupField
        legend="Decision"
        name="decision"
        options={DECISIONS}
        defaultValue={values?.decision}
        error={errors.decision}
      />
      <CheckboxGroupField
        legend="Reasons (for a change request)"
        name="reasons"
        hint="The owner sees these reasons. Choose at least one when requesting changes."
        options={REVIEW_REASONS.map((reason) => ({
          value: reason,
          label: reviewReasonLabel(reason),
        }))}
        defaultValues={[...chosenReasons]}
        error={errors.reasons}
      />

      <TextareaField
        label="Note to the owner (optional; needed for Other)"
        name="note"
        rows={3}
        maxLength={REVIEW_NOTE_MAX}
        defaultValue={values?.note}
        error={errors.note}
      />
      <div>
        <Button type="submit" pending={pending} pendingLabel="Saving…">
          Save decision
        </Button>
      </div>
    </form>
  );
}
