import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface Segment {
  href: string;
  label: string;
  current: boolean;
  /** Items in this view, e.g. orders in a step (UI redesign). */
  count?: number;
}

/**
 * A segmented control made of links, for switching a list between views
 * (e.g. Selling and Archived). The current segment has aria-current. When
 * there are more segments than fit (a phone), the strip scrolls sideways on
 * its own instead of widening the page.
 */
export function SegmentedLinks({
  label,
  segments,
}: {
  /** Accessible name, e.g. "Product status". */
  label: string;
  segments: readonly Segment[];
}) {
  return (
    <nav aria-label={label} className="max-w-full overflow-x-auto">
      <ul className="inline-flex gap-0.5 rounded-control border border-border-default bg-surface-default p-1">
        {segments.map((segment) => (
          <li key={segment.href}>
            <Link
              href={segment.href}
              aria-current={segment.current ? 'page' : undefined}
              className={cn(
                'flex min-h-10 items-center gap-2 rounded-nav-item px-4 text-body font-semibold whitespace-nowrap transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
                segment.current
                  ? 'bg-brand-primary-soft text-brand-primary-strong'
                  : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
              )}
            >
              {segment.label}
              {segment.count !== undefined ? (
                <span
                  className={cn(
                    'min-w-6 rounded-badge px-1.5 text-center text-caption font-semibold tabular-nums',
                    segment.current
                      ? 'bg-surface-default text-brand-primary-strong'
                      : 'bg-surface-subtle text-text-secondary',
                  )}
                >
                  {segment.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
