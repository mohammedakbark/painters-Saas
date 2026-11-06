import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { FieldLabel } from './field-label';

export interface SelectFieldProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'name'
> {
  label: string;
  /** Also used to derive the element ids, so it must be unique in the form. */
  name: string;
  options: readonly { value: string; label: string }[];
  description?: string;
  error?: string;
}

/** Labelled native select with the same helper/error wiring as `Field`. */
export function SelectField({
  label,
  name,
  options,
  description,
  error,
  className,
  required,
  ...select
}: SelectFieldProps) {
  const id = `field-${name}`;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {description ? (
        <p id={descriptionId} className="text-caption text-text-secondary">
          {description}
        </p>
      ) : null}
      <select
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        className={cn(
          'min-h-control rounded-control border bg-control-background px-4 text-body-large text-text-primary',
          'disabled:bg-surface-subtle disabled:text-text-disabled',
          'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-primary',
          error ? 'border-control-border-error' : 'border-control-border',
          className,
        )}
        {...select}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="text-body text-status-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
