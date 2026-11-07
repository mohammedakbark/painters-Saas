'use client';

import { type FormEvent, startTransition, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { SheetCancel, useCloseSheetOnSave } from '@/components/ui/side-sheet';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { TextareaField } from '@/components/ui/textarea-field';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import type { CatalogueAction } from './brand-forms';
import { FormStatus } from './form-status';
import { RequiredFieldsNote } from '@/components/ui/field-label';

export interface ProductFormValues {
  name: string;
  categoryId: string;
  description: string;
  packs: string;
  supportsShades: boolean;
}

/** Create or edit a catalogue product with its pack sizes (CAT-001). */
export function ProductForm({
  action,
  categories,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: CatalogueAction;
  categories: readonly { id: string; name: string; active: boolean }[];
  initial: ProductFormValues;
  submitLabel: string;
  /** Where Cancel goes on a page; in a side sheet Cancel closes it. */
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<
    CatalogueFormState,
    FormData
  >(action, {});
  useCloseSheetOnSave(state);
  const values = state.values;
  const errors = state.fieldErrors ?? {};
  const options = [
    { value: '', label: 'Choose the category' },
    ...categories
      .filter(
        (category) => category.active || category.id === initial.categoryId,
      )
      .map((category) => ({
        value: category.id,
        label: category.active ? category.name : `${category.name} (archived)`,
      })),
  ];

  // A transition submit keeps the select's value after a failed save
  // (React resets forms after `action` submissions).
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
      <RequiredFieldsNote />
      <Field
        label="Product name"
        name="name"
        maxLength={120}
        required
        defaultValue={values?.name ?? initial.name}
        error={errors.name}
      />
      <SelectField
        label="Category"
        required
        name="categoryId"
        options={options}
        defaultValue={values?.categoryId ?? initial.categoryId}
        error={errors.categoryId}
      />
      <Field
        label="Pack sizes"
        name="packs"
        required
        description='Separate sizes with semicolons, for example "1 L; 4 L; 10 L; 20 L". Units: L, ml, kg, g, pc.'
        defaultValue={values?.packs ?? initial.packs}
        error={errors.packs}
      />
      <TextareaField
        label="Description (optional)"
        name="description"
        maxLength={1000}
        defaultValue={values?.description ?? initial.description}
        error={errors.description}
      />
      <CheckboxField
        label="Customers choose a shade"
        name="supportsShades"
        description="For tinted or ready-mixed colours. Shops then offer the brand's shades."
        defaultChecked={
          values ? values.supportsShades === 'on' : initial.supportsShades
        }
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={pending} pendingLabel="Saving…">
          {submitLabel}
        </Button>
        <SheetCancel href={cancelHref} />
      </div>
    </form>
  );
}
