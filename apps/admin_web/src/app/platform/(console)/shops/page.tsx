import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import {
  ColumnSearchFilter,
  ColumnSelectFilter,
} from '@/components/ui/column-filter';
import { type Column, DataTable } from '@/components/ui/data-table';
import { FilterForm } from '@/components/ui/filter-form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SegmentedLinks } from '@/components/ui/segmented-links';
import { StateMessage } from '@/components/ui/state-message';
import { Thumbnail } from '@/components/ui/thumbnail';
import {
  LIST_PAGE_SIZES,
  listRegisteredShops,
  REGISTRY_SORTS,
  type RegistryParams,
  type ShopRegistryEntry,
} from '@/lib/api/platform-shops';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { formatDate } from '@/lib/format';
import { listLink, oneOf, readPaging, text } from '@/lib/list-params';
import { formatIndianMobile } from '@/lib/phone';
import { SHOP_STATUSES, shopStatusLabel } from '@/lib/shops/labels';

export const metadata: Metadata = { title: 'Shops' };

const BASE = '/platform/shops';
const FORM = 'shop-filters';
const DEFAULTS = { sort: 'newest', page: '1', pageSize: '25' };
const SORT_OPTIONS = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
];

/** Request data is read inside Suspense so console navigation is instant. */
export default function PlatformShopsPage(props: PageProps<'/platform/shops'>) {
  return (
    <>
      <PageHeader
        title="Shops"
        description="Every registered shop. Search by shop, owner or mobile number."
      />
      <Suspense fallback={<PageLoading label="Loading shops…" />}>
        <Shops {...props} />
      </Suspense>
    </>
  );
}

async function Shops({ searchParams }: PageProps<'/platform/shops'>) {
  const { token } = await requirePlatformAdmin();
  const search = await searchParams;
  const status = text(search.status);
  const state: RegistryParams = {
    q: text(search.q)?.slice(0, 60),
    status: (SHOP_STATUSES as readonly string[]).includes(status ?? '')
      ? (status as RegistryParams['status'])
      : undefined,
    sort: oneOf(REGISTRY_SORTS, text(search.sort), 'newest'),
    ...readPaging(search),
  };
  const data = await listRegisteredShops(token, state);
  const link = (next: Partial<RegistryParams>) =>
    listLink(BASE, { ...state, ...next }, DEFAULTS);

  const columns: Column<ShopRegistryEntry>[] = [
    {
      key: 'photo',
      header: 'Photo',
      width: 'w-20',
      cell: (shop) => (
        <Thumbnail
          src={shop.photoThumbUrl}
          alt={`Photo of ${shop.name}`}
          placeholder="store"
        />
      ),
    },
    {
      key: 'shop',
      header: 'Shop',
      cell: (shop) => (
        <span className="flex flex-col items-end gap-0.5 desktop:items-start">
          <Link
            href={`${BASE}/${shop.id}`}
            className="rounded-nav-item text-body-large font-semibold text-text-primary hover:text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            {shop.name}
          </Link>
          <span className="text-caption text-text-secondary">
            Registered {formatDate(shop.createdAt)}
          </span>
        </span>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      cell: (shop) =>
        shop.master ? (
          <span className="flex flex-col items-end desktop:items-start">
            <span className="font-medium">{shop.master.name ?? 'No name'}</span>
            {shop.master.phone ? (
              <span className="text-caption text-text-secondary tabular-nums">
                {formatIndianMobile(shop.master.phone)}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-text-secondary">No owner</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-48',
      cellClassName: 'whitespace-nowrap',
      cell: (shop) => {
        const label = shopStatusLabel(shop.status);
        return <Badge tone={label.tone}>{label.label}</Badge>;
      },
    },
    {
      key: 'action',
      header: 'Action',
      align: 'end',
      width: 'w-36',
      cell: (shop) =>
        shop.status === 'PENDING_REVIEW' ? (
          <ButtonLink href={`/platform/reviews/${shop.id}`}>Review</ButtonLink>
        ) : (
          <ButtonLink href={`${BASE}/${shop.id}`} variant="tertiary">
            View
          </ButtonLink>
        ),
    },
  ];

  const filtered = Boolean(state.q);
  return (
    <div className="flex flex-col gap-6">
      <SegmentedLinks
        label="Shop status"
        segments={[undefined, ...SHOP_STATUSES].map((value) => ({
          href: link({ status: value, page: 1 }),
          label: `${value ? shopStatusLabel(value).label : 'All'} (${
            data.statusCounts[value ?? 'ALL']
          })`,
          current: state.status === value,
        }))}
      />
      <FilterForm
        id={FORM}
        action={BASE}
        className="grid gap-3 rounded-card border border-card-border bg-card-background p-4 medium:grid-cols-[minmax(0,1fr)_14rem] medium:items-end"
      >
        {state.status ? (
          <input type="hidden" name="status" value={state.status} />
        ) : null}
        <ColumnSearchFilter
          form={FORM}
          name="q"
          label="Search shops"
          placeholder="Shop name, owner or mobile, then press Enter"
          value={state.q}
        />
        <ColumnSelectFilter
          form={FORM}
          name="sort"
          label="Sort"
          allLabel="Newest first"
          value={state.sort === 'newest' ? undefined : state.sort}
          options={SORT_OPTIONS}
        />
      </FilterForm>
      {filtered ? (
        <div className="-mt-3 flex justify-end">
          <ButtonLink href={link({ q: undefined, page: 1 })} variant="tertiary">
            Clear search
          </ButtonLink>
        </div>
      ) : null}
      <DataTable
        caption="Registered shops"
        columns={columns}
        rows={data.items}
        rowKey={(shop) => shop.id}
        empty={
          <StateMessage
            icon="store"
            title={
              filtered ? 'No shops match this search' : 'No shops here yet'
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
        pageSizes={LIST_PAGE_SIZES}
        noun="shops"
      />
    </div>
  );
}
