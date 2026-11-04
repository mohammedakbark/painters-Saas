import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';
import { Field } from './field';

/**
 * A GET search form: a labelled search field, optional filters (children) and
 * a submit button. Hidden values (for example a selected tab) are kept when
 * searching. Without `action` it submits to the current page.
 */
export function SearchForm({
  action,
  label,
  name = 'q',
  defaultValue,
  maxLength = 60,
  submitLabel = 'Search',
  hidden = {},
  fill = false,
  children,
}: {
  action?: string;
  label: string;
  name?: string;
  defaultValue?: string;
  maxLength?: number;
  submitLabel?: string;
  hidden?: Record<string, string>;
  /** Let the search field take the remaining width. */
  fill?: boolean;
  /** Extra filters, shown between the search field and the button. */
  children?: ReactNode;
}) {
  return (
    <form
      method="get"
      action={action}
      role="search"
      className="flex flex-wrap items-end gap-3"
    >
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <div className={cn(fill && 'min-w-0 flex-1')}>
        <Field
          label={label}
          name={name}
          type="search"
          defaultValue={defaultValue}
          maxLength={maxLength}
        />
      </div>
      {children}
      <Button type="submit" variant="secondary" className="shrink-0">
        {submitLabel}
      </Button>
    </form>
  );
}
