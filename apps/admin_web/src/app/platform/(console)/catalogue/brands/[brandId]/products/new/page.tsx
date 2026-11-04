import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductForm } from '@/components/catalogue/product-form';
import { PageLoading } from '@/components/layout/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { getBrand, listCategories } from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { createProductAction } from '../../../../actions';
import { orNotFound } from '../../../../catalogue-parts';

export const metadata: Metadata = { title: 'New product · Catalogue' };

export default function NewProductPage(
  props: PageProps<'/platform/catalogue/brands/[brandId]/products/new'>,
) {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewProduct {...props} />
    </Suspense>
  );
}

async function NewProduct({
  params,
}: PageProps<'/platform/catalogue/brands/[brandId]/products/new'>) {
  const { token } = await requirePlatformAdmin();
  const { brandId } = await params;
  const [brand, categories] = await Promise.all([
    orNotFound(getBrand(token, brandId)),
    listCategories(token),
  ]);

  return (
    <>
      <PageHeader title="New product" description={`For ${brand.name}.`} />
      <div className="max-w-content rounded-large border border-border-default bg-surface-default p-6">
        <ProductForm
          action={createProductAction.bind(null, brand.id)}
          categories={categories}
          initial={{
            name: '',
            categoryId: '',
            description: '',
            packs: '',
            supportsShades: false,
          }}
          submitLabel="Add product"
          cancelHref={`/platform/catalogue/brands/${brand.id}`}
        />
      </div>
    </>
  );
}
