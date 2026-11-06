import type { ReactNode } from 'react';

/**
 * The required-field marker: a red asterisk after the label. Decorative;
 * screen readers hear "required" from `aria-required` on the control.
 */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 font-semibold text-status-error">
      *
    </span>
  );
}

/** The label of a field, with the marker when the field is required. */
export function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  // The marker sits outside <label>, so the field's name stays exactly the
  // label text; "required" comes from `aria-required` on the control.
  return (
    <span className="text-body font-medium text-text-primary">
      <label htmlFor={htmlFor}>{children}</label>
      {required ? <RequiredMark /> : null}
    </span>
  );
}

/**
 * Explains the marker once per form, above the fields. `children` replaces
 * the default wording, e.g. on the shop profile where the fields are needed
 * for review rather than for saving.
 */
export function RequiredFieldsNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-body text-text-secondary">
      Fields marked <RequiredMark />
      <span className="sr-only">with an asterisk</span>{' '}
      {children ?? 'are required.'}
    </p>
  );
}
