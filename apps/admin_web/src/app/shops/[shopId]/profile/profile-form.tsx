'use client';

import {
  type FormEvent,
  startTransition,
  useActionState,
  useState,
} from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { INDIAN_STATES } from '@/lib/shops/indian-states';
import type { SuggestedAddress } from '@/lib/shops/map-address';
import type {
  ProfileField,
  ProfileFormState,
  ProfileFormValues,
} from '@/lib/shops/profile';
import { LocationPicker } from './location-picker';

export type SaveProfileAction = (
  previous: ProfileFormState,
  formData: FormData,
) => Promise<ProfileFormState>;

const STATE_OPTIONS = [
  { value: '', label: 'Choose the state' },
  ...INDIAN_STATES.map((state) => ({ value: state.code, label: state.name })),
];

const SUGGESTED_FIELDS = [
  'line1',
  'line2',
  'city',
  'district',
  'stateCode',
  'postalCode',
] as const satisfies readonly ProfileField[];

/** Support mobile, address and map location of one shop (SHP-003). */
export function ShopProfileForm({
  action,
  initialValues,
  canEdit,
  cancelHref,
  viewOnlyNote = 'Only the shop owner can change the profile.',
}: {
  action: SaveProfileAction;
  initialValues: ProfileFormValues;
  canEdit: boolean;
  cancelHref: string;
  /** Why the form is read-only; null when the page already explains it. */
  viewOnlyNote?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, {
    values: initialValues,
  });
  // Controlled, so the map can fill the address and typed values survive
  // errors. Starts from the action state so a no-JavaScript submission (whose
  // response renders with the returned state) keeps what was typed.
  const [values, setValues] = useState(state.values);
  const [suggestion, setSuggestion] = useState<SuggestedAddress | null>(null);
  const errors = state.fieldErrors ?? {};

  const set = (field: ProfileField) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const text = (field: ProfileField) => ({
    name: field,
    value: values[field],
    onChange: (event: { target: { value: string } }) =>
      set(field)(event.target.value),
    error: errors[field],
  });

  const location =
    values.latitude !== '' && values.locationSource !== ''
      ? {
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
          source: values.locationSource,
        }
      : null;

  /**
   * Submits inside a transition instead of through the form's `action` prop:
   * React resets a form after an action-prop submission, and a controlled
   * <select> then shows its first option although the state is unchanged.
   * Without JavaScript the `action` prop still posts the form.
   */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  function applySuggestion(next: SuggestedAddress) {
    setValues((current) => {
      const filled = { ...current };
      for (const field of SUGGESTED_FIELDS) {
        if (next[field]) {
          filled[field] = next[field];
        }
      }
      return filled;
    });
    setSuggestion(null);
  }

  return (
    <form
      action={formAction}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-6"
    >
      {state.formError ? (
        <Alert tone="error" title="The profile was not saved">
          {state.formError}
        </Alert>
      ) : null}
      {!canEdit && viewOnlyNote ? (
        <Alert tone="info" title="View only">
          {viewOnlyNote}
        </Alert>
      ) : null}

      <Card as="section" className="p-6 medium:p-8">
        <fieldset disabled={!canEdit} className="flex flex-col gap-5">
          <legend className="mb-2 text-heading3 font-semibold">
            Customer support
          </legend>
          <Field
            label="Support mobile number"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={20}
            description="Customers will contact the shop on this number. A 10-digit Indian mobile."
            {...text('supportPhone')}
          />
        </fieldset>
      </Card>

      <Card as="section" className="p-6 medium:p-8">
        <fieldset disabled={!canEdit} className="flex flex-col gap-5">
          <legend className="mb-2 text-heading3 font-semibold">
            Shop address
          </legend>
          {suggestion ? (
            <Alert tone="info" title="Address from the map">
              <p>
                {[
                  suggestion.line1,
                  suggestion.line2,
                  suggestion.city,
                  suggestion.district,
                  suggestion.postalCode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="mt-1 text-caption text-text-secondary">
                Map addresses can be incomplete. Check every field after using
                it.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => applySuggestion(suggestion)}
                >
                  Use this address
                </Button>
                <Button variant="secondary" onClick={() => setSuggestion(null)}>
                  Keep what I typed
                </Button>
              </div>
            </Alert>
          ) : null}
          <Field
            label="Shop number, building and street"
            required
            autoComplete="address-line1"
            maxLength={200}
            {...text('line1')}
          />
          <Field
            label="Area or locality (optional)"
            autoComplete="address-line2"
            maxLength={200}
            {...text('line2')}
          />
          <Field
            label="Landmark (optional)"
            maxLength={120}
            description="For example: Opposite the bus stand."
            {...text('landmark')}
          />
          <div className="grid gap-5 medium:grid-cols-2">
            <Field
              label="City or town"
              required
              autoComplete="address-level2"
              maxLength={80}
              {...text('city')}
            />
            <Field
              label="District"
              required
              maxLength={80}
              {...text('district')}
            />
            <SelectField
              label="State"
              required
              autoComplete="address-level1"
              options={STATE_OPTIONS}
              {...text('stateCode')}
            />
            <Field
              label="PIN code"
              required
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              {...text('postalCode')}
            />
          </div>
        </fieldset>
      </Card>

      <Card as="section" className="p-6 medium:p-8">
        <LocationPicker
          value={location}
          onChange={(picked) =>
            setValues((current) => ({
              ...current,
              latitude: String(picked.latitude),
              longitude: String(picked.longitude),
              locationSource: picked.source,
            }))
          }
          onSuggestAddress={setSuggestion}
          error={errors.latitude}
          disabled={!canEdit}
        />
      </Card>
      <input type="hidden" name="latitude" value={values.latitude} />
      <input type="hidden" name="longitude" value={values.longitude} />
      <input
        type="hidden"
        name="locationSource"
        value={values.locationSource}
      />

      {canEdit ? (
        <div className="flex flex-col-reverse gap-3 medium:flex-row medium:justify-end">
          <ButtonLink href={cancelHref} variant="secondary">
            Cancel
          </ButtonLink>
          <Button type="submit" pending={pending} pendingLabel="Saving…">
            Save profile
          </Button>
        </div>
      ) : null}
    </form>
  );
}
