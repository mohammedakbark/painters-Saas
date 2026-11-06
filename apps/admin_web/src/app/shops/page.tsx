import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MyShopsLoading, MyShopsView } from '@/components/shops/my-shops-view';
import { getShopUser } from '@/lib/auth/shop-access';
import { formatIndianMobile } from '@/lib/phone';
import { signOutOfShop } from './actions';

export const metadata: Metadata = { title: 'Your shops' };

/** The shops the signed-in user belongs to, and the way to register a new one (WEB-003). */
export default function MyShopsPage() {
  return (
    <Suspense fallback={<MyShopsLoading />}>
      <MyShops />
    </Suspense>
  );
}

// Memberships come from the API for the verified session (getShopUser), never
// from the URL or the client.
async function MyShops() {
  const me = await getShopUser();
  const account = me.phone ? formatIndianMobile(me.phone) : (me.email ?? '');
  return (
    <MyShopsView
      account={account}
      memberships={me.shopMemberships}
      signOutAction={signOutOfShop}
    />
  );
}
