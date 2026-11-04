import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { OwnProductForm } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import {
  listCatalogueBrands,
  listCatalogueCategories,
} from '@/lib/api/shop-catalogue';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { addOwnProductAction } from '../actions';
import { BackToProducts, catalogueBase } from '../catalogue-parts';

export const metadata: Metadata = { title: 'Add your own product' };

export default function NewOwnProductPage(
  props: PageProps<'/shops/[shopId]/catalogue/new'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading…" />}>
      <NewOwnProduct {...props} />
    </Suspense>
  );
}

async function NewOwnProduct({
  params,
}: PageProps<'/shops/[shopId]/catalogue/new'>) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  const [categories, brands] = await Promise.all([
    listCatalogueCategories(token),
    listCatalogueBrands(token),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <BackToProducts shopId={shopId} />
      <PageHeader
        title="Add your own product"
        description="For products that are not in the brand catalogue, such as local brands, tools or accessories."
      />
      <section className="max-w-content rounded-large border border-border-default bg-surface-default p-6">
        {shop.myRole !== 'MASTER' ? (
          <Alert tone="info">Only the shop owner can add products.</Alert>
        ) : categories.length === 0 ? (
          <Alert tone="info" title="No categories yet">
            The platform team has not set up product categories yet. Try again
            later.
          </Alert>
        ) : (
          <OwnProductForm
            action={addOwnProductAction.bind(null, shopId)}
            categories={categories}
            brands={brands}
            initial={{
              name: '',
              categoryId: '',
              brandId: '',
              brandName: '',
              description: '',
              supportsShades: false,
            }}
            withPacks
            submitLabel="Add product"
            cancelHref={catalogueBase(shopId)}
          />
        )}
      </section>
    </div>
  );
}
