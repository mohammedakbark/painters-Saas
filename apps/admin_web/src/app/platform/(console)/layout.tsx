import type { Metadata } from 'next';
import { type ReactNode, Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { NavItem } from '@/components/layout/nav-links';
import { Spinner } from '@/components/ui/spinner';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { signOutOfPlatform } from '../actions';

export const metadata: Metadata = { title: 'Platform · Admin portal' };

const PLATFORM_NAV: readonly NavItem[] = [
  { href: '/platform', label: 'Overview', exact: true },
];

/**
 * Console chrome. The session is read behind a Suspense boundary (required
 * with Cache Components). Every page below also calls requirePlatformAdmin()
 * itself; this layout check only decides whether to draw the chrome.
 */
export default function PlatformConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <PlatformConsole>{children}</PlatformConsole>
    </Suspense>
  );
}

async function PlatformConsole({ children }: { children: ReactNode }) {
  const admin = await requirePlatformAdmin();
  return (
    <AppShell
      areaLabel="Platform admin"
      nav={PLATFORM_NAV}
      account={admin.email ?? 'Platform admin'}
      signOutAction={signOutOfPlatform}
    >
      {children}
    </AppShell>
  );
}

function ConsoleLoading() {
  return (
    <main
      className="flex min-h-dvh items-center justify-center gap-3 text-body-large text-text-secondary"
      aria-busy="true"
    >
      <Spinner />
      <span>Loading the platform console…</span>
    </main>
  );
}
