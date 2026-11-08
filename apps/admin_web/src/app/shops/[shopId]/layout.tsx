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
  const base = `/shops/${shop.id}`;
  const account = me.phone
    ? formatIndianMobile(me.phone)
    : (me.displayName ?? 'Shop account');

  return (
    <AppShell
      area={{
        caption: 'Shop',
        name: shop.name,
        switcher: {
          items: me.shopMemberships.map((membership) => ({
            href: `/shops/${membership.shopId}`,
            label: membership.shopName,
            current: membership.shopId === shop.id,
          })),
          links: [
            { href: '/shops', label: 'All my shops', icon: 'store' },
            { href: '/shops/new', label: 'Register a shop', icon: 'plus' },
          ],
        },
      }}
      nav={[
        { href: base, label: 'Overview', exact: true, icon: 'home' },
        { href: `${base}/orders`, label: 'Orders', icon: 'receipt' },
        {
          href: `${base}/catalogue`,
          label: 'Products',
          icon: 'tag',
          exclude: `${base}/catalogue/shades`,
        },
        { href: `${base}/catalogue/shades`, label: 'Shades', icon: 'palette' },
        { href: `${base}/categories`, label: 'Categories', icon: 'notebook' },
      ]}
      accountLinks={[
        {
          href: `${base}/profile`,
          label: 'Shop details and photo',
          icon: 'store',
        },
        { href: `${base}/settings`, label: 'Shop settings', icon: 'settings' },
        { href: '/shops', label: 'My shops', icon: 'home' },
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
