import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Field } from './field';
import { UrlForm, UrlFormSubmit } from './url-form';

/**
 * A GET search form: a labelled search field, optional filters (children) and
 * a submit button. Hidden values (for example a selected tab) are kept when
 * searching. Without `action` it submits to the current page. Searches run
 * through the client router (PERF-001), so the page is not reloaded.
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
    <UrlForm
      action={action}
      role="search"
      className="flex flex-wrap items-end gap-3"
    >
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <div className={cn(fill && 'min-w-0 flex-1')}>
        <Field
          // Remount when the URL changes, so the box shows the current search.
          key={defaultValue ?? ''}
          label={label}
          name={name}
          type="search"
          defaultValue={defaultValue}
          maxLength={maxLength}
        />
      </div>
      {children}
      <UrlFormSubmit
        variant="secondary"
        className="shrink-0"
        pendingLabel="Searching…"
      >
        {submitLabel}
      </UrlFormSubmit>
    </UrlForm>
  );
}
