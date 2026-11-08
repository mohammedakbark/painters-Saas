import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { SelectField } from '@/components/ui/select-field';
import { StateMessage } from '@/components/ui/state-message';
import { UrlForm, UrlFormSubmit } from '@/components/ui/url-form';
import {
  browseBrandProducts,
  listCatalogueBrands,
} from '@/lib/api/shop-catalogue';
import { getShopOnboarding } from '@/lib/api/shop-profile';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { addCatalogueProductsAction } from '../actions';
import { backToProducts, catalogueBase } from '../catalogue-parts';
import { QuickAddForm } from './quick-add-form';

export const metadata: Metadata = { title: 'Quick start' };

export default function AddFromCataloguePage(
  props: PageProps<'/shops/[shopId]/catalogue/add'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading the brand catalogue…" />}>
      <AddFromCatalogue {...props} />
    </Suspense>
  );
}

const text = (value: string | string[] | undefined) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

async function AddFromCatalogue({
  params,
  searchParams,
}: PageProps<'/shops/[shopId]/catalogue/add'>) {
  const { shopId } = await params;
  await requireShopAccess(shopId);
  const token = await requireShopSession();
  const search = await searchParams;
  const brands = await listCatalogueBrands(token);
  const base = catalogueBase(shopId);

  if (brands.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          back={backToProducts(shopId)}
          title="Add from brand catalogue"
        />
        <StateMessage
          icon="notebook"
          title="The brand catalogue is empty"
          description="The platform team has not added brands yet. You can add your own products meanwhile."
          action={
            <ButtonLink href={`${base}?add=product`}>
              Add your own product
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const requested = text(search.brandId);
  const brand = brands.find((b) => b.id === requested) ?? brands[0];
  const q = text(search.q)?.slice(0, 60);
  const cursor = text(search.cursor);
  const page = await browseBrandProducts(token, shopId, {
    brandId: brand.id,
    q,
    cursor,
  });
  const unlisted = page.items.filter((item) => !item.listedProductId);
  const listed = page.items.filter((item) => item.listedProductId);
  const products = (await getShopOnboarding(token, shopId)).items.find(
    (item) => item.key === 'products',
  )?.progress;
  const nextHref = page.nextCursor
    ? `${base}/add?${new URLSearchParams({
        brandId: brand.id,
        ...(q ? { q } : {}),
        cursor: page.nextCursor,
      }).toString()}`
    : null;
  // Cursor paging has no page numbers; offer the way back to the start.
  const firstHref = cursor
    ? `${base}/add?${new URLSearchParams({
        brandId: brand.id,
        ...(q ? { q } : {}),
      }).toString()}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={backToProducts(shopId)}
        title="Quick start"
        description="Add several brand products at once: pick a brand, type your price for each pack size you sell, and add them together."
      />
      {products && products.current < products.required ? (
        <ProductProgress
          current={products.current}
          required={products.required}
        />
      ) : null}
      <UrlForm
        action={`${base}/add`}
        role="search"
        className="flex flex-col gap-3 medium:flex-row medium:items-end"
      >
        <div className="w-full medium:max-w-form">
          <SelectField
            key={brand.id}
            label="Brand"
            name="brandId"
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
            defaultValue={brand.id}
          />
        </div>
        <div className="w-full medium:max-w-form">
          <Field
            key={q ?? ''}
            label="Product name (optional)"
            name="q"
            type="search"
            maxLength={60}
            defaultValue={q}
          />
        </div>
        <UrlFormSubmit
          variant="secondary"
          className="shrink-0"
          pendingLabel="Loading…"
        >
          Show products
        </UrlFormSubmit>
      </UrlForm>

      {page.items.length === 0 ? (
        <StateMessage
          title={
            q
              ? 'No products match your search'
              : `No ${brand.name} products yet`
          }
          description="Products you don't find here can be added as your own."
          action={
            <ButtonLink href={`${base}?add=product`} variant="secondary">
              Add your own product
            </ButtonLink>
          }
        />
      ) : (
        <>
          {unlisted.length > 0 ? (
            <QuickAddForm
              // A new brand or search starts a fresh form (no prices carried
              // over from the previous list).
              key={`${brand.id}:${q ?? ''}`}
              action={addCatalogueProductsAction.bind(
                null,
                shopId,
                unlisted.map(({ product }) => ({
                  catalogueProductId: product.id,
                  name: product.name,
                  packIds: product.packs.map((pack) => pack.id),
                })),
              )}
              rows={unlisted.map(({ product }) => ({
                catalogueProductId: product.id,
                name: product.name,
                categoryName: product.category.name,
                packs: product.packs.map((pack) => ({
                  id: pack.id,
                  label: pack.label,
                })),
              }))}
            />
          ) : null}
          {listed.length > 0 ? (
            <section
              aria-labelledby="listed-heading"
              className="flex flex-col gap-3"
            >
              <h2 id="listed-heading" className="text-heading3 font-semibold">
                Already in your catalogue
              </h2>
              <ul className="grid gap-3 desktop:grid-cols-2">
                {listed.map(({ product, listedProductId }) => (
                  <Card
                    as="li"
                    key={product.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold text-text-primary">
                        {product.name}
                      </span>
                      <span className="text-caption text-text-secondary">
                        {product.category.name}
                      </span>
                    </span>
                    <ButtonLink
                      href={`${base}/products/${listedProductId}`}
                      variant="tertiary"
                      aria-label={`Edit prices of ${product.name}`}
                      className="shrink-0"
                    >
                      Edit prices
                    </ButtonLink>
                  </Card>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
      {nextHref || firstHref ? (
        <div className="flex flex-wrap gap-3">
          {firstHref ? (
            <ButtonLink href={firstHref} variant="tertiary">
              Back to the first page
            </ButtonLink>
          ) : null}
          {nextHref ? (
            <ButtonLink href={nextHref} variant="secondary">
              Next page
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Progress toward the products a shop needs before review (D-012). */
function ProductProgress({
  current,
  required,
}: {
  current: number;
  required: number;
}) {
  const percent = Math.min(100, Math.round((current / required) * 100));
  return (
    <Card
      as="section"
      aria-labelledby="progress-heading"
      className="flex flex-col gap-3 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="progress-heading" className="text-title font-semibold">
          {current} of {required} products added
        </h2>
        <p className="text-body text-text-secondary">
          Your shop needs at least {required} products before it can be
          reviewed.
        </p>
      </div>
      <div
        role="progressbar"
        aria-labelledby="progress-heading"
        aria-valuemin={0}
        aria-valuemax={required}
        aria-valuenow={current}
        className="h-2 overflow-hidden rounded-badge bg-border-default"
      >
        <div
          className="h-full rounded-badge bg-brand-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </Card>
  );
}
