import type { InputHTMLAttributes } from 'react';

export interface CheckboxFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'type'
> {
  label: string;
  name: string;
  description?: string;
  error?: string;
}

/** A labelled checkbox with a 48 px touch target and an optional error. */
export function CheckboxField({
  label,
  name,
  description,
  error,
  ...input
}: CheckboxFieldProps) {
  const id = `field-${name}`;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className="mt-1 size-5 accent-brand-primary"
        {...input}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-body font-medium text-text-primary">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-caption text-text-secondary">
            {description}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="text-body text-status-error">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
