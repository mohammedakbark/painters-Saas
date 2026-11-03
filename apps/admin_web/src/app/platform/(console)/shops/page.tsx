import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { listRegisteredShops } from '@/lib/api/platform-shops';
import { ApiError } from '@/lib/api/problem';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { ShopRegistryList } from './shop-registry-list';

export const metadata: Metadata = { title: 'Shops · Platform · Admin portal' };

export default async function PlatformShopsPage({
  searchParams,
}: PageProps<'/platform/shops'>) {
  const { token } = await requirePlatformAdmin();
  const { cursor } = await searchParams;
  const cursorValue = typeof cursor === 'string' && cursor ? cursor : undefined;
  const page = await listOrFirstPage(token, cursorValue);

  return (
    <>
      <PageHeader
        title="Shops"
        description="Every registered shop, newest first. Read-only for now; review and approval come later."
      />
      <ShopRegistryList page={page.data} isFirstPage={page.isFirstPage} />
    </>
  );
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
