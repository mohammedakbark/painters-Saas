import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { ImageUploadForm } from '@/components/media/image-upload-form';
import {
  ActionButtonForm,
  AddPackForm,
  OwnProductForm,
  PackRowForm,
} from '@/components/shop-catalogue/shop-catalogue-forms';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { orNotFound } from '@/lib/api/or-not-found';
import {
  getShopProduct,
  listCatalogueBrands,
  listCatalogueCategories,
} from '@/lib/api/shop-catalogue';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { paiseToInput } from '@/lib/money';
import {
  addPackAction,
  removePackAction,
  setShopProductStatusAction,
  updateOwnProductAction,
  updatePackAction,
  uploadShopProductImageAction,
} from '../../actions';
import {
  backToProducts,
  ProductBadges,
  productSubtitle,
} from '../../catalogue-parts';

export const metadata: Metadata = { title: 'Product · Catalogue' };

const MAX_PACKS = 12;

export default function ShopProductPage(
  props: PageProps<'/shops/[shopId]/catalogue/products/[productId]'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading the product…" />}>
      <ShopProductView {...props} />
    </Suspense>
  );
}

async function ShopProductView({
  params,
  searchParams,
}: PageProps<'/shops/[shopId]/catalogue/products/[productId]'>) {
  const { shopId, productId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  const query = await searchParams;
  const added = query.added === '1';
  const photoFailed = query.photo === 'failed';
  const product = await orNotFound(getShopProduct(token, shopId, productId));
  const own = product.source === 'own';
  const [categories, brands] = own
    ? await Promise.all([
        listCatalogueCategories(token),
        listCatalogueBrands(token),
      ])
    : [[], []];
  const canEdit = shop.myRole === 'MASTER';
  const active = product.status === 'ACTIVE';

  return (
    <div className="flex flex-col gap-6">
      {added ? (
        <Alert tone="success" title="Product added">
          {product.name} is in your catalogue.
          {photoFailed ? ' The photo was not saved; add it again below.' : null}
        </Alert>
      ) : null}
      <PageHeader
        back={backToProducts(shopId)}
        title={product.name}
        description={productSubtitle(product)}
        actions={<ProductBadges product={product} />}
      />
      {product.catalogueActive ? null : (
        <Alert tone="info" title="Removed from the brand catalogue">
          The platform team removed this product, its brand or its category from
          the brand catalogue. You can keep selling it or archive it.
        </Alert>
      )}

      <div className="grid gap-8 desktop:grid-cols-2">
        <Card
          as="section"
          aria-labelledby="packs-heading"
          className="flex flex-col gap-5 p-6"
        >
          <h2 id="packs-heading" className="text-heading3 font-semibold">
            Pack sizes and prices
          </h2>
          <ul className="flex flex-col gap-5">
            {product.packs.map((pack) => (
              <li
                key={pack.id}
                className="flex flex-col gap-3 border-b border-border-default pb-5 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="text-body-large font-semibold">
                      {pack.label}
                    </span>
                    {pack.available ? (
                      <Badge tone="success">Available</Badge>
                    ) : (
                      <Badge tone="warning">Not available</Badge>
                    )}
                  </span>
                  {canEdit && product.packs.length > 1 ? (
                    <ActionButtonForm
                      action={removePackAction.bind(
                        null,
                        shopId,
                        product.id,
                        pack.id,
                      )}
                      label="Remove"
                      pendingLabel="Removing…"
                      accessibleLabel={`Remove pack size ${pack.label}`}
                    />
                  ) : null}
                </div>
                <PackRowForm
                  // No remount key: the fields keep the saved values and the
                  // row shows "Saved." (a transition submit does not reset it).
                  action={updatePackAction.bind(
                    null,
                    shopId,
                    product.id,
                    pack.id,
                  )}
                  pack={{
                    id: pack.id,
                    label: pack.label,
                    mrp: paiseToInput(pack.mrpPaise),
                    price: paiseToInput(pack.pricePaise),
                    available: pack.available,
                  }}
                  disabled={!canEdit}
                />
              </li>
            ))}
          </ul>
          {canEdit && product.packs.length === 1 ? (
            <p className="text-body text-text-secondary">
              A product keeps at least one pack size. Archive the product to
              stop selling it.
            </p>
          ) : null}
          {canEdit &&
          product.packs.length < MAX_PACKS &&
          (own || product.unlistedCataloguePacks.length > 0) ? (
            <div className="flex flex-col gap-3 border-t border-border-default pt-5">
              <h3 className="text-body-large font-semibold">Add a pack size</h3>
              <AddPackForm
                key={product.packs.length}
                action={addPackAction.bind(null, shopId, product.id)}
                cataloguePacks={own ? null : product.unlistedCataloguePacks}
              />
            </div>
          ) : null}
        </Card>

        <div className="flex flex-col gap-6">
          <Card
            as="section"
            aria-labelledby="details-heading"
            className="flex flex-col gap-4 p-6"
          >
            <h2 id="details-heading" className="text-heading3 font-semibold">
              Details
            </h2>
            {own ? (
              <OwnProductForm
                key={product.updatedAt}
                action={updateOwnProductAction.bind(null, shopId, product.id)}
                categories={categories}
                brands={brands}
                initial={{
                  name: product.name,
                  categoryId: product.category.id,
                  brandId: product.brand?.id ?? '',
                  brandName:
                    product.brand && product.brand.id === null
                      ? product.brand.name
                      : '',
                  description: product.description ?? '',
                  supportsShades: product.supportsShades,
                }}
                withPacks={false}
                submitLabel="Save details"
                disabled={!canEdit}
              />
            ) : (
              <>
                <p className="text-body text-text-secondary">
                  The name, brand, category and description come from the brand
                  catalogue.
                </p>
                <p className="text-body-large">
                  {product.description ?? 'No description.'}
                </p>
                {product.supportsShades ? (
                  <p className="text-body text-text-secondary">
                    Customers choose a shade for this product.
                  </p>
                ) : null}
              </>
            )}
          </Card>

          <Card as="section" className="p-6">
            <ImageUploadForm
              key={product.image?.updatedAt ?? 'none'}
              action={uploadShopProductImageAction.bind(
                null,
                shopId,
                product.id,
              )}
              currentUrl={product.image?.url ?? null}
              canEdit={canEdit}
              title="Product photo"
              description={
                own
                  ? 'A photo of the product you took yourself. JPEG, PNG or WebP, up to 5 MB.'
                  : product.imageSource === 'catalogue'
                    ? "Optional. Customers see the brand catalogue's image unless you add your own photo."
                    : 'Optional. A photo of the product you took yourself. JPEG, PNG or WebP, up to 5 MB.'
              }
              noun="image"
              fieldName="image"
            />
          </Card>

          {canEdit ? (
            <Card as="section" className="flex flex-col gap-3 p-6">
              <h2 className="text-heading3 font-semibold">
                {active ? 'Archive' : 'Restore'}
              </h2>
              <p className="text-body text-text-secondary">
                {active
                  ? 'Archived products are kept but not sold, and do not count towards the 10 products your shop needs.'
                  : 'Restoring puts the product back on sale.'}
              </p>
              <ActionButtonForm
                action={setShopProductStatusAction.bind(
                  null,
                  shopId,
                  product.id,
                  active ? 'ARCHIVED' : 'ACTIVE',
                )}
                label={active ? 'Archive product' : 'Restore product'}
                pendingLabel={active ? 'Archiving…' : 'Restoring…'}
              />
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
