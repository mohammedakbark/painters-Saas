import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ProductForm } from '@/components/catalogue/product-form';
import { ActiveToggleForm } from '@/components/catalogue/shade-forms';
import { PageLoading } from '@/components/layout/page-loading';
import { ImageUploadForm } from '@/components/media/image-upload-form';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { getProduct, listCategories } from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { formatPackList } from '@/lib/catalogue/packs';
import {
  setProductActiveAction,
  updateProductAction,
  uploadProductImageAction,
} from '../../actions';
import { ActiveBadge, orNotFound } from '../../catalogue-parts';

export const metadata: Metadata = { title: 'Product · Catalogue' };

export default function ProductPage(
  props: PageProps<'/platform/catalogue/products/[productId]'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading the product…" />}>
      <Product {...props} />
    </Suspense>
  );
}

async function Product({
  params,
}: PageProps<'/platform/catalogue/products/[productId]'>) {
  const { token } = await requirePlatformAdmin();
  const { productId } = await params;
  const [product, categories] = await Promise.all([
    orNotFound(getProduct(token, productId)),
    listCategories(token),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/platform/catalogue/brands/${product.brand.id}`}
        className="text-body font-semibold text-brand-primary underline underline-offset-4"
      >
        {product.brand.name} products
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <PageHeader title={product.name} description={product.brand.name} />
        <ActiveBadge active={product.active} />
      </div>

      <div className="grid gap-8 desktop:grid-cols-2">
        <Card as="section" className="p-6">
          <ProductForm
            // Remount after a save so the form shows the stored values.
            key={JSON.stringify([
              product.name,
              product.category.id,
              product.packs.length,
            ])}
            action={updateProductAction.bind(null, product.id)}
            categories={categories}
            initial={{
              name: product.name,
              categoryId: product.category.id,
              description: product.description ?? '',
              packs: formatPackList(product.packs),
              supportsShades: product.supportsShades,
            }}
            submitLabel="Save product"
            cancelHref={`/platform/catalogue/brands/${product.brand.id}`}
          />
        </Card>
        <div className="flex flex-col gap-6">
          <Card as="section" className="p-6">
            <ImageUploadForm
              key={product.image?.updatedAt ?? 'none'}
              action={uploadProductImageAction.bind(null, product.id)}
              currentUrl={product.image?.url ?? null}
              canEdit
              title="Product image"
              description="A photo of the tin or pack you took yourself or have permission to use. JPEG, PNG or WebP, up to 5 MB."
              noun="image"
              fieldName="image"
            />
          </Card>
          <Card as="section" className="flex flex-col gap-3 p-6">
            <h2 className="text-heading3 font-semibold">
              {product.active ? 'Archive' : 'Restore'}
            </h2>
            <p className="text-body text-text-secondary">
              {product.active
                ? 'Archived products are hidden from the catalogue that shops add products from.'
                : 'Restoring makes the product available to shops again.'}
            </p>
            <ActiveToggleForm
              action={setProductActiveAction.bind(
                null,
                product.id,
                !product.active,
              )}
              active={product.active}
              label={`product ${product.name}`}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
