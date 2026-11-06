import type { Metadata } from 'next';
import { type ReactNode, Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { NavItem } from '@/components/layout/nav-links';
import { Spinner } from '@/components/ui/spinner';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { BRAND } from '@/lib/brand';
import { signOutOfPlatform } from '../actions';

// A nested layout with a plain string title would stop the root template, so
// the console defines its own template for its pages.
export const metadata: Metadata = {
  title: {
    default: 'Platform',
    template: `%s · Platform · ${BRAND.adminPortalName}`,
  },
};

const PLATFORM_NAV: readonly NavItem[] = [
  { href: '/platform', label: 'Overview', exact: true, icon: 'home' },
  { href: '/platform/reviews', label: 'Reviews', icon: 'shield' },
  { href: '/platform/shops', label: 'Shops', icon: 'store' },
  { href: '/platform/catalogue', label: 'Catalogue', icon: 'notebook' },
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
      area={{ caption: 'Admin area', name: 'Platform Admin' }}
      nav={PLATFORM_NAV}
      account={admin.email ?? 'Platform Admin'}
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
