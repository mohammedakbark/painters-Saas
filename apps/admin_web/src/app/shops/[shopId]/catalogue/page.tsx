import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import {
  ColumnSearchFilter,
  ColumnSelectFilter,
} from '@/components/ui/column-filter';
import { type Column, DataTable } from '@/components/ui/data-table';
import { FilterForm } from '@/components/ui/filter-form';
import { PackChip } from '@/components/ui/pack-chip';
import { FlashToast } from '@/components/ui/flash-toast';
import { PageHeader } from '@/components/ui/page-header';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { SegmentedLinks } from '@/components/ui/segmented-links';
import { SideSheet, SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import { Thumbnail } from '@/components/ui/thumbnail';
import {
  listProductRows,
  PACK_TABS,
  type ProductRow,
  type ProductRowParams,
  ROW_PAGE_SIZES,
  ROW_SHOWS,
  ROW_SORTS,
  listCatalogueBrands,
} from '@/lib/api/shop-catalogue';
import { categoryChoices, listShopCategories } from '@/lib/api/shop-categories';
import { getShopOnboarding } from '@/lib/api/shop-profile';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { formatRupees } from '@/lib/money';
import {
  setProductAvailabilityAction,
  setShopProductStatusAction,
} from './actions';
import { catalogueBase } from './catalogue-parts';
import { AddProductFlow } from './add-product-flow';
import { RowActions } from './row-actions';

export const metadata: Metadata = { title: 'Products' };

const FORM = 'product-filters';
const VISIBLE_PACKS = 4;

const TAB_LABELS: Record<ProductRowParams['tab'], string> = {
  ALL: 'All',
  VOLUME: 'Litres',
  WEIGHT: 'Kilograms',
  PIECE: 'Pieces',
};

const SHOW_OPTIONS = [
  { value: 'available', label: 'Fully available' },
  { value: 'partly', label: 'Some sizes not available' },
  { value: 'none', label: 'Not available' },
];

const SORT_OPTIONS = [
  { value: 'price', label: 'Lowest price' },
  { value: '-price', label: 'Highest price' },
];

export default function ProductsPage(
  props: PageProps<'/shops/[shopId]/catalogue'>,
) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <PageHeader title="Products" description={DESCRIPTION} />
          <TableSkeleton label="Loading your products…" />
        </div>
      }
    >
      <Products {...props} />
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

/** Reads the list state from the URL; unknown values fall back to defaults. */
function readParams(search: Search): ProductRowParams {
  const page = Number(text(search.page));
  const pageSize = Number(text(search.pageSize));
  return {
    tab: oneOf(PACK_TABS, text(search.tab), 'ALL'),
    status: text(search.status) === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
    q: text(search.q)?.slice(0, 60),
    brand: text(search.brand),
    categoryId: text(search.categoryId),
    size: text(search.size),
    show: oneOf(ROW_SHOWS, text(search.show), 'all'),
    sort: oneOf(ROW_SORTS, text(search.sort), 'name'),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: (ROW_PAGE_SIZES as readonly number[]).includes(pageSize)
      ? pageSize
      : 25,
  };
}

const DEFAULTS: Partial<Record<keyof ProductRowParams, string>> = {
  tab: 'ALL',
  status: 'ACTIVE',
  show: 'all',
  sort: 'name',
  page: '1',
  pageSize: '25',
};

const ADD_SHEET = 'add-product';
const DESCRIPTION =
  'Everything your shop sells, with prices and availability for each pack size.';

async function Products({
  params,
  searchParams,
}: PageProps<'/shops/[shopId]/catalogue'>) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  const search = await searchParams;
  const state = readParams(search);
  const added = Number(text(search.added));
  const canEdit = shop.myRole === 'MASTER';
  const [data, onboarding, categories, brands] = await Promise.all([
    listProductRows(token, shopId, state),
    getShopOnboarding(token, shopId),
    // Only the owner gets the Add product sheet, which needs these lists.
    canEdit
      ? listShopCategories(token, shopId).then((all) => categoryChoices(all))
      : [],
    canEdit ? listCatalogueBrands(token) : [],
  ]);
  const productsNeeded = onboarding.items.find(
    (item) => item.key === 'products',
  )?.progress;
  // The bulk quick add helps a new shop reach the products needed for review.
  const quickStart = Boolean(
    productsNeeded && productsNeeded.current < productsNeeded.required,
  );
  const base = catalogueBase(shopId);
  const canAdd = canEdit && categories.length > 0;

  /** The current URL with some values changed; defaults are left out. */
  const link = (next: Partial<ProductRowParams>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...state, ...next })) {
      if (
        value !== undefined &&
        String(value) !== DEFAULTS[key as keyof ProductRowParams]
      ) {
        query.set(key, String(value));
      }
    }
    const qs = query.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const filtered = Boolean(
    state.q ||
    state.brand ||
    state.categoryId ||
    state.size ||
    state.show !== 'all',
  );
  const clearFilters = link({
    q: undefined,
    brand: undefined,
    categoryId: undefined,
    size: undefined,
    show: 'all',
    page: 1,
  });

  const columns: Column<ProductRow>[] = [
    {
      key: 'photo',
      header: 'Photo',
      width: 'w-20',
      cell: (row) => (
        <Thumbnail src={row.thumbUrl} alt={`Photo of ${row.name}`} />
      ),
    },
    {
      key: 'product',
      header: 'Product',
      cell: (row) => (
        <span className="flex min-w-0 flex-col items-end gap-1 desktop:items-start">
          <Link
            href={`${base}/products/${row.productId}`}
            className="rounded-nav-item text-body-large font-semibold text-text-primary hover:text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            {row.name}
          </Link>
          <span className="text-caption text-text-secondary">
            {[row.brandName, row.categoryName].filter(Boolean).join(' · ')}
          </span>
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
      key: 'packs',
      header: 'Pack sizes and prices',
      cell: (row) => (
        <span className="flex flex-wrap justify-end gap-1.5 desktop:justify-start">
          {row.packs.slice(0, VISIBLE_PACKS).map((pack) => (
            <PackChip
              key={pack.id}
              label={pack.label}
              price={formatRupees(pack.pricePaise)}
              available={pack.available}
            />
          ))}
          {row.packs.length > VISIBLE_PACKS ? (
            <Link
              href={`${base}/products/${row.productId}`}
              className="self-center text-caption font-semibold text-brand-primary hover:underline"
            >
              +{row.packs.length - VISIBLE_PACKS} more
            </Link>
          ) : null}
        </span>
      ),
    },
    {
      key: 'availability',
      header: 'Availability',
      width: 'w-44',
      cellClassName: 'whitespace-nowrap',
      cell: (row) =>
        row.availableCount === row.packCount ? (
          <Badge tone="success">
            {row.packCount === 1 ? 'Available' : 'All available'}
          </Badge>
        ) : row.availableCount === 0 ? (
          <Badge tone="warning">Not available</Badge>
        ) : (
          <Badge tone="warning">
            {row.availableCount} of {row.packCount} available
          </Badge>
        ),
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: 'Actions',
            align: 'end' as const,
            width: 'w-20',
            cell: (row: ProductRow) => {
              const packIds = row.packs.map((pack) => pack.id);
              return (
                <RowActions
                  productName={row.name}
                  editHref={`${base}/products/${row.productId}`}
                  availableCount={row.availableCount}
                  packCount={row.packCount}
                  archived={row.productStatus === 'ARCHIVED'}
                  markAllAvailable={setProductAvailabilityAction.bind(
                    null,
                    shopId,
                    row.productId,
                    packIds,
                    true,
                  )}
                  markAllNotAvailable={setProductAvailabilityAction.bind(
                    null,
                    shopId,
                    row.productId,
                    packIds,
                    false,
                  )}
                  setArchived={setShopProductStatusAction.bind(
                    null,
                    shopId,
                    row.productId,
                    row.productStatus === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED',
                  )}
                />
              );
            },
          },
        ]
      : []),
  ];

  const nothingAtAll = data.tabCounts.ALL === 0 && !filtered;

  return (
    <div className="flex flex-col gap-6">
      {canAdd ? (
        <SideSheet
          id={ADD_SHEET}
          title="Add product"
          description="Find it in the brand catalogue, or add it as a new product. Then set your prices."
          defaultOpen={text(search.add) === 'product'}
        >
          <AddProductFlow
            shopId={shopId}
            base={base}
            categories={categories}
            brands={brands}
          />
        </SideSheet>
      ) : null}
      {Number.isInteger(added) && added > 0 ? (
        <FlashToast
          param="added"
          message={`${added === 1 ? '1 product added' : `${added} products added`}. They are on sale with the prices you entered.`}
        />
      ) : null}
      <PageHeader
        title="Products"
        description={DESCRIPTION}
        actions={
          canEdit ? (
            <>
              {quickStart ? (
                <ButtonLink href={`${base}/add`} variant="secondary">
                  Quick start
                </ButtonLink>
              ) : null}
              {canAdd ? (
                <SideSheetButton sheet={ADD_SHEET} icon="plus">
                  Add product
                </SideSheetButton>
              ) : null}
            </>
          ) : undefined
        }
      />

      {nothingAtAll && state.status === 'ACTIVE' ? (
        <StateMessage
          icon="tag"
          title="No products yet"
          description="Add the products you sell. Your shop needs at least 10 products before it can be reviewed."
          action={
            canEdit ? (
              <>
                {canAdd ? (
                  <SideSheetButton sheet={ADD_SHEET}>
                    Add product
                  </SideSheetButton>
                ) : null}
                <ButtonLink href={`${base}/add`} variant="secondary">
                  Quick start: add several products
                </ButtonLink>
              </>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 desktop:flex-row desktop:items-center desktop:justify-between">
            <SegmentedLinks
              label="Product type"
              segments={PACK_TABS.map((tab) => ({
                href: link({ tab, size: undefined, page: 1 }),
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

          <FilterForm
            id={FORM}
            action={base}
            className="grid gap-3 rounded-card border border-card-border bg-card-background p-4 medium:grid-cols-2 desktop:grid-cols-5 desktop:items-end"
          >
            {state.tab !== 'ALL' ? (
              <input type="hidden" name="tab" value={state.tab} />
            ) : null}
            {state.status !== 'ACTIVE' ? (
              <input type="hidden" name="status" value={state.status} />
            ) : null}
            <div className="medium:col-span-2 desktop:col-span-5">
              <ColumnSearchFilter
                form={FORM}
                name="q"
                label="Search products"
                placeholder="Search by name or brand, then press Enter"
                value={state.q}
              />
            </div>
            <ColumnSelectFilter
              form={FORM}
              name="brand"
              label="Brand"
              allLabel="All brands"
              value={state.brand}
              options={data.options.brands}
            />
            <ColumnSelectFilter
              form={FORM}
              name="categoryId"
              label="Category"
              allLabel="All categories"
              value={state.categoryId}
              options={data.options.categories}
            />
            <ColumnSelectFilter
              form={FORM}
              name="size"
              label="Pack size"
              allLabel="All sizes"
              value={state.size}
              options={data.options.sizes}
            />
            <ColumnSelectFilter
              form={FORM}
              name="show"
              label="Availability"
              allLabel="All availability"
              value={state.show === 'all' ? undefined : state.show}
              options={SHOW_OPTIONS}
            />
            <ColumnSelectFilter
              form={FORM}
              name="sort"
              label="Sort"
              allLabel="Name A–Z"
              value={state.sort === 'name' ? undefined : state.sort}
              options={SORT_OPTIONS}
            />
          </FilterForm>
          {filtered ? (
            <div className="-mt-3 flex justify-end">
              <ButtonLink href={clearFilters} variant="tertiary">
                Clear filters
              </ButtonLink>
            </div>
          ) : null}

          <DataTable
            caption={`Your products, ${TAB_LABELS[state.tab].toLowerCase()}`}
            columns={columns}
            rows={data.items}
            rowKey={(row) => row.productId}
            empty={
              <StateMessage
                icon="search"
                title={
                  filtered
                    ? 'No products match these filters'
                    : state.status === 'ARCHIVED'
                      ? 'No archived products'
                      : 'No products here'
                }
                description={
                  filtered
                    ? 'Try another search or clear the filters.'
                    : state.status === 'ARCHIVED'
                      ? 'Products you archive appear here, so you can restore them.'
                      : 'No products in this group. Choose another tab or add a product.'
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
            pageSizes={ROW_PAGE_SIZES}
            noun="products"
          />
        </>
      )}
    </div>
  );
}
