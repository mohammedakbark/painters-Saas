import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface FieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name'
> {
  label: string;
  /** Also used to derive the element ids, so it must be unique in the form. */
  name: string;
  /** Helper text shown under the label. */
  description?: string;
  /** Validation message; marks the input invalid. */
  error?: string;
  /** Fixed text shown before the value inside the control, e.g. "+91". */
  prefix?: string;
}

/** Labelled text input with helper text and an accessible error message. */
export function Field({
  label,
  name,
  description,
  error,
  prefix,
  className,
  ...input
}: FieldProps) {
  const id = `field-${name}`;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body font-medium text-text-primary">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-caption text-text-secondary">
          {description}
        </p>
      ) : null}
      {prefix ? (
        <div
          className={cn(
            'flex min-h-control items-stretch overflow-hidden rounded-control border bg-control-background',
            'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-brand-primary',
            error ? 'border-control-border-error' : 'border-control-border',
          )}
        >
          <span
            id={`${id}-prefix`}
            className="flex items-center border-r border-control-border bg-surface-subtle px-4 text-body-large font-medium text-text-secondary"
          >
            {prefix}
          </span>
          <input
            id={id}
            name={name}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [`${id}-prefix`, describedBy].filter(Boolean).join(' ') ||
              undefined
            }
            className={cn(
              'min-w-0 flex-1 bg-transparent px-4 text-body-large text-text-primary outline-none',
              'placeholder:text-text-disabled disabled:text-text-disabled',
              className,
            )}
            {...input}
          />
        </div>
      ) : (
        <input
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'min-h-control rounded-control border bg-control-background px-4 text-body-large text-text-primary',
            'placeholder:text-text-disabled disabled:bg-surface-subtle disabled:text-text-disabled',
            'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-primary',
            error ? 'border-control-border-error' : 'border-control-border',
            className,
          )}
          {...input}
        />
      )}
      {error ? (
        <p id={errorId} className="text-body text-status-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
