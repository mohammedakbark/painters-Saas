import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import {
  listCatalogueBrands,
  listCatalogueCategories,
} from '@/lib/api/shop-catalogue';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { backToProducts, catalogueBase } from '../catalogue-parts';
import { AddProductFlow } from './add-product-flow';

export const metadata: Metadata = { title: 'Add product' };

export default function AddProductPage(
  props: PageProps<'/shops/[shopId]/catalogue/new'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading…" />}>
      <AddProduct {...props} />
    </Suspense>
  );
}

async function AddProduct({
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
      <PageHeader
        back={backToProducts(shopId)}
        title="Add product"
        description="Find the product in the brand catalogue, or add it as a new product. Then set your prices."
      />
      {shop.myRole !== 'MASTER' ? (
        <Alert tone="info">Only the shop owner can add products.</Alert>
      ) : categories.length === 0 ? (
        <Alert tone="info" title="No categories yet">
          The platform team has not set up product categories yet. Try again
          later.
        </Alert>
      ) : (
        <div className="max-w-content">
          <AddProductFlow
            shopId={shopId}
            base={catalogueBase(shopId)}
            categories={categories}
            brands={brands}
          />
        </div>
      )}
    </div>
  );
}
