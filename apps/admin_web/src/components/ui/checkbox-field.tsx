import type { InputHTMLAttributes } from 'react';

export interface CheckboxFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'type'
> {
  label: string;
  name: string;
  description?: string;
}

/** A labelled checkbox with a 48 px touch target. */
export function CheckboxField({
  label,
  name,
  description,
  ...input
}: CheckboxFieldProps) {
  const id = `field-${name}`;
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        aria-describedby={descriptionId}
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
      </div>
    </div>
  );
}
