import { type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';
import { Card } from './card';

/**
 * A titled card on a page (UX-001): one padding and one heading style for
 * every section. `main` sections (main column) use the larger heading,
 * `side` sections (aside) the smaller one.
 */
export function Section({
  title,
  description,
  actions,
  size = 'main',
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Buttons at the right of the title, e.g. "Add site". */
  actions?: ReactNode;
  size?: 'main' | 'side';
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <Card
      as="section"
      aria-labelledby={id}
      className={cn(
        'flex flex-col gap-4',
        size === 'main' ? 'p-5 medium:p-6' : 'p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id={id}
            className={cn(
              'font-semibold',
              size === 'main' ? 'text-heading3' : 'text-title',
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className="text-body text-text-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

/** Label and value facts, one style everywhere (UX-001). */
export function DetailList({
  items,
}: {
  items: readonly { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-body">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-text-secondary">{item.label}</dt>
          <dd className="min-w-0 font-medium break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
