import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import {
  ColumnSearchFilter,
  ColumnSelectFilter,
} from '@/components/ui/column-filter';
import { type Column, DataTable, SortHeader } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { FilterForm } from '@/components/ui/filter-form';
import { Pagination } from '@/components/ui/pagination';
import { SegmentedLinks } from '@/components/ui/segmented-links';
import { StateMessage } from '@/components/ui/state-message';
import {
  listPackRows,
  PACK_ROW_PAGE_SIZES,
  PACK_ROW_SORTS,
  PACK_TABS,
  type PackRow,
  type PackRowParams,
} from '@/lib/api/shop-catalogue';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { formatRupees } from '@/lib/money';
import { setPackAvailableAction, setShopProductStatusAction } from './actions';
import { RowActions } from './row-actions';
import { catalogueBase } from './catalogue-parts';

export const metadata: Metadata = { title: 'Products' };

const FORM = 'catalogue-filters';

const TAB_LABELS: Record<PackRowParams['tab'], string> = {
  ALL: 'All',
  VOLUME: 'Litres',
  WEIGHT: 'Kilograms',
  PIECE: 'Pieces',
};

const AVAILABILITY = [
  { value: 'true', label: 'Available' },
  { value: 'false', label: 'Not available' },
];

export default function CataloguePage(
  props: PageProps<'/shops/[shopId]/catalogue'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading your catalogue…" />}>
      <Catalogue {...props} />
    </Suspense>
  );
}

type Search = Record<string, string | string[] | undefined>;

const text = (value: string | string[] | undefined) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const oneOf = <T extends string>(
  list: readonly T[],
  value: string | undefined,
  fallback: T,
): T =>
  (list as readonly string[]).includes(value ?? '') ? (value as T) : fallback;

/** Reads the table state from the URL; unknown values fall back to defaults. */
function readParams(search: Search): PackRowParams {
  const page = Number(text(search.page));
  const pageSize = Number(text(search.pageSize));
  const available = text(search.available);
  return {
    tab: oneOf(PACK_TABS, text(search.tab), 'ALL'),
    status: text(search.status) === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
    q: text(search.q)?.slice(0, 60),
    brand: text(search.brand),
    categoryId: text(search.categoryId),
    size: text(search.size),
    available:
      available === 'true' || available === 'false' ? available : undefined,
    sort: oneOf(PACK_ROW_SORTS, text(search.sort), 'name'),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: (PACK_ROW_PAGE_SIZES as readonly number[]).includes(pageSize)
      ? pageSize
      : 25,
  };
}

async function Catalogue({
  params,
  searchParams,
}: PageProps<'/shops/[shopId]/catalogue'>) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  const search = await searchParams;
  const state = readParams(search);
  const added = Number(text(search.added));
  const data = await listPackRows(token, shopId, state);
  const canEdit = shop.myRole === 'MASTER';
  const base = catalogueBase(shopId);

  /** The current URL with some values changed; defaults are left out. */
  const link = (next: Partial<PackRowParams>) => {
    const merged = { ...state, ...next };
    const query = new URLSearchParams();
    const defaults: Partial<Record<keyof PackRowParams, string>> = {
      tab: 'ALL',
      status: 'ACTIVE',
      sort: 'name',
      page: '1',
      pageSize: '25',
    };
    for (const [key, value] of Object.entries(merged)) {
      if (
        value !== undefined &&
        String(value) !== defaults[key as keyof PackRowParams]
      ) {
        query.set(key, String(value));
      }
    }
    const qs = query.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const filtered = Boolean(
    state.q || state.brand || state.categoryId || state.size || state.available,
  );
  const clearFilters = link({
    q: undefined,
    brand: undefined,
    categoryId: undefined,
    size: undefined,
    available: undefined,
    page: 1,
  });
  const sortHeader = (label: string, key: 'name' | 'price', end = false) => {
    const direction: 'ascending' | 'descending' | null =
      state.sort === key
        ? 'ascending'
        : state.sort === `-${key}`
          ? 'descending'
          : null;
    return {
      sorted: direction ?? undefined,
      headerContent: (
        <SortHeader
          label={label}
          align={end ? 'end' : 'start'}
          direction={direction}
          href={link({
            sort: direction === 'ascending' ? `-${key}` : key,
            page: 1,
          })}
        />
      ),
    };
  };

  const columns: Column<PackRow>[] = [
    {
      key: 'product',
      header: 'Product',
      ...sortHeader('Product', 'name'),
      filter: (
        <ColumnSearchFilter
          form={FORM}
          name="q"
          label="Search products"
          placeholder="Search"
          value={state.q}
        />
      ),
      cell: (row) => (
        <span className="flex min-w-0 flex-col items-end gap-1 desktop:items-start">
          <Link
            href={`${base}/products/${row.productId}`}
            className="rounded-nav-item font-semibold text-text-primary hover:text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            {row.productName}
          </Link>
          {row.source === 'own' || !row.catalogueActive ? (
            <span className="flex flex-wrap gap-1">
              {row.source === 'own' ? (
                <Badge tone="info">Own product</Badge>
              ) : null}
              {row.catalogueActive ? null : (
                <Badge tone="warning">Removed from brand catalogue</Badge>
              )}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'brand',
      header: 'Brand',
      width: 'w-28',
      filter: (
        <ColumnSelectFilter
          form={FORM}
          name="brand"
          label="Filter by brand"
          value={state.brand}
          options={data.options.brands}
        />
      ),
      cell: (row) =>
        row.brandName ?? <span className="text-text-secondary">No brand</span>,
    },
    {
      key: 'category',
      header: 'Category',
      width: 'w-32',
      filter: (
        <ColumnSelectFilter
          form={FORM}
          name="categoryId"
          label="Filter by category"
          value={state.categoryId}
          options={data.options.categories}
        />
      ),
      cell: (row) => row.categoryName,
    },
    {
      key: 'size',
      header: 'Pack size',
      width: 'w-24',
      filter: (
        <ColumnSelectFilter
          form={FORM}
          name="size"
          label="Filter by pack size"
          value={state.size}
          options={data.options.sizes}
        />
      ),
      cell: (row) => <span className="font-semibold">{row.sizeLabel}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      align: 'end',
      width: 'w-24',
      cellClassName: 'whitespace-nowrap',
      ...sortHeader('Price', 'price', true),
      cell: (row) => (
        <span className="flex flex-col items-end tabular-nums">
          <span className="font-semibold">{formatRupees(row.pricePaise)}</span>
          {row.mrpPaise === null ? null : (
            <span className="text-caption text-text-secondary">
              MRP {formatRupees(row.mrpPaise)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'availability',
      header: 'Availability',
      width: 'w-36',
      cellClassName: 'whitespace-nowrap',
      filter: (
        <ColumnSelectFilter
          form={FORM}
          name="available"
          label="Filter by availability"
          value={state.available}
          options={AVAILABILITY}
        />
      ),
      cell: (row) =>
        row.available ? (
          <Badge tone="success">Available</Badge>
        ) : (
          <Badge tone="warning">Not available</Badge>
        ),
    },
    ...(canEdit
      ? [
          {
            key: 'action',
            header: 'Actions',
            align: 'end' as const,
            width: 'w-24',
            cell: (row: PackRow) => (
              <RowActions
                productName={row.productName}
                sizeLabel={row.sizeLabel}
                editHref={`${base}/products/${row.productId}`}
                available={row.available}
                archived={row.productStatus === 'ARCHIVED'}
                toggleAvailable={setPackAvailableAction.bind(
                  null,
                  shopId,
                  row.productId,
                  row.packId,
                  !row.available,
                )}
                setArchived={setShopProductStatusAction.bind(
                  null,
                  shopId,
                  row.productId,
                  row.productStatus === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED',
                )}
              />
            ),
          },
        ]
      : []),
  ];

  const nothingAtAll = data.tabCounts.ALL === 0 && !filtered;

  return (
    <div className="flex flex-col gap-6">
      {Number.isInteger(added) && added > 0 ? (
        <Alert
          tone="success"
          title={added === 1 ? '1 product added' : `${added} products added`}
        >
          They are on sale with the prices you entered. Change availability or
          prices from the table.
        </Alert>
      ) : null}
      <PageHeader
        title="Products"
        description="The products you sell, with a price and availability for each pack size."
        actions={
          canEdit ? (
            <>
              <ButtonLink href={`${base}/add`}>
                Add from brand catalogue
              </ButtonLink>
              <ButtonLink href={`${base}/new`} variant="secondary">
                Add your own product
              </ButtonLink>
            </>
          ) : undefined
        }
      />

      {nothingAtAll && state.status === 'ACTIVE' ? (
        <StateMessage
          icon="tag"
          title="No products yet"
          description="Add products from the brand catalogue, or add your own. Your shop needs at least 10 products before it can be reviewed."
          action={
            canEdit ? (
              <>
                <ButtonLink href={`${base}/add`}>
                  Add from brand catalogue
                </ButtonLink>
                <ButtonLink href={`${base}/new`} variant="secondary">
                  Add your own product
                </ButtonLink>
              </>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 desktop:flex-row desktop:items-center desktop:justify-between">
            <SegmentedLinks
              label="Pack type"
              segments={PACK_TABS.map((tab) => ({
                href: link({
                  tab,
                  size: undefined,
                  page: 1,
                }),
                label: `${TAB_LABELS[tab]} (${data.tabCounts[tab]})`,
                current: state.tab === tab,
              }))}
            />
            <SegmentedLinks
              label="Product status"
              segments={(['ACTIVE', 'ARCHIVED'] as const).map((status) => ({
                href: link({ status, page: 1 }),
                label: status === 'ACTIVE' ? 'Selling' : 'Archived',
                current: state.status === status,
              }))}
            />
          </div>

          {/* The column filters submit this form (see ColumnFilter). */}
          <FilterForm
            id={FORM}
            action={base}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            {state.tab !== 'ALL' ? (
              <input type="hidden" name="tab" value={state.tab} />
            ) : null}
            {state.status !== 'ACTIVE' ? (
              <input type="hidden" name="status" value={state.status} />
            ) : null}
            {state.sort !== 'name' ? (
              <input type="hidden" name="sort" value={state.sort} />
            ) : null}
            <p className="text-body text-text-secondary">
              Filter by any column; press Enter to search by name.
            </p>
            {filtered ? (
              <ButtonLink href={clearFilters} variant="tertiary">
                Clear filters
              </ButtonLink>
            ) : null}
          </FilterForm>

          <DataTable
            caption={`Pack sizes in your catalogue, ${TAB_LABELS[state.tab].toLowerCase()}`}
            columns={columns}
            rows={data.items}
            rowKey={(row) => row.packId}
            empty={
              <StateMessage
                icon="search"
                title={
                  filtered
                    ? 'No pack sizes match these filters'
                    : state.status === 'ARCHIVED'
                      ? 'No archived products'
                      : 'No pack sizes here'
                }
                action={
                  filtered ? (
                    <ButtonLink href={clearFilters} variant="secondary">
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
            pageSizes={PACK_ROW_PAGE_SIZES}
            noun="pack sizes"
          />
        </>
      )}
    </div>
  );
}
