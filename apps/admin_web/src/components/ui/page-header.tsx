import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './icon';

/** Page title with optional description and actions. One per page. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small caption above the title, e.g. "Catalogue". */
  eyebrow?: string;
  /** Link to the parent page, shown above the title. */
  back?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-col gap-4">
      {back ? (
        <Link
          href={back.href}
          className="group inline-flex min-h-11 w-fit items-center gap-2 rounded-nav-item text-body font-semibold text-brand-primary hover:text-brand-primary-strong focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          <Icon
            name="arrowLeft"
            className="size-4 transition-transform group-hover:-translate-x-0.5"
          />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 medium:flex-row medium:items-end medium:justify-between medium:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? (
            <p className="text-caption font-semibold tracking-wide text-brand-primary uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-heading1 font-bold tracking-tight text-balance text-text-primary">
            {title}
          </h1>
          {description ? (
            <p className="max-w-narrow text-body-large text-pretty text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
