'use client';

import { cn } from '@/lib/cn';
import { Icon } from './icon';

// Column filters for `DataTable` (CAT-003). Each control belongs to a GET
// form by id (`form`), so the filters live in the URL, survive reloads and
// work without JavaScript. A select applies as soon as it changes; a search
// applies on Enter. With JavaScript the form updates the list through the
// client router (`FilterForm`, PERF-001) instead of reloading the page.

const CONTROL =
  'min-h-11 w-full rounded-control border border-control-border bg-control-background text-body text-text-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-primary';

const submit = (element: HTMLInputElement | HTMLSelectElement) =>
  element.form?.requestSubmit();

/** "All" plus the column's values; applies on change. */
export function ColumnSelectFilter({
  form,
  name,
  label,
  value,
  options,
  allLabel = 'All',
}: {
  /** The id of the GET form the filters submit. */
  form: string;
  name: string;
  /** For example "Filter by brand"; shown on phones, spoken everywhere. */
  label: string;
  value: string | undefined;
  options: readonly { value: string; label: string }[];
  /** The "no filter" choice; null when a value is always chosen. */
  allLabel?: string | null;
}) {
  const id = `filter-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-caption font-semibold text-text-secondary desktop:sr-only"
      >
        {label}
      </label>
      <select
        // Remount when the URL changes (for example "Clear filters"), so the
        // control shows the current filter after a client navigation.
        key={value ?? ''}
        id={id}
        name={name}
        form={form}
        defaultValue={value ?? ''}
        onChange={(event) => submit(event.currentTarget)}
        className={cn(CONTROL, 'px-3', value && 'border-brand-primary')}
      >
        {allLabel === null ? null : <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A search box for a text column; applies on Enter. */
export function ColumnSearchFilter({
  form,
  name,
  label,
  value,
  placeholder,
}: {
  form: string;
  name: string;
  label: string;
  value: string | undefined;
  placeholder?: string;
}) {
  const id = `filter-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-caption font-semibold text-text-secondary desktop:sr-only"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
        />
        <input
          key={value ?? ''}
          id={id}
          name={name}
          form={form}
          type="search"
          maxLength={60}
          defaultValue={value}
          placeholder={placeholder}
          className={cn(
            CONTROL,
            'pr-3 pl-9 placeholder:text-text-disabled',
            value && 'border-brand-primary',
          )}
        />
      </div>
    </div>
  );
}
