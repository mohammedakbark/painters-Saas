'use client';

import { type FormEvent, startTransition, useActionState } from 'react';
import { FormStatus } from '@/components/catalogue/form-status';
import { Button } from '@/components/ui/button';
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
      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={errors.decision ? 'decision-error' : undefined}
      >
        <legend className="text-body-large font-semibold">Decision</legend>
        {DECISIONS.map((option) => {
          const id = `decision-${option.value}`;
          return (
            <div key={option.value} className="flex items-start gap-3">
              <input
                id={id}
                type="radio"
                name="decision"
                value={option.value}
                defaultChecked={values?.decision === option.value}
                className="mt-1 size-5 accent-brand-primary"
                aria-describedby={`${id}-description`}
              />
              <div className="flex flex-col gap-1">
                <label htmlFor={id} className="text-body font-medium">
                  {option.label}
                </label>
                <p
                  id={`${id}-description`}
                  className="text-caption text-text-secondary"
                >
                  {option.description}
                </p>
              </div>
            </div>
          );
        })}
        {errors.decision ? (
          <p id="decision-error" className="text-body text-status-error">
            {errors.decision}
          </p>
        ) : null}
      </fieldset>

      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={errors.reasons ? 'reasons-error' : 'reasons-hint'}
      >
        <legend className="text-body-large font-semibold">
          Reasons (for a change request)
        </legend>
        <p id="reasons-hint" className="text-caption text-text-secondary">
          The owner sees these reasons. Choose at least one when requesting
          changes.
        </p>
        {REVIEW_REASONS.map((reason) => {
          const id = `reason-${reason}`;
          return (
            <div key={reason} className="flex items-start gap-3">
              <input
                id={id}
                type="checkbox"
                name="reasons"
                value={reason}
                defaultChecked={chosenReasons.has(reason)}
                className="mt-1 size-5 accent-brand-primary"
              />
              <label htmlFor={id} className="text-body font-medium">
                {reviewReasonLabel(reason)}
              </label>
            </div>
          );
        })}
        {errors.reasons ? (
          <p id="reasons-error" className="text-body text-status-error">
            {errors.reasons}
          </p>
        ) : null}
      </fieldset>

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
