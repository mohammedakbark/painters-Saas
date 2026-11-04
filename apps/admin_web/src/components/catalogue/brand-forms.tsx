'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import { FormStatus } from './form-status';

export type CatalogueAction = (
  previous: CatalogueFormState,
  formData: FormData,
) => Promise<CatalogueFormState>;

/** "Add a brand" (platform catalogue). */
export function BrandCreateForm({ action }: { action: CatalogueAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormStatus state={state} />
      <div className="flex flex-col gap-3 medium:flex-row medium:items-end">
        <div className="flex-1">
          <Field
            label="New brand"
            name="name"
            maxLength={80}
            required
            description="As printed on the shade cards, for example the manufacturer's name."
            defaultValue={state.values?.name}
            error={state.fieldErrors?.name}
          />
        </div>
        <Button type="submit" pending={pending} pendingLabel="Adding…">
          Add brand
        </Button>
      </div>
    </form>
  );
}

/** Rename, archive or restore a brand. */
export function BrandSettingsForm({
  action,
  name,
  active,
}: {
  action: CatalogueAction;
  name: string;
  active: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormStatus state={state} />
      <div className="flex flex-col gap-3 medium:flex-row medium:items-end">
        <div className="flex-1">
          {/* "brandName": this form shares pages with others that use "name". */}
          <Field
            label="Brand name"
            name="brandName"
            maxLength={80}
            defaultValue={state.values?.brandName ?? name}
            error={state.fieldErrors?.name}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            name="intent"
            value="rename"
            pending={pending}
            pendingLabel="Saving…"
          >
            Rename
          </Button>
          <Button
            type="submit"
            name="intent"
            value={active ? 'archive' : 'restore'}
            variant="secondary"
            disabled={pending}
          >
            {active ? 'Archive brand' : 'Restore brand'}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** "Add a category". */
export function CategoryCreateForm({ action }: { action: CatalogueAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormStatus state={state} />
      <div className="grid gap-3 medium:grid-cols-[minmax(0,1fr)_var(--container-sidebar)_auto] medium:items-end">
        <Field
          label="New category"
          name="name"
          maxLength={60}
          required
          description="For example: Interior emulsion, Primer, Wall putty."
          defaultValue={state.values?.name}
          error={state.fieldErrors?.name}
        />
        <Field
          label="Order (optional)"
          name="sortOrder"
          inputMode="numeric"
          description="Lower numbers come first."
          defaultValue={state.values?.sortOrder}
          error={state.fieldErrors?.sortOrder}
        />
        <Button type="submit" pending={pending} pendingLabel="Adding…">
          Add category
        </Button>
      </div>
    </form>
  );
}

/** One category: rename and reorder, archive or restore. */
export function CategoryRowForm({
  action,
  id,
  name,
  sortOrder,
  active,
}: {
  action: CatalogueAction;
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-3 py-4"
      aria-label={`Category ${name}`}
    >
      <FormStatus state={state} />
      <div className="grid gap-3 medium:grid-cols-[minmax(0,1fr)_var(--container-sidebar)_auto] medium:items-end">
        <Field
          label="Name"
          name={`name-${id}`}
          maxLength={60}
          defaultValue={state.values?.name ?? name}
          error={state.fieldErrors?.name}
        />
        <Field
          label="Order"
          name={`sortOrder-${id}`}
          inputMode="numeric"
          defaultValue={state.values?.sortOrder ?? String(sortOrder)}
          error={state.fieldErrors?.sortOrder}
        />
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            name="intent"
            value="save"
            pending={pending}
            pendingLabel="Saving…"
          >
            Save
          </Button>
          <Button
            type="submit"
            name="intent"
            value={active ? 'archive' : 'restore'}
            variant="secondary"
            disabled={pending}
          >
            {active ? 'Archive' : 'Restore'}
          </Button>
        </div>
      </div>
    </form>
  );
}
