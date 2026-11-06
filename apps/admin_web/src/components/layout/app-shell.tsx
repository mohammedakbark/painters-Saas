import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Icon } from '@/components/ui/icon';
import { SubmitButton } from '@/components/ui/submit-button';
import { cn } from '@/lib/cn';
import { type NavItem, NavLinks } from './nav-links';

export interface ShellArea {
  /** Small caption above the name, e.g. "Shop" or "Platform". */
  caption: string;
  /** The shop name, or "Platform Admin". */
  name: string;
  /** Where to switch area, e.g. back to "All my shops". */
  switchTo?: { href: string; label: string };
}

/**
 * Console layout (WEB-004): a sticky sidebar on desktop (≥ 900 px) with the
 * brand, the current area, icon navigation and the account; on smaller
 * screens a top bar with the same parts and scrollable navigation.
 */
export function AppShell({
  area,
  nav,
  account,
  signOutAction,
  children,
}: {
  area: ShellArea;
  nav: readonly NavItem[];
  /** Who is signed in (email or phone number). */
  account: string;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface-subtle desktop:grid desktop:grid-cols-[var(--container-sidebar)_minmax(0,1fr)]">
      <aside className="hidden border-r border-border-default bg-surface-default desktop:sticky desktop:top-0 desktop:flex desktop:h-dvh desktop:flex-col">
        <div className="px-6 pt-6 pb-5">
          <BrandMark />
        </div>
        <AreaCard area={area} className="mx-3 mb-4" />
        <NavLinks items={nav} orientation="vertical" />
        <div className="mt-auto flex flex-col gap-3 border-t border-border-default p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-badge bg-brand-primary-soft text-brand-primary">
              <Icon name="user" />
            </span>
            <div className="min-w-0">
              <p className="text-caption text-text-secondary">Signed in as</p>
              <p className="truncate text-body font-medium text-text-primary">
                {account}
              </p>
            </div>
          </div>
          <form action={signOutAction}>
            <SubmitButton
              variant="secondary"
              pendingLabel="Signing out…"
              className="w-full"
            >
              Sign out
            </SubmitButton>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-b border-border-default bg-surface-default desktop:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <BrandMark />
            <form action={signOutAction}>
              <SubmitButton variant="secondary" pendingLabel="Signing out…">
                Sign out
              </SubmitButton>
            </form>
          </div>
          <AreaCard area={area} className="mx-4 mb-3" />
          <NavLinks items={nav} orientation="horizontal" />
        </header>
        <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-6 px-4 py-6 medium:px-6 desktop:px-10 desktop:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

/** The current area (shop name) and the way to switch to another. */
function AreaCard({
  area,
  className,
}: {
  area: ShellArea;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-panel bg-surface-subtle px-3 py-2.5',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
          {area.caption}
        </p>
        <p className="truncate text-body font-semibold text-text-primary">
          {area.name}
        </p>
      </div>
      {area.switchTo ? (
        <Link
          href={area.switchTo.href}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-nav-item px-2 text-caption font-semibold text-brand-primary hover:bg-brand-primary-soft focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          {area.switchTo.label}
          <Icon name="chevronRight" className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
