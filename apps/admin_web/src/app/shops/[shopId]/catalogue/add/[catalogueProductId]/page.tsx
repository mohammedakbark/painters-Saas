import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { CatalogueListingForm } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { orNotFound } from '@/lib/api/or-not-found';
import {
  getCatalogueProduct,
  listShopProducts,
} from '@/lib/api/shop-catalogue';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { addCatalogueProductAction } from '../../actions';
import { catalogueBase } from '../../catalogue-parts';

export const metadata: Metadata = { title: 'Price a product' };

export default function PriceCatalogueProductPage(
  props: PageProps<'/shops/[shopId]/catalogue/add/[catalogueProductId]'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading the product…" />}>
      <PriceCatalogueProduct {...props} />
    </Suspense>
  );
}

async function PriceCatalogueProduct({
  params,
}: PageProps<'/shops/[shopId]/catalogue/add/[catalogueProductId]'>) {
  const { shopId, catalogueProductId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  const base = catalogueBase(shopId);
  const [product, selling, archived] = await Promise.all([
    orNotFound(getCatalogueProduct(token, catalogueProductId)),
    listShopProducts(token, shopId, { catalogueProductId, limit: 1 }),
    listShopProducts(token, shopId, {
      catalogueProductId,
      status: 'ARCHIVED',
      limit: 1,
    }),
  ]);
  const listed = selling.items[0] ?? archived.items[0];
  const backHref = `${base}/add?brandId=${encodeURIComponent(product.brand.id)}`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={backHref}
        className="text-body font-semibold text-brand-primary underline underline-offset-4"
      >
        {product.brand.name} products
      </Link>
      <PageHeader
        title={product.name}
        description={`${product.brand.name} · ${product.category.name}`}
      />
      <div className="grid gap-6 desktop:grid-cols-3">
        <section className="flex flex-col gap-4 rounded-large border border-border-default bg-surface-default p-6 desktop:col-span-2">
          {listed ? (
            <Alert tone="info" title="Already in your catalogue">
              <Link
                href={`${base}/products/${listed.id}`}
                className="font-semibold text-brand-primary underline underline-offset-4"
              >
                Edit its prices and pack sizes
              </Link>
            </Alert>
          ) : shop.myRole === 'MASTER' ? (
            <>
              <h2 className="text-heading3 font-semibold">
                Pack sizes and your prices
              </h2>
              <p className="text-body text-text-secondary">
                Untick the sizes you don&apos;t sell. The MRP is optional; your
                price can&apos;t be more than the MRP.
              </p>
              <CatalogueListingForm
                action={addCatalogueProductAction.bind(
                  null,
                  shopId,
                  product.id,
                  product.packs.map((pack) => pack.id),
                )}
                packs={product.packs}
                cancelHref={backHref}
              />
            </>
          ) : (
            <Alert tone="info">Only the shop owner can add products.</Alert>
          )}
        </section>
        <aside className="flex flex-col gap-3 rounded-large border border-border-default bg-surface-default p-6">
          {product.image ? (
            // Pre-sized WebP from object storage (see ImageUploadForm).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image.thumbUrl}
              alt={`${product.name} pack`}
              className="aspect-square w-full rounded-medium object-cover"
            />
          ) : null}
          <p className="text-body text-text-secondary">
            {product.description ?? 'No description.'}
          </p>
          {product.supportsShades ? (
            <p className="text-body text-text-secondary">
              Customers choose a shade for this product.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
