'use client';

import {
  type FormEvent,
  startTransition,
  useActionState,
  useEffect,
  useState,
} from 'react';
import { FormStatus } from '@/components/catalogue/form-status';
import { LocationPicker, SITE_COPY } from '@/components/maps/location-picker';
import type { FormAction } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { RadioGroupField } from '@/components/ui/choice-group-fields';
import { Field } from '@/components/ui/field';
import { RequiredFieldsNote } from '@/components/ui/field-label';
import {
  openSideSheet,
  SheetCancel,
  SideSheet,
  useCloseSheetOnSave,
} from '@/components/ui/side-sheet';
import { TextareaField } from '@/components/ui/textarea-field';
import { KIND_LABEL } from '@/lib/customers/customer-forms';
import { formatIndianMobile } from '@/lib/phone';

/** Submits in a transition so a failed save keeps what was typed. */
function useSheetForm(action: FormAction) {
  const [state, formAction, pending] = useActionState(action, {});
  useCloseSheetOnSave(state);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }
  return { state, formAction, pending, onSubmit };
}

const KIND_OPTIONS = [
  {
    value: 'PAINTER',
    label: KIND_LABEL.PAINTER,
    description: 'Painter or contractor. You can record their sites.',
  },
  {
    value: 'CUSTOMER',
    label: KIND_LABEL.CUSTOMER,
    description: 'Buys for their own home or shop.',
  },
];

/**
 * Add or edit a customer (ORD-004). Private to the shop; the person is not
 * told (D-054). The mobile of a customer who uses the app can't change here.
 */
export function CustomerForm({
  action,
  customer,
  submitLabel,
  onCreated,
}: {
  action: FormAction;
  /** Called with the new customer after a save (the new-order page). */
  onCreated?: (created: unknown) => void;
  customer?: {
    name: string;
    phone: string;
    kind: 'PAINTER' | 'CUSTOMER';
    hasApp: boolean;
  };
  submitLabel: string;
}) {
  const { state, formAction, pending, onSubmit } = useSheetForm(action);
  const values = state.values;
  const errors = state.fieldErrors ?? {};
  const created = (state as { created?: unknown }).created;
  useEffect(() => {
    if (created && onCreated) {
      onCreated(created);
    }
  }, [created, onCreated]);
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <FormStatus state={state} />
      <RequiredFieldsNote />
      <Field
        label="Name"
        name="name"
        required
        autoComplete="off"
        maxLength={120}
        defaultValue={values?.name ?? customer?.name}
        error={errors.name}
      />
      {customer?.hasApp ? (
        <>
          <input type="hidden" name="phone" value={customer.phone} />
          <p className="text-body text-text-secondary">
            Mobile {formatIndianMobile(customer.phone)} comes from their app
            account.
          </p>
        </>
      ) : (
        <Field
          label="Mobile number"
          name="phone"
          required
          type="tel"
          inputMode="tel"
          prefix="+91"
          autoComplete="off"
          description="The person is not sent a message."
          defaultValue={
            values?.phone ??
            (customer
              ? formatIndianMobile(customer.phone).replace(/^\+91 /, '')
              : '')
          }
          error={errors.phone}
        />
      )}
      <RadioGroupField
        legend="Type"
        name="kind"
        required
        defaultValue={values?.kind ?? customer?.kind ?? 'PAINTER'}
        error={errors.kind}
        options={KIND_OPTIONS}
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

/** Add or edit a painter's site; the map pin is optional (D-055). */
export function SiteForm({
  action,
  site,
  submitLabel,
}: {
  action: FormAction;
  site?: {
    id: string;
    name: string;
    ownerName: string | null;
    address: string;
    pin: { latitude: number; longitude: number } | null;
  };
  submitLabel: string;
}) {
  const { state, formAction, pending, onSubmit } = useSheetForm(action);
  const values = state.values;
  const errors = state.fieldErrors ?? {};
  const startPin =
    values?.latitude && values.longitude
      ? {
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
        }
      : (site?.pin ?? null);
  const [withPin, setWithPin] = useState(startPin !== null);
  const [pin, setPin] = useState(startPin);
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="siteId" value={site?.id ?? ''} />
      <FormStatus state={state} />
      <RequiredFieldsNote />
      <Field
        label="Site name"
        name="name"
        required
        maxLength={80}
        placeholder="For example Green Villa"
        defaultValue={values?.name ?? site?.name}
        error={errors.name}
      />
      <Field
        label="Owner name (optional)"
        name="ownerName"
        maxLength={120}
        defaultValue={values?.ownerName ?? site?.ownerName ?? ''}
        error={errors.ownerName}
      />
      <TextareaField
        label="Address or place"
        name="address"
        required
        rows={3}
        maxLength={300}
        description="House or business name, street and place."
        defaultValue={values?.address ?? site?.address}
        error={errors.address}
      />
      <CheckboxField
        label="Add a map pin"
        name="withPin"
        description="Optional. With a pin, delivery distance is worked out for you."
        checked={withPin}
        onChange={(event) => setWithPin(event.currentTarget.checked)}
      />
      {withPin ? (
        <LocationPicker
          value={pin ? { ...pin, source: 'MAP_PIN' } : null}
          onChange={(picked) =>
            setPin({ latitude: picked.latitude, longitude: picked.longitude })
          }
          error={errors.latitude}
          copy={SITE_COPY}
        />
      ) : null}
      <input
        type="hidden"
        name="latitude"
        value={withPin && pin ? String(pin.latitude) : ''}
      />
      <input
        type="hidden"
        name="longitude"
        value={withPin && pin ? String(pin.longitude) : ''}
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

export interface SiteItem {
  id: string;
  name: string;
  ownerName: string | null;
  address: string;
  pin: { latitude: number; longitude: number } | null;
}

const SITE_SHEET = 'site-form';

/**
 * A painter's active sites with one add/edit sheet for the page (ids stay
 * unique). Archive buttons come from the server page through `archiveSlot`.
 */
export function SitesPanel({
  sites,
  saveAction,
  archiveSlot,
}: {
  sites: readonly SiteItem[];
  saveAction: FormAction;
  /** Archive control for one site, rendered by the page. */
  archiveSlot: Record<string, React.ReactNode>;
}) {
  const [editing, setEditing] = useState<SiteItem | null>(null);
  const [round, setRound] = useState(0);
  const open = (site: SiteItem | null) => {
    setEditing(site);
    setRound((value) => value + 1);
    openSideSheet(SITE_SHEET);
  };
  return (
    <>
      <div>
        <Button
          type="button"
          variant="secondary"
          aria-haspopup="dialog"
          onClick={() => open(null)}
        >
          Add site
        </Button>
      </div>
      {sites.length === 0 ? (
        <p className="text-body text-text-secondary">
          No sites yet. Add the places this painter works on.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-default">
          {sites.map((site) => (
            <li key={site.id} className="flex flex-col gap-1 py-3">
              <span className="font-semibold">{site.name}</span>
              <span className="text-body text-text-secondary">
                {site.ownerName ? `${site.ownerName} · ` : ''}
                {site.address}
              </span>
              <span className="text-caption text-text-secondary">
                {site.pin ? 'Map pin set' : 'No map pin'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="tertiary"
                  size="compact"
                  className="-mx-3"
                  aria-haspopup="dialog"
                  aria-label={`Edit ${site.name}`}
                  onClick={() => open(site)}
                >
                  Edit
                </Button>
                {archiveSlot[site.id]}
              </div>
            </li>
          ))}
        </ul>
      )}
      <SideSheet
        id={SITE_SHEET}
        title={editing ? 'Edit site' : 'Add site'}
        description="A place this painter works on. Private to your shop."
      >
        <SiteForm
          key={`${editing?.id ?? 'new'}-${round}`}
          action={saveAction}
          site={editing ?? undefined}
          submitLabel={editing ? 'Save site' : 'Add site'}
        />
      </SideSheet>
    </>
  );
}
