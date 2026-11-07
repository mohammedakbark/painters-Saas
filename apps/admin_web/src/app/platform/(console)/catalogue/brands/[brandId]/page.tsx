import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { ButtonLink } from '@/components/ui/button-link';
import {
  ColumnSearchFilter,
  ColumnSelectFilter,
} from '@/components/ui/column-filter';
import { type Column, DataTable } from '@/components/ui/data-table';
import { FilterForm } from '@/components/ui/filter-form';
import { Pagination } from '@/components/ui/pagination';
import { SegmentedLinks } from '@/components/ui/segmented-links';
import { SideSheet, SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import { Thumbnail } from '@/components/ui/thumbnail';
import {
  type CatalogueProduct,
  getBrand,
  type ListStatus,
  listCategories,
  listProducts,
} from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { listLink, oneOf, readPaging, text } from '@/lib/list-params';
import { ActiveBadge, orNotFound } from '../../catalogue-parts';
import { ProductForm } from '@/components/catalogue/product-form';
import { createProductAction } from '../../actions';
import { BrandHeader } from './brand-header';

export const metadata: Metadata = { title: 'Brand · Catalogue' };

const FORM = 'product-filters';
const STATUSES = ['all', 'active', 'archived'] as const;
const STATUS_LABELS: Record<ListStatus, string> = {
  all: 'All',
  active: 'Active',
  archived: 'Archived',
};
const DEFAULTS = { status: 'all', page: '1', pageSize: '25' };
const PRODUCT_SHEET = 'add-product';

/** A brand's products (CAT-001; table PLT-003). */
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
  const search = await searchParams;
  const base = `/platform/catalogue/brands/${brandId}`;
  const state = {
    q: text(search.q)?.slice(0, 60),
    categoryId: text(search.categoryId),
    status: oneOf(STATUSES, text(search.status), 'all') as ListStatus,
    ...readPaging(search),
  };

  const brand = await orNotFound(getBrand(token, brandId));
  const [categories, data] = await Promise.all([
    listCategories(token),
    listProducts(token, brandId, state),
  ]);
  const link = (next: Partial<typeof state>) =>
    listLink(base, { ...state, ...next }, DEFAULTS);
  const filtered = Boolean(state.q || state.categoryId);

  const columns: Column<CatalogueProduct>[] = [
    {
      key: 'photo',
      header: 'Photo',
      width: 'w-20',
      cell: (product) => (
        <Thumbnail
          src={product.image?.thumbUrl ?? null}
          alt={`Photo of ${product.name}`}
        />
      ),
    },
    {
      key: 'product',
      header: 'Product',
      cell: (product) => (
        <span className="flex flex-col items-end gap-0.5 desktop:items-start">
          <Link
            href={`/platform/catalogue/products/${product.id}`}
            className="rounded-nav-item text-body-large font-semibold text-text-primary hover:text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            {product.name}
          </Link>
          <span className="text-caption text-text-secondary">
            {product.category.name}
            {product.supportsShades ? ' · with shades' : ''}
          </span>
        </span>
      ),
    },
    {
      key: 'packs',
      header: 'Pack sizes',
      cell: (product) => (
        <span className="flex flex-wrap justify-end gap-1.5 desktop:justify-start">
          {product.packs.map((pack) => (
            <span
              key={pack.id}
              className="rounded-badge border border-border-default px-2.5 py-1 text-caption font-semibold whitespace-nowrap"
            >
              {pack.label}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-36',
      cell: (product) => <ActiveBadge active={product.active} />,
    },
    {
      key: 'action',
      header: 'Action',
      align: 'end',
      width: 'w-28',
      cell: (product) => (
        <ButtonLink
          href={`/platform/catalogue/products/${product.id}`}
          variant="tertiary"
        >
          Edit
        </ButtonLink>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <BrandHeader brand={brand} />
      <SideSheet
        id={PRODUCT_SHEET}
        title="Add a product"
        description={`For ${brand.name}. Add its photo on the product page.`}
        defaultOpen={text(search.add) === 'product'}
      >
        <ProductForm
          action={createProductAction.bind(null, brand.id)}
          categories={categories}
          initial={{
            name: '',
            categoryId: '',
            description: '',
            packs: '',
            supportsShades: false,
          }}
          submitLabel="Add product"
        />
      </SideSheet>

      <div className="flex flex-col gap-3 medium:flex-row medium:items-center medium:justify-between">
        <SegmentedLinks
          label="Product status"
          segments={STATUSES.map((status) => ({
            href: link({ status, page: 1 }),
            label: STATUS_LABELS[status],
            current: state.status === status,
          }))}
        />
        <SideSheetButton sheet={PRODUCT_SHEET} icon="plus">
          Add product
        </SideSheetButton>
      </div>

      <FilterForm
        id={FORM}
        action={base}
        className="grid gap-3 rounded-card border border-card-border bg-card-background p-4 medium:grid-cols-[minmax(0,1fr)_16rem] medium:items-end"
      >
        {state.status !== 'all' ? (
          <input type="hidden" name="status" value={state.status} />
        ) : null}
        <ColumnSearchFilter
          form={FORM}
          name="q"
          label="Search products"
          placeholder="Search products, then press Enter"
          value={state.q}
        />
        <ColumnSelectFilter
          form={FORM}
          name="categoryId"
          label="Category"
          allLabel="All categories"
          value={state.categoryId}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </FilterForm>

      <DataTable
        caption={`${brand.name} products`}
        columns={columns}
        rows={data.items}
        rowKey={(product) => product.id}
        empty={
          <StateMessage
            icon="tag"
            title={filtered ? 'No products match' : 'No products here'}
            description={
              filtered
                ? 'Try another search or category.'
                : 'Add a product, or import a CSV file from the brand price list.'
            }
            action={
              filtered ? (
                <ButtonLink
                  href={link({ q: undefined, categoryId: undefined, page: 1 })}
                  variant="secondary"
                >
                  Clear filters
                </ButtonLink>
              ) : undefined
            }
          />
        }
      />
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        href={(page) => link({ page })}
        form={FORM}
        pageSizes={[10, 25, 50]}
        noun="products"
      />
    </div>
  );
}
