import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface Segment {
  href: string;
  label: string;
  current: boolean;
}

/**
 * A segmented control made of links, for switching a list between views
 * (e.g. Selling and Archived). The current segment has aria-current.
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
    <nav aria-label={label}>
      <ul className="inline-flex gap-1 rounded-badge border border-border-default bg-surface-default p-1">
        {segments.map((segment) => (
          <li key={segment.href}>
            <Link
              href={segment.href}
              aria-current={segment.current ? 'page' : undefined}
              className={cn(
                'flex min-h-10 items-center rounded-badge px-5 text-body font-semibold transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
                segment.current
                  ? 'bg-brand-primary text-surface-default'
                  : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
              )}
            >
              {segment.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
