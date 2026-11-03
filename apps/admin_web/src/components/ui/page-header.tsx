import type { ReactNode } from 'react';

/** Page title with optional description and actions. One per page. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 medium:flex-row medium:items-end medium:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-heading1 font-bold text-text-primary">{title}</h1>
        {description ? (
          <p className="text-body-large text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}
