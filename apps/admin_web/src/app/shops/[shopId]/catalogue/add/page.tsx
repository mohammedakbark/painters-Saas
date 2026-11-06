import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { SelectField } from '@/components/ui/select-field';
import { StateMessage } from '@/components/ui/state-message';
import {
  browseBrandProducts,
  listCatalogueBrands,
} from '@/lib/api/shop-catalogue';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { backToProducts, catalogueBase } from '../catalogue-parts';

export const metadata: Metadata = { title: 'Add from brand catalogue' };

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
            <ButtonLink href={`${base}/new`}>Add your own product</ButtonLink>
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
  const nextHref = page.nextCursor
    ? `${base}/add?${new URLSearchParams({
        brandId: brand.id,
        ...(q ? { q } : {}),
        cursor: page.nextCursor,
      }).toString()}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={backToProducts(shopId)}
        title="Add from brand catalogue"
        description="Choose a product, then tick the pack sizes you sell and enter your prices."
      />
      <form
        method="get"
        action={`${base}/add`}
        role="search"
        className="flex flex-col gap-3 medium:flex-row medium:items-end"
      >
        <div className="w-full medium:max-w-form">
          <SelectField
            label="Brand"
            name="brandId"
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
            defaultValue={brand.id}
          />
        </div>
        <div className="w-full medium:max-w-form">
          <Field
            label="Product name (optional)"
            name="q"
            type="search"
            maxLength={60}
            defaultValue={q}
          />
        </div>
        <Button type="submit" variant="secondary" className="shrink-0">
          Show products
        </Button>
      </form>

      {page.items.length === 0 ? (
        <StateMessage
          title={
            q
              ? 'No products match your search'
              : `No ${brand.name} products yet`
          }
          description="Products you don't find here can be added as your own."
          action={
            <ButtonLink href={`${base}/new`} variant="secondary">
              Add your own product
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid gap-4 desktop:grid-cols-2">
          {page.items.map(({ product, listedProductId }) => (
            <Card
              as="li"
              key={product.id}
              className="flex flex-col gap-4 p-5 medium:flex-row medium:items-center medium:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-title font-semibold text-text-primary">
                  {product.name}
                </h2>
                <p className="text-body text-text-secondary">
                  {product.category.name} ·{' '}
                  {product.packs.map((pack) => pack.label).join(', ')}
                </p>
              </div>
              {listedProductId ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge tone="success">In your catalogue</Badge>
                  <ButtonLink
                    href={`${base}/products/${listedProductId}`}
                    variant="tertiary"
                    aria-label={`Edit prices of ${product.name}`}
                  >
                    Edit prices
                  </ButtonLink>
                </div>
              ) : (
                <ButtonLink
                  href={`${base}/add/${product.id}`}
                  variant="secondary"
                  aria-label={`Choose ${product.name}`}
                  className="group shrink-0"
                >
                  Choose
                  <Icon
                    name="arrowRight"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </ButtonLink>
              )}
            </Card>
          ))}
        </ul>
      )}
      {nextHref ? (
        <div>
          <ButtonLink href={nextHref} variant="secondary">
            Next page
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
