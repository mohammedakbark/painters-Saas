import Link from 'next/link';
import { cn } from '@/lib/cn';
import { ColumnSelectFilter } from './column-filter';
import { Icon } from './icon';

/** Page numbers to show: first, last and the two around the current page. */
export function pageNumbers(page: number, pages: number): (number | 'gap')[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...wanted]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  return list.flatMap((n, index) =>
    index > 0 && n - list[index - 1]! > 1 ? ['gap' as const, n] : [n],
  );
}

const ITEM =
  'flex min-h-11 min-w-11 items-center justify-center rounded-nav-item px-3 text-body font-semibold focus-visible:outline-2 focus-visible:outline-brand-primary';

/**
 * "Showing 26–50 of 132", page links that keep the filters, and rows per
 * page (CAT-003, D-039). `href(page)` builds the link for a page.
 */
export function Pagination({
  page,
  pageSize,
  total,
  href,
  form,
  pageSizes,
  noun = 'rows',
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
  /** The filters' GET form, for the rows-per-page select. */
  form: string;
  pageSizes: readonly number[];
  /** For example "pack sizes". */
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  // A page past the end (e.g. after filtering) shows nothing.
  const first = total === 0 || start > total ? 0 : start;
  const last = first === 0 ? 0 : Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col gap-4 desktop:flex-row desktop:items-center desktop:justify-between">
      <p className="text-body text-text-secondary" aria-live="polite">
        {total === 0 ? null : (
          <>
            Showing{' '}
            <span className="font-semibold text-text-primary tabular-nums">
              {first}–{last}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-text-primary tabular-nums">
              {total}
            </span>{' '}
            {total === 1 ? noun.replace(/s$/, '') : noun}
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-36">
          <ColumnSelectFilter
            form={form}
            name="pageSize"
            label="Rows per page"
            value={String(pageSize)}
            allLabel={null}
            options={pageSizes.map((size) => ({
              value: String(size),
              label: `${size} per page`,
            }))}
          />
        </div>
        {pages > 1 ? (
          <nav aria-label="Pages">
            <ul className="flex items-center gap-1">
              <li>
                {page > 1 ? (
                  <Link
                    href={href(page - 1)}
                    className={cn(
                      ITEM,
                      'text-brand-primary hover:bg-brand-primary-soft',
                    )}
                  >
                    <Icon name="arrowLeft" className="size-4" />
                    <span className="sr-only">Previous page</span>
                  </Link>
                ) : null}
              </li>
              {pageNumbers(page, pages).map((n, index) =>
                n === 'gap' ? (
                  <li
                    key={`gap-${index}`}
                    aria-hidden="true"
                    className="px-1 text-text-secondary"
                  >
                    …
                  </li>
                ) : (
                  <li key={n}>
                    <Link
                      href={href(n)}
                      aria-current={n === page ? 'page' : undefined}
                      aria-label={`Page ${n}`}
                      className={cn(
                        ITEM,
                        'tabular-nums',
                        n === page
                          ? 'bg-brand-primary text-surface-default'
                          : 'text-text-primary hover:bg-surface-subtle',
                      )}
                    >
                      {n}
                    </Link>
                  </li>
                ),
              )}
              <li>
                {page < pages ? (
                  <Link
                    href={href(page + 1)}
                    className={cn(
                      ITEM,
                      'text-brand-primary hover:bg-brand-primary-soft',
                    )}
                  >
                    <Icon name="arrowRight" className="size-4" />
                    <span className="sr-only">Next page</span>
                  </Link>
                ) : null}
              </li>
            </ul>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
