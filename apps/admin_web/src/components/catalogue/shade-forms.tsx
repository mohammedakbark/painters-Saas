'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import type { CatalogueAction } from './brand-forms';
import { FormStatus } from './form-status';
import { RequiredFieldsNote } from '@/components/ui/field-label';
import { SheetCancel, useCloseSheetOnSave } from '@/components/ui/side-sheet';

/** "Add a shade": code, name and an optional indicative colour. */
export function ShadeCreateForm({ action }: { action: CatalogueAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  useCloseSheetOnSave(state);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormStatus state={state} />
      <RequiredFieldsNote />
      <div className="flex flex-col gap-4">
        <Field
          label="Shade code"
          name="code"
          maxLength={20}
          required
          description="As printed on the shade card."
          defaultValue={state.values?.code}
          error={errors.code}
        />
        <Field
          label="Shade name"
          name="name"
          maxLength={80}
          required
          defaultValue={state.values?.name}
          error={errors.name}
        />
        <Field
          label="Screen colour (optional)"
          name="previewHex"
          maxLength={7}
          description="Indicative only, for example #E8D5B7."
          defaultValue={state.values?.previewHex}
          error={errors.previewHex}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={pending} pendingLabel="Adding…">
          Add shade
        </Button>
        <SheetCancel />
      </div>
    </form>
  );
}

/** Archive or restore one row (shade or product). */
export function ActiveToggleForm({
  action,
  active,
  label,
}: {
  action: (previous: CatalogueFormState) => Promise<CatalogueFormState>;
  active: boolean;
  /** For screen readers, for example "shade 1001 Ivory". */
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <Button
        type="submit"
        variant="secondary"
        pending={pending}
        pendingLabel={active ? 'Archiving…' : 'Restoring…'}
        aria-label={`${active ? 'Archive' : 'Restore'} ${label}`}
      >
        {active ? 'Archive' : 'Restore'}
      </Button>
      {state.error ? (
        <p role="alert" className="text-body text-status-error">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
