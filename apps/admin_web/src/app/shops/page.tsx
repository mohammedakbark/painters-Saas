import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { CardLink } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { StateMessage } from '@/components/ui/state-message';
import { SubmitButton } from '@/components/ui/submit-button';
import { getShopUser } from '@/lib/auth/shop-access';
import { formatIndianMobile } from '@/lib/phone';
import { shopRoleLabel, shopStatusLabel } from '@/lib/shops/labels';
import { signOutOfShop } from './actions';

export const metadata: Metadata = { title: 'Your shops' };

/** The shops the signed-in user belongs to, and the way to register a new one. */
export default function MyShopsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-content flex-col gap-6 px-4 py-8 medium:px-6">
      <Suspense
        fallback={
          <p
            className="flex items-center gap-3 text-body-large text-text-secondary"
            aria-busy="true"
          >
            <Spinner />
            <span>Loading your shops…</span>
          </p>
        }
      >
        <MyShops />
      </Suspense>
    </main>
  );
}

async function MyShops() {
  const me = await getShopUser();
  const account = me.phone ? formatIndianMobile(me.phone) : (me.email ?? '');

  return (
    <>
      <PageHeader
        title="Your shops"
        description={account ? `Signed in as ${account}.` : undefined}
        actions={
          <>
            {me.shopMemberships.length > 0 ? (
              <ButtonLink href="/shops/new">Register a shop</ButtonLink>
            ) : null}
            <form action={signOutOfShop}>
              <SubmitButton variant="secondary" pendingLabel="Signing out…">
                Sign out
              </SubmitButton>
            </form>
          </>
        }
      />

      {me.shopMemberships.length === 0 ? (
        <StateMessage
          title="You haven't registered a shop yet"
          description="Register your paint shop to start setting up your storefront. It stays private until the platform team approves it."
          action={<ButtonLink href="/shops/new">Register a shop</ButtonLink>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {me.shopMemberships.map((membership) => {
            const status = shopStatusLabel(membership.shopStatus);
            return (
              <li key={membership.shopId}>
                <CardLink
                  href={`/shops/${membership.shopId}`}
                  className="flex flex-col gap-2 px-5 py-4 medium:flex-row medium:items-center medium:justify-between"
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-title font-semibold text-text-primary">
                      {membership.shopName}
                    </span>
                    <span className="text-body text-text-secondary">
                      {shopRoleLabel(membership.role)}
                    </span>
                  </span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </CardLink>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
