import { type ReactNode, Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Spinner } from '@/components/ui/spinner';
import { getShopUser, requireShopAccess } from '@/lib/auth/shop-access';
import { formatIndianMobile } from '@/lib/phone';
import { signOutOfShop } from '../actions';

/**
 * Shop console chrome. Params and the session are request data, so they are
 * read behind Suspense. Every page below calls requireShopAccess() itself.
 */
export default function ShopConsoleLayout({
  children,
  params,
}: LayoutProps<'/shops/[shopId]'>) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <ShopConsole params={params}>{children}</ShopConsole>
    </Suspense>
  );
}

async function ShopConsole({
  params,
  children,
}: {
  params: Promise<{ shopId: string }>;
  children: ReactNode;
}) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const me = await getShopUser();
  const account = me.phone
    ? formatIndianMobile(me.phone)
    : (me.displayName ?? 'Shop account');

  return (
    <AppShell
      areaLabel={shop.name}
      nav={[
        { href: `/shops/${shop.id}`, label: 'Overview', exact: true },
        { href: `/shops/${shop.id}/profile`, label: 'Profile' },
        { href: `/shops/${shop.id}/catalogue`, label: 'Catalogue' },
        { href: '/shops', label: 'All my shops', exact: true },
      ]}
      account={account}
      signOutAction={signOutOfShop}
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
      <span>Loading your shop…</span>
    </main>
  );
}
