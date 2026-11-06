'use client';

import { type FormEvent, startTransition, useActionState } from 'react';
import { FormStatus } from '@/components/catalogue/form-status';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Panel } from '@/components/ui/card';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { TextareaField } from '@/components/ui/textarea-field';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import { OWN_PACK_ROWS, packFields } from '@/lib/shop-catalogue/forms';
import { PackPriceFields } from './pack-price-fields';

export type FormAction = (
  previous: CatalogueFormState,
  formData: FormData,
) => Promise<CatalogueFormState>;

/**
 * Submits in a transition: React resets forms after `action` submissions,
 * which would clear selects and ticked boxes after a failed save.
 */
function useTransitionSubmit(action: FormAction) {
  const [state, formAction, pending] = useActionState<
    CatalogueFormState,
    FormData
  >(action, {});
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }
  return { state, formAction, pending, onSubmit };
}

/** "Add from brand catalogue": tick the pack sizes you sell and price them. */
export function CatalogueListingForm({
  action,
  packs,
  cancelHref,
}: {
  action: FormAction;
  packs: readonly { id: string; label: string }[];
  cancelHref: string;
}) {
  const { state, formAction, pending, onSubmit } = useTransitionSubmit(action);
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <FormStatus state={state} />
      {errors.form ? (
        <Alert tone="error" title="Not added">
          {errors.form}
        </Alert>
      ) : null}
      <ul className="flex flex-col gap-4">
        {packs.map((pack) => {
          const fields = packFields(pack.id);
          return (
            <Panel as="li" key={pack.id} className="flex flex-col gap-3 p-4">
              <CheckboxField
                label={`Sell ${pack.label}`}
                name={fields.sell}
                defaultChecked={values ? values[fields.sell] === 'on' : true}
              />
              <div className="grid gap-3 medium:grid-cols-3 medium:items-start">
                <PackPriceFields
                  rowKey={pack.id}
                  packLabel={pack.label}
                  values={values}
                  errors={errors}
                />
              </div>
            </Panel>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={pending} pendingLabel="Adding…">
          Add to my catalogue
        </Button>
        <ButtonLink href={cancelHref} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}

export interface OwnProductInitial {
  name: string;
  categoryId: string;
  brandId: string;
  brandName: string;
  description: string;
  supportsShades: boolean;
}

/** Own product details, with blank pack rows when adding. */
export function OwnProductForm({
  action,
  categories,
  brands,
  initial,
  withPacks,
  submitLabel,
  cancelHref,
  disabled,
}: {
  action: FormAction;
  categories: readonly { id: string; name: string }[];
  brands: readonly { id: string; name: string }[];
  initial: OwnProductInitial;
  withPacks: boolean;
  submitLabel: string;
  cancelHref?: string;
  disabled?: boolean;
}) {
  const { state, formAction, pending, onSubmit } = useTransitionSubmit(action);
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  const value = (name: keyof OwnProductInitial) =>
    values ? (values[name] ?? '') : String(initial[name]);
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <FormStatus state={state} />
      <Field
        label="Product name"
        name="name"
        maxLength={120}
        required
        disabled={disabled}
        defaultValue={value('name')}
        error={errors.name}
      />
      <SelectField
        label="Category"
        name="categoryId"
        required
        disabled={disabled}
        options={[
          { value: '', label: 'Choose the category' },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
        defaultValue={value('categoryId')}
        error={errors.categoryId}
      />
      <div className="grid gap-3 medium:grid-cols-2 medium:items-start">
        <SelectField
          label="Brand (optional)"
          name="brandId"
          disabled={disabled}
          options={[
            { value: '', label: 'Not listed / no brand' },
            ...brands.map((b) => ({ value: b.id, label: b.name })),
          ]}
          defaultValue={value('brandId')}
          error={errors.brandId}
        />
        <Field
          label="Brand name, if not listed (optional)"
          name="brandName"
          maxLength={80}
          disabled={disabled}
          defaultValue={value('brandName')}
          error={errors.brandName}
        />
      </div>
      <TextareaField
        label="Description (optional)"
        name="description"
        maxLength={1000}
        rows={3}
        disabled={disabled}
        defaultValue={value('description')}
        error={errors.description}
      />
      <CheckboxField
        label="Customers choose a shade"
        name="supportsShades"
        description="For tinted or ready-mixed colours."
        disabled={disabled}
        defaultChecked={
          values ? values.supportsShades === 'on' : initial.supportsShades
        }
      />
      {withPacks ? (
        <fieldset className="flex flex-col gap-4">
          <legend className="text-heading3 font-semibold">
            Pack sizes and prices
          </legend>
          <p className="text-body text-text-secondary">
            Fill one row per pack size, for example 1 kg or 4 L. Leave unused
            rows empty; you can add more sizes later.
          </p>
          {errors.form ? (
            <p role="alert" className="text-body text-status-error">
              {errors.form}
            </p>
          ) : null}
          {Array.from({ length: OWN_PACK_ROWS }, (_, row) => {
            const key = String(row);
            const fields = packFields(key);
            return (
              <Panel
                key={key}
                className="grid gap-3 p-4 medium:grid-cols-2 medium:items-start"
              >
                <Field
                  label={`Pack size ${row + 1}`}
                  name={fields.size}
                  maxLength={20}
                  placeholder="4 L"
                  defaultValue={values?.[fields.size]}
                  error={errors[fields.size]}
                />
                <PackPriceFields
                  rowKey={key}
                  packLabel={`pack ${row + 1}`}
                  values={values}
                  errors={errors}
                />
              </Panel>
            );
          })}
        </fieldset>
      ) : null}
      {disabled ? null : (
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            pending={pending}
            pendingLabel={withPacks ? 'Adding…' : 'Saving…'}
          >
            {submitLabel}
          </Button>
          {cancelHref ? (
            <ButtonLink href={cancelHref} variant="secondary">
              Cancel
            </ButtonLink>
          ) : null}
        </div>
      )}
    </form>
  );
}

/** One listed pack size: price, MRP and availability. */
export function PackRowForm({
  action,
  pack,
  disabled,
}: {
  action: FormAction;
  pack: {
    id: string;
    label: string;
    mrp: string;
    price: string;
    available: boolean;
  };
  disabled?: boolean;
}) {
  const { state, formAction, pending, onSubmit } = useTransitionSubmit(action);
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      aria-label={`Pack size ${pack.label}`}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 medium:grid-cols-2 medium:items-start">
        <PackPriceFields
          rowKey={pack.id}
          packLabel={pack.label}
          values={state.values}
          errors={state.fieldErrors ?? {}}
          initial={pack}
          disabled={disabled}
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-body text-status-error">
          {state.error}
        </p>
      ) : null}
      {disabled ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="secondary"
            pending={pending}
            pendingLabel="Saving…"
            aria-label={`Save ${pack.label}`}
          >
            Save
          </Button>
          {state.saved ? (
            <p role="status" className="text-body text-status-success">
              {state.saved}
            </p>
          ) : null}
        </div>
      )}
    </form>
  );
}

/** Add a pack size: one of the brand's unlisted sizes, or a typed size. */
export function AddPackForm({
  action,
  cataloguePacks,
}: {
  action: FormAction;
  /** Unlisted brand pack sizes; null for own products (typed size). */
  cataloguePacks: readonly { id: string; label: string }[] | null;
}) {
  const { state, formAction, pending, onSubmit } = useTransitionSubmit(action);
  const errors = state.fieldErrors ?? {};
  const fields = packFields('new');
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <FormStatus state={state} />
      <div className="grid gap-3 medium:grid-cols-2 medium:items-start">
        {cataloguePacks ? (
          <SelectField
            label="Pack size"
            name="cataloguePackId"
            options={[
              { value: '', label: 'Choose' },
              ...cataloguePacks.map((p) => ({ value: p.id, label: p.label })),
            ]}
            defaultValue={state.values?.cataloguePackId ?? ''}
            error={errors.cataloguePackId}
          />
        ) : (
          <Field
            label="Pack size"
            name={fields.size}
            maxLength={20}
            placeholder="4 L"
            defaultValue={state.values?.[fields.size]}
            error={errors[fields.size]}
          />
        )}
        <PackPriceFields
          rowKey="new"
          packLabel="the new pack"
          values={state.values}
          errors={errors}
        />
      </div>
      <div>
        <Button
          type="submit"
          variant="secondary"
          pending={pending}
          pendingLabel="Adding…"
        >
          Add pack size
        </Button>
      </div>
    </form>
  );
}

/** A form with one button (archive, availability switch, favourite, remove). */
export function ActionButtonForm({
  action,
  label,
  pendingLabel,
  accessibleLabel,
  variant = 'secondary',
}: {
  action: (previous: CatalogueFormState) => Promise<CatalogueFormState>;
  label: string;
  pendingLabel: string;
  /** Names the target for screen readers, for example "Remove 4 L". */
  accessibleLabel?: string;
  /** `tertiary` for a quiet action repeated on every row of a list. */
  variant?: 'primary' | 'secondary' | 'tertiary';
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={
        variant === 'tertiary'
          ? 'flex flex-col items-end gap-1'
          : 'flex flex-col items-start gap-2'
      }
    >
      <Button
        type="submit"
        variant={variant}
        pending={pending}
        pendingLabel={pendingLabel}
        aria-label={accessibleLabel}
      >
        {label}
      </Button>
      {state.error ? (
        <p role="alert" className="text-body text-status-error">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-body text-status-success">
          {state.saved}
        </p>
      ) : null}
    </form>
  );
}

/** "Add a shade of your own". */
export function OwnShadeForm({
  action,
  brands,
}: {
  action: FormAction;
  brands: readonly { id: string; name: string }[];
}) {
  const { state, formAction, pending, onSubmit } = useTransitionSubmit(action);
  const errors = state.fieldErrors ?? {};
  // A successful save clears the fields (the form remounts with a new key).
  const values = state.saved ? undefined : state.values;
  return (
    <form
      key={state.saved}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <FormStatus state={state} />
      <div className="grid gap-3 medium:grid-cols-2 medium:items-start">
        <Field
          label="Shade code"
          name="code"
          maxLength={20}
          required
          description="The code you use in the shop."
          defaultValue={values?.code}
          error={errors.code}
        />
        <Field
          label="Shade name"
          name="name"
          maxLength={80}
          required
          defaultValue={values?.name}
          error={errors.name}
        />
        <Field
          label="Screen colour (optional)"
          name="previewHex"
          maxLength={7}
          description="Indicative only, for example #E8D5B7."
          defaultValue={values?.previewHex}
          error={errors.previewHex}
        />
        <SelectField
          label="Brand (optional)"
          name="brandId"
          options={[
            { value: '', label: 'No brand' },
            ...brands.map((b) => ({ value: b.id, label: b.name })),
          ]}
          defaultValue={values?.brandId ?? ''}
          error={errors.brandId}
        />
      </div>
      <div>
        <Button type="submit" pending={pending} pendingLabel="Adding…">
          Add shade
        </Button>
      </div>
    </form>
  );
}
