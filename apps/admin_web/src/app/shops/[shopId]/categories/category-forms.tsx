'use client';

import { useActionState } from 'react';
import { FormStatus } from '@/components/catalogue/form-status';
import type { FormAction } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { RequiredFieldsNote } from '@/components/ui/field-label';
import { SheetCancel, useCloseSheetOnSave } from '@/components/ui/side-sheet';

/**
 * Add one of the shop's own categories, or rename, archive and restore one
 * (in a side sheet, CAT-007).
 */
export function ShopCategoryForm({
  action,
  name = '',
  active,
}: {
  action: FormAction;
  /** The current name when editing. */
  name?: string;
  /** Set when editing: offers Archive or Restore. */
  active?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  useCloseSheetOnSave(state);
  const editing = active !== undefined;
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormStatus state={state} />
      <RequiredFieldsNote />
      <Field
        label="Category name"
        name="name"
        required
        maxLength={60}
        description="For example: Painting tools, Waterproofing, Adhesives. It must differ from the platform's categories."
        defaultValue={state.values?.name ?? name}
        error={state.fieldErrors?.name}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          name="intent"
          value="save"
          pending={pending}
          pendingLabel="Saving…"
        >
          {editing ? 'Save' : 'Add category'}
        </Button>
        {editing ? (
          <Button
            type="submit"
            name="intent"
            value={active ? 'archive' : 'restore'}
            variant="secondary"
            disabled={pending}
          >
            {active ? 'Archive' : 'Restore'}
          </Button>
        ) : null}
        <SheetCancel />
      </div>
    </form>
  );
}
