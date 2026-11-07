import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { BrandCreateForm } from '@/components/catalogue/brand-forms';
import { PageLoading } from '@/components/layout/page-loading';
import { ButtonLink } from '@/components/ui/button-link';
import { ColumnSearchFilter } from '@/components/ui/column-filter';
import { type Column, DataTable } from '@/components/ui/data-table';
import { FilterForm } from '@/components/ui/filter-form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SegmentedLinks } from '@/components/ui/segmented-links';
import { SideSheet, SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import {
  type Brand,
  type ListStatus,
  listBrands,
} from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { listLink, oneOf, readPaging, text } from '@/lib/list-params';
import { createBrandAction } from './actions';
import { ActiveBadge } from './catalogue-parts';

export const metadata: Metadata = { title: 'Catalogue' };

const BASE = '/platform/catalogue';
const FORM = 'brand-filters';
const STATUSES = ['all', 'active', 'archived'] as const;
const STATUS_LABELS: Record<ListStatus, string> = {
  all: 'All',
  active: 'Active',
  archived: 'Archived',
};
const DEFAULTS = { status: 'all', page: '1', pageSize: '25' };

/** Brands of the shared catalogue (CAT-001, D-030; table PLT-003). */
const BRAND_SHEET = 'add-brand';

export default function CatalogueBrandsPage(
  props: PageProps<'/platform/catalogue'>,
) {
  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Brands, products and shades that every shop can use. Fill them from official shade cards and price lists, by hand or by CSV import."
        actions={
          <>
            <ButtonLink href={`${BASE}/categories`} variant="secondary">
              Manage categories
            </ButtonLink>
            <SideSheetButton sheet={BRAND_SHEET} icon="plus">
              Add brand
            </SideSheetButton>
          </>
        }
      />
      <SideSheet
        id={BRAND_SHEET}
        title="Add a brand"
        description="Then add its products and shades, by hand or by CSV import."
      >
        <BrandCreateForm action={createBrandAction} />
      </SideSheet>
      <Suspense fallback={<PageLoading label="Loading brands…" />}>
        <Brands {...props} />
      </Suspense>
    </>
  );
}

async function Brands({ searchParams }: PageProps<'/platform/catalogue'>) {
  const { token } = await requirePlatformAdmin();
  const search = await searchParams;
  const state = {
    q: text(search.q)?.slice(0, 60),
    status: oneOf(STATUSES, text(search.status), 'all') as ListStatus,
    ...readPaging(search),
  };
  const data = await listBrands(token, state);
  const link = (next: Partial<typeof state>) =>
    listLink(BASE, { ...state, ...next }, DEFAULTS);

  const columns: Column<Brand>[] = [
    {
      key: 'brand',
      header: 'Brand',
      cell: (brand) => (
        <Link
          href={`${BASE}/brands/${brand.id}`}
          className="rounded-nav-item text-body-large font-semibold text-text-primary hover:text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          {brand.name}
        </Link>
      ),
    },
    {
      key: 'products',
      header: 'Products',
      align: 'end',
      width: 'w-32',
      cellClassName: 'tabular-nums',
      cell: (brand) => brand.productCount,
    },
    {
      key: 'shades',
      header: 'Shades',
      align: 'end',
      width: 'w-32',
      cellClassName: 'tabular-nums',
      cell: (brand) => brand.shadeCount,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-36',
      cell: (brand) => <ActiveBadge active={brand.active} />,
    },
    {
      key: 'action',
      header: 'Action',
      align: 'end',
      width: 'w-32',
      cell: (brand) => (
        <ButtonLink href={`${BASE}/brands/${brand.id}`} variant="tertiary">
          Open
        </ButtonLink>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="brands-heading" className="flex flex-col gap-4">
        <h2 id="brands-heading" className="text-heading3 font-semibold">
          Brands
        </h2>
        <div className="flex flex-col gap-3 medium:flex-row medium:items-center medium:justify-between">
          <SegmentedLinks
            label="Brand status"
            segments={STATUSES.map((status) => ({
              href: link({ status, page: 1 }),
              label: STATUS_LABELS[status],
              current: state.status === status,
            }))}
          />
          <FilterForm
            id={FORM}
            action={BASE}
            className="w-full medium:max-w-narrow"
          >
            {state.status !== 'all' ? (
              <input type="hidden" name="status" value={state.status} />
            ) : null}
            <ColumnSearchFilter
              form={FORM}
              name="q"
              label="Search brands"
              placeholder="Search brands, then press Enter"
              value={state.q}
            />
          </FilterForm>
        </div>
        <DataTable
          caption="Brands"
          columns={columns}
          rows={data.items}
          rowKey={(brand) => brand.id}
          empty={
            <StateMessage
              icon="notebook"
              title={
                state.q
                  ? 'No brands match'
                  : state.status === 'archived'
                    ? 'No archived brands'
                    : state.status === 'active'
                      ? 'No active brands'
                      : 'No brands yet'
              }
              description={
                state.q
                  ? `Nothing matches "${state.q}".`
                  : state.status === 'all'
                    ? 'Add the first brand above, then its products and shades.'
                    : undefined
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
          noun="brands"
        />
      </section>
    </div>
  );
}
