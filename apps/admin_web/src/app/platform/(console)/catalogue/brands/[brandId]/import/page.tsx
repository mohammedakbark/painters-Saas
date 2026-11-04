import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ImportForm } from '@/components/catalogue/import-form';
import { PageLoading } from '@/components/layout/page-loading';
import { getBrand } from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { importCatalogueAction } from '../../../actions';
import { orNotFound } from '../../../catalogue-parts';
import { BrandHeader } from '../brand-header';

export const metadata: Metadata = { title: 'Import · Catalogue' };

/** CSV import of a brand's shades or products (CAT-001, D-030). */
export default function BrandImportPage(
  props: PageProps<'/platform/catalogue/brands/[brandId]/import'>,
) {
  return (
    <Suspense fallback={<PageLoading />}>
      <BrandImport {...props} />
    </Suspense>
  );
}

async function BrandImport({
  params,
}: PageProps<'/platform/catalogue/brands/[brandId]/import'>) {
  const { token } = await requirePlatformAdmin();
  const { brandId } = await params;
  const brand = await orNotFound(getBrand(token, brandId));

  return (
    <div className="flex flex-col gap-6">
      <BrandHeader brand={brand} />
      <div className="grid gap-8 desktop:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-large border border-border-default bg-surface-default p-6">
          <ImportForm action={importCatalogueAction.bind(null, brand.id)} />
        </section>
        <aside className="flex flex-col gap-3 text-body text-text-secondary">
          <h2 className="text-heading3 font-semibold text-text-primary">
            How it works
          </h2>
          <p>
            Use the brand&apos;s official shade card or price list. Don&apos;t
            copy data from brand websites.
          </p>
          <p>
            Rows are matched by shade code or product name: new rows are added
            and existing ones updated. Product pack sizes are only added, never
            removed.
          </p>
          <p>If any row has a problem, nothing is imported.</p>
          <p className="flex flex-col gap-1">
            <a
              href="/templates/catalogue-shades.csv"
              download
              className="font-semibold text-brand-primary underline underline-offset-4"
            >
              Download the shades template
            </a>
            <a
              href="/templates/catalogue-products.csv"
              download
              className="font-semibold text-brand-primary underline underline-offset-4"
            >
              Download the products template
            </a>
          </p>
        </aside>
      </div>
    </div>
  );
}
