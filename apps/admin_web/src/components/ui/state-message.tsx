import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Centred message for empty, error and access states of a page or section.
 * Use `role="alert"` for errors so assistive technology announces them.
 */
export function StateMessage({
  title,
  description,
  action,
  role,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  role?: 'alert' | 'status';
  className?: string;
}) {
  return (
    <section
      role={role}
      className={cn(
        'mx-auto flex w-full max-w-form flex-col items-center gap-3 rounded-large border border-border-default bg-surface-default px-6 py-10 text-center',
        className,
      )}
    >
      <h2 className="text-heading3 font-semibold text-text-primary">{title}</h2>
      {description ? (
        <p className="text-body-large text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  );
}
