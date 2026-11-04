import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { listRegisteredShops } from '@/lib/api/platform-shops';
import { ApiError } from '@/lib/api/problem';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { ShopRegistryList } from './shop-registry-list';

export const metadata: Metadata = { title: 'Shops' };

/** Request data is read inside Suspense so console navigation is instant. */
export default function PlatformShopsPage(props: PageProps<'/platform/shops'>) {
  return (
    <>
      <PageHeader
        title="Shops"
        description="Every registered shop, newest first. Read-only for now; review and approval come later."
      />
      <Suspense fallback={<PageLoading label="Loading shops…" />}>
        <Shops {...props} />
      </Suspense>
    </>
  );
}

async function Shops({ searchParams }: PageProps<'/platform/shops'>) {
  const { token } = await requirePlatformAdmin();
  const { cursor } = await searchParams;
  const cursorValue = typeof cursor === 'string' && cursor ? cursor : undefined;
  const page = await listOrFirstPage(token, cursorValue);
  return <ShopRegistryList page={page.data} isFirstPage={page.isFirstPage} />;
}

/** A tampered or stale cursor (400 from the API) falls back to the first page. */
async function listOrFirstPage(token: string, cursor: string | undefined) {
  try {
    return {
      data: await listRegisteredShops(token, cursor),
      isFirstPage: !cursor,
    };
  } catch (error) {
    if (cursor && error instanceof ApiError && error.status === 400) {
      return { data: await listRegisteredShops(token), isFirstPage: true };
    }
    throw error;
  }
}
