import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { BrandCreateForm } from '@/components/catalogue/brand-forms';
import { PageLoading } from '@/components/layout/page-loading';
import { ButtonLink } from '@/components/ui/button-link';
import { PageHeader } from '@/components/ui/page-header';
import { StateMessage } from '@/components/ui/state-message';
import { listBrands } from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { countLabel } from '@/lib/format';
import { createBrandAction } from './actions';
import { ActiveBadge } from './catalogue-parts';

export const metadata: Metadata = { title: 'Catalogue' };

/** Brands of the shared catalogue (CAT-001, D-030). */
export default function CatalogueBrandsPage(
  props: PageProps<'/platform/catalogue'>,
) {
  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Brands, products and shades that every shop can use. Fill them from official shade cards and price lists, by hand or by CSV import."
      />
      <Suspense fallback={<PageLoading label="Loading brands…" />}>
        <Brands {...props} />
      </Suspense>
    </>
  );
}

async function Brands({ searchParams }: PageProps<'/platform/catalogue'>) {
  const { token } = await requirePlatformAdmin();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const cursor = typeof params.cursor === 'string' ? params.cursor : undefined;
  const page = await listBrands(token, { q: q || undefined, cursor });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-large border border-border-default bg-surface-default p-6">
        <BrandCreateForm action={createBrandAction} />
      </section>

      <section aria-labelledby="brands-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="brands-heading" className="text-heading3 font-semibold">
            Brands
          </h2>
          <Link
            href="/platform/catalogue/categories"
            className="text-body font-semibold text-brand-primary underline underline-offset-4"
          >
            Manage categories
          </Link>
        </div>
        <form
          method="get"
          role="search"
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor="brand-search" className="text-body font-medium">
              Search brands
            </label>
            <input
              id="brand-search"
              name="q"
              defaultValue={q}
              maxLength={60}
              className="min-h-12 rounded-medium border border-border-strong bg-surface-default px-4 text-body-large focus-visible:outline-2 focus-visible:outline-brand-primary"
            />
          </div>
          <button
            type="submit"
            className="min-h-12 rounded-medium border border-border-strong bg-surface-default px-5 text-body-large font-semibold hover:bg-surface-subtle"
          >
            Search
          </button>
        </form>

        {page.items.length === 0 ? (
          <StateMessage
            title={q ? 'No brands match' : 'No brands yet'}
            description={
              q
                ? `Nothing matches "${q}".`
                : 'Add the first brand above, then its products and shades.'
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border-default rounded-large border border-border-default bg-surface-default">
            {page.items.map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/platform/catalogue/brands/${brand.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-brand-primary"
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-title font-semibold text-text-primary">
                      {brand.name}
                    </span>
                    <span className="text-body text-text-secondary">
                      {countLabel(brand.productCount, 'product')} ·{' '}
                      {countLabel(brand.shadeCount, 'shade')}
                    </span>
                  </span>
                  <ActiveBadge active={brand.active} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {page.nextCursor ? (
          <div>
            <ButtonLink
              href={`/platform/catalogue?${new URLSearchParams({ ...(q ? { q } : {}), cursor: page.nextCursor })}`}
              variant="secondary"
            >
              Next brands
            </ButtonLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}
