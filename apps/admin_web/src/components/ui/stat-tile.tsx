import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Badge, type BadgeTone } from './badge';
import { cardClasses, CardLink } from './card';
import { Icon } from './icon';

const COMPACT = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** 1284 → "1.3K"; small numbers stay exact. */
export function formatCount(value: number): string {
  return value < 10_000 ? value.toLocaleString('en-IN') : COMPACT.format(value);
}

const LEAD =
  'rounded-card border border-stat-tile-lead-background bg-stat-tile-lead-background text-stat-tile-lead-foreground';

/**
 * One headline number (WEB-008, dataviz stat tile): a sentence-case label,
 * the value in text colours, optional context and an optional status badge
 * (word + tone, never colour alone). With `href` the tile opens the list
 * behind the number. `lead` fills the first tile of a KPI row in deep teal
 * (UI redesign, `component.statTileLead`).
 */
export function StatTile({
  label,
  value,
  context,
  status,
  href,
  lead = false,
}: {
  label: string;
  /** A count (formatted here) or ready text such as an amount, "₹2,450". */
  value: number | string;
  context?: string;
  status?: { tone: BadgeTone; label: string };
  href?: string;
  lead?: boolean;
}) {
  const muted = lead ? 'text-stat-tile-lead-muted' : 'text-text-secondary';
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className={cn('text-body font-medium', muted)}>{label}</span>
        {href ? (
          <Icon
            name="arrowRight"
            className={cn(
              'size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1',
              lead ? 'text-stat-tile-lead-foreground' : 'text-brand-primary',
            )}
          />
        ) : null}
      </span>
      <span
        className={cn(
          'text-display font-semibold tracking-tight break-words tabular-nums',
          lead ? 'text-stat-tile-lead-foreground' : 'text-text-primary',
        )}
      >
        {typeof value === 'number' ? formatCount(value) : value}
      </span>
      {status || context ? (
        <span className="flex flex-wrap items-center gap-2">
          {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
          {context ? (
            <span className={cn('text-caption', muted)}>{context}</span>
          ) : null}
        </span>
      ) : null}
    </>
  );
  const layout = 'flex h-full flex-col gap-2 p-5';
  if (lead) {
    return href ? (
      <Link
        href={href}
        className={cn(
          LEAD,
          layout,
          'group transition-shadow duration-300 hover:shadow-xl hover:shadow-brand-primary/20',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
        )}
      >
        {body}
      </Link>
    ) : (
      <div className={cn(LEAD, layout)}>{body}</div>
    );
  }
  return href ? (
    <CardLink href={href} variant="raised" className={layout}>
      {body}
    </CardLink>
  ) : (
    <div className={cardClasses(layout)}>{body}</div>
  );
}
