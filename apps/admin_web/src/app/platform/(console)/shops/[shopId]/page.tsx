import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { PageHeader } from '@/components/ui/page-header';
import {
  getRegisteredShop,
  type ShopRegistryEntry,
} from '@/lib/api/platform-shops';
import { ApiError } from '@/lib/api/problem';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { formatDateTime } from '@/lib/format';
import { formatIndianMobile } from '@/lib/phone';
import { shopStatusLabel } from '@/lib/shops/labels';

export const metadata: Metadata = { title: 'Shop' };

/** Request data is read inside Suspense so console navigation is instant. */
export default function PlatformShopPage(
  props: PageProps<'/platform/shops/[shopId]'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading the shop…" />}>
      <PlatformShop {...props} />
    </Suspense>
  );
}

async function PlatformShop({ params }: PageProps<'/platform/shops/[shopId]'>) {
  const { token } = await requirePlatformAdmin();
  const { shopId } = await params;
  const shop = await findShop(token, shopId);
  const status = shopStatusLabel(shop.status);

  return (
    <>
      <PageHeader
        title={shop.name}
        description={status.description}
        actions={
          <ButtonLink href="/platform/shops" variant="secondary">
            All shops
          </ButtonLink>
        }
      />
      <section className="rounded-large border border-border-default bg-surface-default p-6">
        <h2 className="sr-only">Registration details</h2>
        <dl className="grid gap-x-8 gap-y-4 medium:grid-cols-2">
          <Fact label="Status">
            <Badge tone={status.tone}>{status.label}</Badge>
          </Fact>
          <Fact label="Owner (master account)">
            {shop.master?.name ?? 'Unknown'}
          </Fact>
          <Fact label="Owner mobile">
            {shop.master?.phone ? formatIndianMobile(shop.master.phone) : '—'}
          </Fact>
          <Fact label="Registered">{formatDateTime(shop.createdAt)}</Fact>
          <Fact label="Last updated">{formatDateTime(shop.updatedAt)}</Fact>
          <Fact label="Shop ID">
            <span className="font-mono text-caption break-all">{shop.id}</span>
          </Fact>
        </dl>
      </section>
    </>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption font-medium tracking-wide text-text-secondary uppercase">
        {label}
      </dt>
      <dd className="text-body-large text-text-primary">{children}</dd>
    </div>
  );
}

async function findShop(
  token: string,
  shopId: string,
): Promise<ShopRegistryEntry> {
  try {
    return await getRegisteredShop(token, shopId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
