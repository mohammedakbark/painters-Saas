import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { FieldLabel } from './field-label';

export interface TextareaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'name'
> {
  label: string;
  name: string;
  description?: string;
  error?: string;
}

/** Labelled multi-line input with the same helper/error wiring as `Field`. */
export function TextareaField({
  label,
  name,
  description,
  error,
  className,
  required,
  ...textarea
}: TextareaFieldProps) {
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
      <textarea
        id={id}
        name={name}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        className={cn(
          'rounded-control border bg-control-background px-4 py-3 text-body-large text-text-primary',
          'disabled:bg-surface-subtle disabled:text-text-disabled',
          'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-primary',
          error ? 'border-control-border-error' : 'border-control-border',
          className,
        )}
        {...textarea}
      />
      {error ? (
        <p id={errorId} className="text-body text-status-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
