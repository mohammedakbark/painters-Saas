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

/**
 * One headline number (WEB-008, dataviz stat tile): a sentence-case label,
 * the value in text colours, optional context and an optional status badge
 * (word + tone, never colour alone). With `href` the tile opens the list
 * behind the number.
 */
export function StatTile({
  label,
  value,
  context,
  status,
  href,
}: {
  label: string;
  value: number;
  context?: string;
  status?: { tone: BadgeTone; label: string };
  href?: string;
}) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-body font-medium text-text-secondary">
          {label}
        </span>
        {href ? (
          <Icon
            name="arrowRight"
            className="size-4 shrink-0 text-brand-primary transition-transform duration-300 group-hover:translate-x-1"
          />
        ) : null}
      </span>
      <span className="text-display font-semibold tracking-tight text-text-primary tabular-nums">
        {formatCount(value)}
      </span>
      {status || context ? (
        <span className="flex flex-wrap items-center gap-2">
          {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
          {context ? (
            <span className="text-caption text-text-secondary">{context}</span>
          ) : null}
        </span>
      ) : null}
    </>
  );
  const layout = 'flex h-full flex-col gap-2 p-5';
  return href ? (
    <CardLink href={href} variant="raised" className={layout}>
      {body}
    </CardLink>
  ) : (
    <div className={cardClasses(layout)}>{body}</div>
  );
}
