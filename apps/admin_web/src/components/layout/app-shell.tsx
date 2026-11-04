import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { SubmitButton } from '@/components/ui/submit-button';
import { type NavItem, NavLinks } from './nav-links';

/**
 * Console layout: persistent sidebar on desktop (≥ 900 px), compact top bar
 * with scrollable navigation below that.
 */
export function AppShell({
  areaLabel,
  nav,
  account,
  signOutAction,
  children,
}: {
  /** For example "Platform admin" or the shop name. */
  areaLabel: string;
  nav: readonly NavItem[];
  /** Who is signed in (email or phone number). */
  account: string;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh desktop:grid desktop:grid-cols-[var(--container-sidebar)_minmax(0,1fr)]">
      <aside className="hidden border-r border-border-default bg-surface-default desktop:flex desktop:min-h-dvh desktop:flex-col">
        <div className="px-6 py-5">
          <p className="text-caption font-medium tracking-wide text-text-secondary uppercase">
            {areaLabel}
          </p>
          <BrandMark />
        </div>
        <NavLinks items={nav} orientation="vertical" />
        <div className="mt-auto flex flex-col gap-3 border-t border-border-default p-4">
          <div className="min-w-0">
            <p className="text-caption text-text-secondary">Signed in as</p>
            <p className="truncate text-body font-medium text-text-primary">
              {account}
            </p>
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
            <div className="min-w-0">
              <p className="text-caption font-medium tracking-wide text-text-secondary uppercase">
                {areaLabel}
              </p>
              <p className="truncate text-body text-text-secondary">
                {account}
              </p>
            </div>
            <form action={signOutAction}>
              <SubmitButton variant="secondary" pendingLabel="Signing out…">
                Sign out
              </SubmitButton>
            </form>
          </div>
          <NavLinks items={nav} orientation="horizontal" />
        </header>
        <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-6 px-4 py-6 medium:px-6 desktop:px-8 desktop:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
