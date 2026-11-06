'use client';

import Link from 'next/link';
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
}

const LIST = {
  vertical: 'flex flex-col gap-1 px-3',
  horizontal: 'flex gap-2 overflow-x-auto px-4 pb-3',
  tabs: 'flex gap-6 overflow-x-auto border-b border-border-default',
} as const;

const ITEM = {
  vertical: {
    base: 'relative flex min-h-11 items-center gap-3 rounded-nav-item px-3 text-body font-medium transition-colors',
    active:
      'bg-brand-primary-soft font-semibold text-brand-primary before:absolute before:inset-y-2.5 before:-left-3 before:w-1 before:rounded-badge before:bg-brand-primary',
    idle: 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
  },
  horizontal: {
    base: 'flex min-h-11 items-center gap-2 rounded-badge border px-4 text-body font-medium whitespace-nowrap transition-colors',
    active: 'border-brand-primary bg-brand-primary text-surface-default',
    idle: 'border-border-default bg-surface-default text-text-secondary hover:text-text-primary',
  },
  tabs: {
    base: '-mb-px flex min-h-11 items-center gap-2 border-b-2 text-body font-semibold whitespace-nowrap transition-colors',
    active: 'border-brand-primary text-brand-primary',
    idle: 'border-transparent text-text-secondary hover:border-border-strong hover:text-text-primary',
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
}: {
  items: readonly NavItem[];
  orientation: keyof typeof LIST;
  /** Accessible name of the navigation landmark. */
  label?: string;
}) {
  const pathname = usePathname();
  const styles = ITEM[orientation];
  return (
    <nav aria-label={label}>
      <ul className={LIST[orientation]}>
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  styles.base,
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
                  active ? styles.active : styles.idle,
                )}
              >
                {item.icon ? (
                  <Icon name={item.icon} className="size-5" />
                ) : null}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
