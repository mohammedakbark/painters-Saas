import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { FieldLabel } from './field-label';

export interface FileFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'type'
> {
  label: string;
  /** Also used to derive the element ids, so it must be unique in the form. */
  name: string;
  description?: string;
  error?: string;
}

/**
 * Labelled file chooser with the same helper/error wiring as `Field`. The
 * error is announced (`role="alert"`): it usually follows choosing a file.
 */
export function FileField({
  label,
  name,
  description,
  error,
  className,
  required,
  ...input
}: FileFieldProps) {
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
      <input
        id={id}
        name={name}
        type="file"
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        className={cn(
          'text-body text-text-primary',
          'file:mr-4 file:min-h-control file:rounded-button file:border file:border-button-secondary-border',
          'file:bg-button-secondary-background file:px-5 file:text-body-large file:font-semibold file:text-button-secondary-foreground',
          'hover:file:bg-button-secondary-background-hover',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
          className,
        )}
        {...input}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-body text-status-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
