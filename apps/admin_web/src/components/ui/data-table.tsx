import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './icon';

export interface Column<T> {
  key: string;
  /** Header text; also labels the cell when rows stack on phones. */
  header: string;
  /** A sortable header instead of plain text (see `SortHeader`). */
  headerContent?: ReactNode;
  cell: (row: T) => ReactNode;
  /** A control in the filter row under the header (see `ColumnFilter`). */
  filter?: ReactNode;
  /** `end` for numbers and actions. */
  align?: 'start' | 'end';
  /** Width hint on wide screens, e.g. `w-40`. */
  width?: string;
  /** The column's current sort, announced on the header. */
  sorted?: 'ascending' | 'descending';
  /** Extra classes for this column's cells, e.g. `whitespace-nowrap`. */
  cellClassName?: string;
}

/**
 * A data table with a filter row under the header (CAT-003, D-039).
 * Wide screens: a normal table. Below `desktop` the same table stacks: the
 * filter row becomes a panel of filters and each row becomes a card with
 * labelled values, so there is no horizontal page scroll and every filter
 * exists once (one set of form fields).
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: {
  /** Names the table for screen readers. */
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  /** Shown in place of the rows when there are none. */
  empty?: ReactNode;
}) {
  const hasFilters = columns.some((column) => column.filter);
  return (
    <div className="desktop:overflow-hidden desktop:rounded-card desktop:border desktop:border-card-border desktop:bg-card-background">
      <table className="block w-full border-collapse text-left desktop:table desktop:table-fixed">
        <caption className="sr-only">{caption}</caption>
        <thead className="block desktop:table-header-group">
          <tr className="hidden desktop:table-row">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={column.sorted}
                className={cn(
                  'border-b border-border-default bg-surface-subtle px-4 py-3 text-caption font-semibold tracking-wide whitespace-nowrap text-text-secondary uppercase',
                  column.align === 'end' && 'text-right',
                  column.width,
                )}
              >
                {column.headerContent ?? column.header}
              </th>
            ))}
          </tr>
          {hasFilters ? (
            <tr className="mb-4 grid grid-cols-2 gap-3 [&>td:first-child]:col-span-2 rounded-card border border-card-border bg-card-background p-4 desktop:mb-0 desktop:table-row desktop:rounded-none desktop:border-0 desktop:bg-surface-subtle desktop:p-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'block desktop:table-cell desktop:border-b desktop:border-border-default desktop:px-4 desktop:pb-3',
                    !column.filter && 'hidden desktop:table-cell',
                  )}
                >
                  {column.filter}
                </td>
              ))}
            </tr>
          ) : null}
        </thead>
        <tbody className="flex flex-col gap-3 desktop:table-row-group">
          {rows.length === 0 ? (
            <tr className="block desktop:table-row">
              <td
                colSpan={columns.length}
                className="block desktop:table-cell desktop:p-6"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="block rounded-card border border-card-border bg-card-background p-4 transition-colors desktop:table-row desktop:rounded-none desktop:border-0 desktop:border-b desktop:border-border-default desktop:p-0 desktop:last:border-b-0 desktop:hover:bg-surface-subtle"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    data-label={column.header}
                    className={cn(
                      'flex items-center justify-between gap-4 py-1.5 text-body text-text-primary',
                      'before:text-caption before:font-semibold before:text-text-secondary before:content-[attr(data-label)]',
                      'desktop:table-cell desktop:px-4 desktop:py-3 desktop:align-middle desktop:before:content-none',
                      column.align === 'end' && 'desktop:text-right',
                      column.cellClassName,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** A header that sorts by its column when chosen; shows the direction. */
export function SortHeader({
  label,
  href,
  direction,
  align = 'start',
}: {
  label: string;
  /** The page with this column's next sort applied. */
  href: string;
  /** The current sort on this column, if any. */
  direction: 'ascending' | 'descending' | null;
  align?: 'start' | 'end';
}) {
  return (
    <Link
      href={href}
      aria-label={`${label}, sort ${direction === 'ascending' ? 'descending' : 'ascending'}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-nav-item hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand-primary',
        direction && 'text-text-primary',
        align === 'end' && 'flex-row-reverse',
      )}
    >
      {label}
      <Icon
        name="chevronDown"
        className={cn(
          'size-4 transition-transform',
          direction === 'ascending' && 'rotate-180',
          !direction && 'opacity-40',
        )}
      />
    </Link>
  );
}
