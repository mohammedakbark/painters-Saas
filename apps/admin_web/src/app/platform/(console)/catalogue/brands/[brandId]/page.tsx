import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { ButtonLink } from '@/components/ui/button-link';
import { SelectField } from '@/components/ui/select-field';
import { StateMessage } from '@/components/ui/state-message';
import {
  getBrand,
  listCategories,
  listProducts,
} from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { ActiveBadge, orNotFound } from '../../catalogue-parts';
import { BrandHeader } from './brand-header';

export const metadata: Metadata = { title: 'Brand · Catalogue' };

/** A brand's products (CAT-001). */
export default function BrandProductsPage(
  props: PageProps<'/platform/catalogue/brands/[brandId]'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading the brand…" />}>
      <BrandProducts {...props} />
    </Suspense>
  );
}

async function BrandProducts({
  params,
  searchParams,
}: PageProps<'/platform/catalogue/brands/[brandId]'>) {
  const { token } = await requirePlatformAdmin();
  const { brandId } = await params;
  const query = await searchParams;
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  const categoryId =
    typeof query.categoryId === 'string' ? query.categoryId : '';
  const cursor = typeof query.cursor === 'string' ? query.cursor : undefined;

  const brand = await orNotFound(getBrand(token, brandId));
  const [categories, page] = await Promise.all([
    listCategories(token),
    listProducts(token, brandId, {
      q: q || undefined,
      categoryId: categoryId || undefined,
      cursor,
    }),
  ]);
  const filtered = Boolean(q || categoryId);

  return (
    <div className="flex flex-col gap-6">
      <BrandHeader brand={brand} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form
          method="get"
          role="search"
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="product-search" className="text-body font-medium">
              Search products
            </label>
            <input
              id="product-search"
              name="q"
              defaultValue={q}
              maxLength={60}
              className="min-h-12 rounded-medium border border-border-strong bg-surface-default px-4 text-body-large focus-visible:outline-2 focus-visible:outline-brand-primary"
            />
          </div>
          <SelectField
            label="Category"
            name="categoryId"
            defaultValue={categoryId}
            options={[
              { value: '', label: 'All categories' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <button
            type="submit"
            className="min-h-12 rounded-medium border border-border-strong bg-surface-default px-5 text-body-large font-semibold hover:bg-surface-subtle"
          >
            Filter
          </button>
        </form>
        <ButtonLink href={`/platform/catalogue/brands/${brandId}/products/new`}>
          Add product
        </ButtonLink>
      </div>

      {page.items.length === 0 ? (
        <StateMessage
          title={filtered ? 'No products match' : 'No products yet'}
          description={
            filtered
              ? 'Try another search or category.'
              : 'Add a product, or import a CSV file from the brand price list.'
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-default rounded-large border border-border-default bg-surface-default">
          {page.items.map((product) => (
            <li key={product.id}>
              <Link
                href={`/platform/catalogue/products/${product.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-brand-primary"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-title font-semibold text-text-primary">
                    {product.name}
                  </span>
                  <span className="text-body text-text-secondary">
                    {product.category.name} ·{' '}
                    {product.packs.map((p) => p.label).join(', ')}
                    {product.supportsShades ? ' · shades' : ''}
                  </span>
                </span>
                <ActiveBadge active={product.active} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor ? (
        <div>
          <ButtonLink
            variant="secondary"
            href={`/platform/catalogue/brands/${brandId}?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(categoryId ? { categoryId } : {}),
              cursor: page.nextCursor,
            })}`}
          >
            Next products
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
