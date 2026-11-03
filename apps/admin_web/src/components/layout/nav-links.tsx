'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export interface NavItem {
  href: string;
  label: string;
  /** Active only on an exact match (for an area's landing page). */
  exact?: boolean;
}

/** Area navigation. Marks the current page with aria-current. */
export function NavLinks({
  items,
  orientation,
}: {
  items: readonly NavItem[];
  orientation: 'vertical' | 'horizontal';
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul
        className={cn(
          'flex gap-1',
          orientation === 'vertical'
            ? 'flex-col px-3'
            : 'overflow-x-auto px-4 pb-2',
        )}
      >
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
                  'flex min-h-11 items-center rounded-small px-3 text-body font-medium',
                  'focus-visible:outline-2 focus-visible:outline-brand-primary',
                  active
                    ? 'bg-brand-primary-soft text-brand-primary'
                    : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
