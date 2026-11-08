import type { Metadata } from 'next';
import { type ReactNode, Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { NavItem } from '@/components/layout/nav-links';
import { Spinner } from '@/components/ui/spinner';
import { getPlatformSummary } from '@/lib/api/platform-shops';
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

/** The menu, with the number of shops waiting for review (UX-003). */
function platformNav(waiting: number): NavItem[] {
  return [
    { href: '/platform', label: 'Overview', exact: true, icon: 'home' },
    {
      href: '/platform/reviews',
      label: 'Reviews',
      icon: 'shield',
      count: waiting,
      countLabel: 'shops waiting',
    },
    { href: '/platform/shops', label: 'Shops', icon: 'store' },
    { href: '/platform/catalogue', label: 'Catalogue', icon: 'notebook' },
  ];
}

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
  // A missing count never blocks the console.
  const waiting = await getPlatformSummary(admin.token)
    .then((summary) => summary.reviews.waiting)
    .catch(() => 0);
  return (
    <AppShell
      area={{ caption: 'Admin area', name: 'Platform Admin' }}
      nav={platformNav(waiting)}
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
