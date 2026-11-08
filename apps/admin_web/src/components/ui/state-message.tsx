import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconTile, type IconName } from './icon';

/**
 * Centred message for empty, error and access states of a page or section.
 * Use `role="alert"` for errors so assistive technology announces them.
 */
export function StateMessage({
  title,
  description,
  action,
  role,
  icon,
  variant = 'card',
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  role?: 'alert' | 'status';
  /** Icon tile above the title, e.g. `tag` for an empty catalogue. */
  icon?: IconName;
  /** `plain` inside a card or table cell (no second border), UX-001. */
  variant?: 'card' | 'plain';
  className?: string;
}) {
  return (
    <section
      role={role}
      className={cn(
        'mx-auto flex w-full max-w-form flex-col items-center gap-3 text-center',
        variant === 'card'
          ? 'rounded-card border border-card-border bg-card-background px-6 py-10'
          : 'px-2 py-6',
        className,
      )}
    >
      {icon ? (
        <span className="mb-1">
          <IconTile name={icon} />
        </span>
      ) : null}
      <h2 className="text-heading3 font-semibold text-text-primary">{title}</h2>
      {description ? (
        <p className="text-body-large text-text-secondary">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>
      ) : null}
    </section>
  );
}
