'use client';

import {
  type FormEvent,
  startTransition,
  useActionState,
  useState,
} from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import { packFields } from '@/lib/shop-catalogue/forms';

export interface QuickAddRow {
  catalogueProductId: string;
  name: string;
  categoryName: string;
  packs: readonly { id: string; label: string }[];
}

type Action = (
  previous: CatalogueFormState,
  formData: FormData,
) => Promise<CatalogueFormState>;

/** How many products and pack sizes have a price typed in. */
function countReady(form: HTMLFormElement, rows: readonly QuickAddRow[]) {
  let products = 0;
  let packs = 0;
  for (const row of rows) {
    const filled = row.packs.filter((pack) => {
      const input = form.elements.namedItem(packFields(pack.id).price);
      return input instanceof HTMLInputElement && input.value.trim() !== '';
    }).length;
    if (filled > 0) {
      products += 1;
      packs += filled;
    }
  }
  return { products, packs };
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * Quick add (CAT-004): prices for many brand products in one form. A price
 * entered means "sell this pack size"; empty ones are skipped.
 */
export function QuickAddForm({
  action,
  rows,
}: {
  action: Action;
  rows: readonly QuickAddRow[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [ready, setReady] = useState({ products: 0, packs: 0 });
  const errors = state.fieldErrors ?? {};
  const values = state.values;

  // Submitted in a transition so the typed prices stay after an error.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form
      action={formAction}
      onSubmit={submit}
      onInput={(event) => setReady(countReady(event.currentTarget, rows))}
      noValidate
      className="flex flex-col gap-4"
    >
      {state.error ? (
        <Alert tone="error" title="Some products were not added">
          {state.error}
        </Alert>
      ) : null}
      {errors.form ? (
        <Alert tone="error" title="Nothing to add">
          {errors.form}
        </Alert>
      ) : null}

      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <Card
            as="li"
            key={row.catalogueProductId}
            className="flex flex-col gap-4 p-5 desktop:flex-row desktop:gap-6"
          >
            <div className="flex flex-col gap-1 desktop:w-56 desktop:shrink-0">
              <h2 className="text-title font-semibold text-text-primary">
                {row.name}
              </h2>
              <p className="text-body text-text-secondary">
                {row.categoryName}
              </p>
            </div>
            <div className="grid flex-1 gap-3 medium:grid-cols-2 wide:grid-cols-3">
              {row.packs.map((pack) => {
                const fields = packFields(pack.id);
                return (
                  <fieldset
                    key={pack.id}
                    className="flex flex-col gap-2 rounded-panel border border-panel-border p-3"
                  >
                    <legend className="px-1 text-body font-semibold text-text-primary">
                      {pack.label}
                    </legend>
                    <Field
                      label={`Price of ${pack.label} (₹)`}
                      name={fields.price}
                      inputMode="decimal"
                      autoComplete="off"
                      maxLength={14}
                      defaultValue={values?.[fields.price]}
                      error={errors[fields.price]}
                    />
                    <Field
                      label="MRP (₹, optional)"
                      name={fields.mrp}
                      inputMode="decimal"
                      autoComplete="off"
                      maxLength={14}
                      defaultValue={values?.[fields.mrp]}
                      error={errors[fields.mrp]}
                    />
                  </fieldset>
                );
              })}
            </div>
          </Card>
        ))}
      </ul>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-border-default bg-surface-default/95 px-4 py-4 backdrop-blur medium:-mx-6 medium:px-6 desktop:-mx-10 desktop:flex-row desktop:items-center desktop:justify-between desktop:px-10">
        <p className="text-body text-text-secondary" aria-live="polite">
          {ready.products > 0 ? (
            <>
              <span className="font-semibold text-text-primary">
                {plural(ready.products, 'product', 'products')}
              </span>
              , {plural(ready.packs, 'pack size', 'pack sizes')} ready to add.
            </>
          ) : (
            'Type a price for each pack size you sell. Leave the others empty.'
          )}
        </p>
        <Button type="submit" pending={pending} pendingLabel="Adding…">
          {ready.products > 1
            ? `Add ${ready.products} products`
            : 'Add products'}
        </Button>
      </div>
    </form>
  );
}
