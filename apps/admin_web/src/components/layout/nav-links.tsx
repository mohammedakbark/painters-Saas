'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

export interface NavItem {
  href: string;
  label: string;
  /** Active only on an exact match (for an area's landing page). */
  exact?: boolean;
  /** Shown before the label in the console navigation. */
  icon?: IconName;
  /** Not active under this path, e.g. Products is not active on Shades. */
  exclude?: string;
  /** Items waiting, e.g. new orders (UX-002). Hidden when 0. */
  count?: number;
  /** Read out with the count, e.g. "new orders". */
  countLabel?: string;
  /**
   * An area planned for a later phase (D-060): shown greyed out with this tag,
   * e.g. "Phase 3", and not a link.
   */
  later?: string;
  /** Sidebar caption shown above the first item of a group, e.g. "Catalogue". */
  group?: string;
}

const LIST = {
  vertical: 'flex flex-col gap-0.5 px-3',
  horizontal: 'flex gap-2 overflow-x-auto px-4 pb-3',
  tabs: 'flex gap-6 overflow-x-auto border-b border-border-default',
} as const;

const ITEM = {
  // The console sidebar on deep teal (UI-101, `component.sidebar`).
  vertical: {
    base: 'relative flex min-h-10 items-center gap-3 rounded-nav-item px-3 text-body font-medium transition-colors',
    active:
      'bg-sidebar-active-background font-bold text-sidebar-active-foreground',
    idle: 'text-sidebar-foreground/85 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground',
    later: 'text-sidebar-muted/60',
  },
  horizontal: {
    base: 'flex min-h-11 items-center gap-2 rounded-badge border px-4 text-body font-medium whitespace-nowrap transition-colors',
    active: 'border-brand-primary bg-brand-primary text-surface-default',
    idle: 'border-border-default bg-surface-default text-text-secondary hover:text-text-primary',
    later: 'border-border-default text-text-disabled',
  },
  tabs: {
    base: '-mb-px flex min-h-11 items-center gap-2 border-b-2 text-body font-semibold whitespace-nowrap transition-colors',
    active: 'border-brand-primary text-brand-primary',
    idle: 'border-transparent text-text-secondary hover:border-border-strong hover:text-text-primary',
    later: 'border-transparent text-text-disabled',
  },
} as const;

/**
 * Area navigation. Marks the current page with aria-current.
 * `vertical`: the console sidebar; `horizontal`: the console's phone header;
 * `tabs`: sections inside a page, such as Products and Shades.
 */
export function NavLinks({
  items,
  orientation,
  label = 'Main',
  collapsed = false,
}: {
  items: readonly NavItem[];
  orientation: keyof typeof LIST;
  /** Accessible name of the navigation landmark. */
  label?: string;
  /** Vertical only: icons, with the label as a tooltip. */
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const styles = ITEM[orientation];
  return (
    <nav aria-label={label}>
      <ul className={LIST[orientation]}>
        {items.map((item, index) => {
          const caption =
            orientation === 'vertical' &&
            item.group &&
            item.group !== items[index - 1]?.group ? (
              <li
                key={`group-${item.group}`}
                aria-hidden={collapsed ? 'true' : undefined}
                className={cn(
                  'px-3 pt-4 pb-1 text-caption font-bold tracking-widest text-sidebar-muted/70 uppercase first:pt-0',
                  collapsed && 'sr-only',
                )}
              >
                {item.group}
              </li>
            ) : null;
          const excluded =
            item.exclude !== undefined &&
            (pathname === item.exclude ||
              pathname.startsWith(`${item.exclude}/`));
          const active =
            !excluded &&
            (item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`));
          if (item.later) {
            return (
              <Fragment key={item.href}>
                {caption}
                <li className="shrink-0">
                  <span
                    aria-disabled="true"
                    title={
                      collapsed ? `${item.label} (${item.later})` : undefined
                    }
                    className={cn(
                      styles.base,
                      collapsed && 'justify-center px-0',
                      'cursor-not-allowed',
                      styles.later,
                    )}
                  >
                    {item.icon ? (
                      <Icon name={item.icon} className="size-5" />
                    ) : null}
                    <span className={collapsed ? 'sr-only' : undefined}>
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        'ml-auto rounded-badge border border-current px-1.5 text-caption font-semibold whitespace-nowrap',
                        collapsed && 'sr-only',
                      )}
                    >
                      {item.later}
                    </span>
                  </span>
                </li>
              </Fragment>
            );
          }
          return (
            <Fragment key={item.href}>
              {caption}
              <li className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    styles.base,
                    collapsed && 'justify-center px-0',
                    'focus-visible:outline-2 focus-visible:outline-offset-2',
                    orientation === 'vertical'
                      ? 'focus-visible:outline-sidebar-foreground'
                      : 'focus-visible:outline-brand-primary',
                    active ? styles.active : styles.idle,
                  )}
                >
                  {item.icon ? (
                    <span className="relative">
                      <Icon name={item.icon} className="size-5" />
                      {collapsed && item.count ? (
                        <span
                          aria-hidden="true"
                          className="absolute -top-1 -right-1 size-2.5 rounded-full bg-brand-highlight ring-2 ring-sidebar-background"
                        />
                      ) : null}
                    </span>
                  ) : null}
                  <span className={collapsed ? 'sr-only' : undefined}>
                    {item.label}
                  </span>
                  {item.count ? (
                    <span
                      className={cn(
                        'ml-auto min-w-6 rounded-badge px-1.5 py-0.5 text-center text-caption font-bold tabular-nums',
                        orientation === 'vertical'
                          ? 'bg-sidebar-count text-sidebar-count-foreground'
                          : 'bg-brand-primary text-surface-default',
                        collapsed && 'sr-only',
                      )}
                    >
                      {item.count > 99 ? '99+' : item.count}
                      <span className="sr-only"> {item.countLabel ?? ''}</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </nav>
  );
}
