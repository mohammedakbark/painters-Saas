'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Field } from '@/components/ui/field';
import type { RegisterShopFormState } from '@/lib/shops/register';
import { RequiredFieldsNote } from '@/components/ui/field-label';

export type RegisterShopAction = (
  previous: RegisterShopFormState,
  formData: FormData,
) => Promise<RegisterShopFormState>;

const INITIAL_STATE: RegisterShopFormState = {
  values: { shopName: '', ownerName: '' },
};

export function RegisterShopForm({ action }: { action: RegisterShopAction }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <RequiredFieldsNote />
      {state.formError ? (
        <Alert tone="error" title="Registration failed">
          {state.formError}
        </Alert>
      ) : null}
      <Field
        label="Shop name"
        name="shopName"
        autoComplete="organization"
        required
        maxLength={120}
        description="As customers know it, e.g. Lakshmi Paints."
        defaultValue={state.values.shopName}
        error={state.fieldErrors?.shopName}
      />
      <Field
        label="Your name"
        name="ownerName"
        autoComplete="name"
        required
        maxLength={100}
        description="You will be the shop's owner (master account)."
        defaultValue={state.values.ownerName}
        error={state.fieldErrors?.ownerName}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={pending} pendingLabel="Registering…">
          Register shop
        </Button>
        <ButtonLink href="/shops" variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
