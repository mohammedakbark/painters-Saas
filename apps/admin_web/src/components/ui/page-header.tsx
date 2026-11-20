import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './icon';

/**
 * The page bar (UI-101): a white strip across the top of the console page
 * with a caption (back link or eyebrow), the title, an optional description
 * and the page's actions on the right. One per page, as the first thing on
 * it; it bleeds to the edges of the console's main area and stays at the top
 * while the page scrolls on desktop.
 */
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
    <header className="-mx-4 flex flex-col gap-3 border-b border-top-bar-border bg-top-bar-background px-4 py-4 text-top-bar-foreground medium:-mx-6 medium:flex-row medium:items-center medium:justify-between medium:gap-8 medium:px-6 desktop:sticky desktop:top-0 desktop:z-20">
      <div className="flex min-w-0 flex-col gap-0.5">
        {back ? (
          <Link
            href={back.href}
            className="group inline-flex min-h-8 w-fit items-center gap-1.5 rounded-nav-item text-caption font-semibold text-brand-primary hover:text-brand-primary-strong focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <Icon
              name="arrowLeft"
              className="size-3.5 transition-transform group-hover:-translate-x-0.5"
            />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-heading3 font-bold tracking-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="max-w-content text-body text-pretty text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>
      ) : null}
    </header>
  );
}
