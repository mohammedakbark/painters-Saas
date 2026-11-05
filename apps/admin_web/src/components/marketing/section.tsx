import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A full-width band of the home page with a centred heading block. */
export function MarketingSection({
  id,
  eyebrow,
  title,
  intro,
  tone = 'default',
  aside,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  tone?: 'default' | 'subtle';
  /** Shown next to the title, e.g. a status badge. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        'scroll-mt-20 px-4 py-16 desktop:py-20',
        tone === 'subtle' ? 'bg-surface-subtle' : 'bg-surface-default',
      )}
    >
      <div className="mx-auto flex w-full max-w-page flex-col gap-10">
        <div className="flex max-w-content flex-col gap-3">
          {eyebrow ? (
            <p className="text-caption font-semibold tracking-wide text-brand-primary uppercase">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id={headingId}
              className="text-heading2 font-semibold text-text-primary desktop:text-heading1 desktop:font-bold"
            >
              {title}
            </h2>
            {aside}
          </div>
          {intro ? (
            <p className="text-body-large text-text-secondary">{intro}</p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

/** A small tick used in feature lists. */
export function TickIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
    >
      <circle cx="10" cy="10" r="10" className="fill-brand-primary-soft" />
      <path
        d="M6 10.5l2.5 2.5L14 7.5"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-brand-primary"
      />
    </svg>
  );
}
