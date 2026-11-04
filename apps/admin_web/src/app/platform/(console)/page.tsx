import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';

/** Request data is read inside Suspense so console navigation is instant. */
export default function PlatformOverviewPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PlatformOverview />
    </Suspense>
  );
}

async function PlatformOverview() {
  const admin = await requirePlatformAdmin();

  return (
    <>
      <PageHeader
        title="Platform overview"
        description={admin.email ? `Signed in as ${admin.email}.` : undefined}
      />
      <Card as="section" className="p-6">
        <h2 className="text-heading3 font-semibold">Platform tools</h2>
        <p className="mt-2 text-body-large text-text-secondary">
          Shops: the registry of registered shops. Catalogue: the brands,
          products and shades every shop can use. More tools appear in the
          navigation as they are released.
        </p>
      </Card>
    </>
  );
}
