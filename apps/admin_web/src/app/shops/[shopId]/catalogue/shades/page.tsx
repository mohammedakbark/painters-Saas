import type { Metadata } from 'next';
import { cache, Suspense } from 'react';
import { ShadeSwatch } from '@/components/catalogue/shade-swatch';
import {
  ActionButtonForm,
  OwnShadeForm,
} from '@/components/shop-catalogue/shop-catalogue-forms';
import { Badge } from '@/components/ui/badge';
import {
  ColumnSearchFilter,
  ColumnSelectFilter,
} from '@/components/ui/column-filter';
import { type Column, DataTable } from '@/components/ui/data-table';
import { FilterForm } from '@/components/ui/filter-form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SectionLoading } from '@/components/ui/section-loading';
import { SegmentedLinks } from '@/components/ui/segmented-links';
import { SideSheet, SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import {
  type BrandShadeItem,
  browseBrandShades,
  type FavouriteShade,
  listCatalogueBrands,
  listFavouriteShades,
  listOwnShades,
  type ShopShade,
} from '@/lib/api/shop-catalogue';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import {
  listLink,
  oneOf,
  readPaging,
  type SearchParams,
  text,
} from '@/lib/list-params';
import {
  createOwnShadeAction,
  removeOwnShadeAction,
  setFavouriteShadeAction,
} from '../actions';
import { catalogueBase } from '../catalogue-parts';

export const metadata: Metadata = { title: 'Shades' };

type Props = PageProps<'/shops/[shopId]/catalogue/shades'>;

const VIEWS = ['favourites', 'brand', 'own'] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABELS: Record<View, string> = {
  favourites: 'Favourites',
  brand: 'Brand shades',
  own: 'My shades',
};
const FORM = 'shade-filters';
const DEFAULTS = { view: 'favourites', page: '1', pageSize: '25' };

/** The brand list, fetched once per request for the sections that use it. */
const loadBrands = cache(async () =>
  listCatalogueBrands(await requireShopSession()),
);

/**
 * Shades (WEB-006): favourite brand shades, a brand's shade card and the
 * shop's own shades, each as a searchable, paged table. The title and note
 * are a static shell (PERF-001); the tab content loads behind Suspense.
 */
export default function ShadesPage(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shades"
        description="Mark the brand shades you use most, and add shade codes of your own."
      />
      <p className="text-body text-text-secondary">
        Colours on screen are indicative only. Customers and staff should always
        go by the shade code and the printed shade card.
      </p>
      <Suspense fallback={<SectionLoading label="Loading shades…" />}>
        <Shades {...props} />
      </Suspense>
    </div>
  );
}

async function Shades({ params, searchParams }: Props) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const search = await searchParams;
  const view = oneOf(VIEWS, text(search.view), 'favourites');
  const base = `${catalogueBase(shopId)}/shades`;
  const canEdit = shop.myRole === 'MASTER';

  return (
    <div className="flex flex-col gap-6">
      <SegmentedLinks
        label="Shade lists"
        segments={VIEWS.map((value) => ({
          href: listLink(base, { view: value }, DEFAULTS),
          label: VIEW_LABELS[value],
          current: view === value,
        }))}
      />
      {view === 'favourites' ? (
        <Favourites
          shopId={shopId}
          base={base}
          search={search}
          canEdit={canEdit}
        />
      ) : view === 'brand' ? (
        <BrandShades
          shopId={shopId}
          base={base}
          search={search}
          canEdit={canEdit}
        />
      ) : (
        <OwnShades
          shopId={shopId}
          base={base}
          search={search}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

interface SectionProps {
  shopId: string;
  base: string;
  search: SearchParams;
  canEdit: boolean;
}

/** Search box shared by the three lists; brand shades add a brand filter. */
function Toolbar({
  base,
  view,
  q,
  placeholder,
  children,
  aside,
}: {
  base: string;
  view: View;
  q: string | undefined;
  placeholder: string;
  /** Filters next to the search. */
  children?: React.ReactNode;
  /** A button at the end of the toolbar, e.g. Add shade. */
  aside?: React.ReactNode;
}) {
  return (
    <FilterForm id={FORM} action={base} className={cnToolbar(children, aside)}>
      {view !== 'favourites' ? (
        <input type="hidden" name="view" value={view} />
      ) : null}
      <ColumnSearchFilter
        form={FORM}
        name="q"
        label="Search shades"
        placeholder={placeholder}
        value={q}
      />
      {children}
      {aside}
    </FilterForm>
  );
}

const TOOLBAR =
  'grid gap-3 rounded-card border border-card-border bg-card-background p-4 medium:items-end';

function cnToolbar(filters: React.ReactNode, aside: React.ReactNode) {
  if (filters) {
    return `${TOOLBAR} medium:grid-cols-[minmax(0,1fr)_16rem]`;
  }
  return aside ? `${TOOLBAR} medium:grid-cols-[minmax(0,1fr)_auto]` : TOOLBAR;
}

const SHADE_SHEET = 'add-shade';

const swatchColumn = <T,>(
  shade: (row: T) => { code: string; name: string; previewHex: string | null },
): Column<T> => ({
  key: 'shade',
  header: 'Shade',
  cell: (row) => <ShadeSwatch shade={shade(row)} />,
});

async function Favourites({ shopId, base, search, canEdit }: SectionProps) {
  const state = {
    view: 'favourites',
    q: text(search.q)?.slice(0, 60),
    ...readPaging(search),
  };
  const data = await listFavouriteShades(
    await requireShopSession(),
    shopId,
    state,
  );
  const link = (next: Partial<typeof state>) =>
    listLink(base, { ...state, ...next }, DEFAULTS);

  const columns: Column<FavouriteShade>[] = [
    swatchColumn((row) => row.shade),
    {
      key: 'brand',
      header: 'Brand',
      width: 'w-56',
      cell: (row) => row.brand.name,
    },
    ...(canEdit
      ? [
          {
            key: 'action',
            header: 'Action',
            align: 'end' as const,
            width: 'w-48',
            cellClassName: 'whitespace-nowrap',
            cell: (row: FavouriteShade) => (
              <ActionButtonForm
                action={setFavouriteShadeAction.bind(
                  null,
                  shopId,
                  row.shade.id,
                  false,
                )}
                label="Remove favourite"
                pendingLabel="Removing…"
                variant="tertiary"
                accessibleLabel={`Remove ${row.shade.code} from favourites`}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Toolbar
        base={base}
        view="favourites"
        q={state.q}
        placeholder="Code or name, then press Enter"
      />
      <DataTable
        caption="Favourite shades"
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.shade.id}
        empty={
          <StateMessage
            icon="palette"
            title={state.q ? 'No favourites match' : 'No favourites yet'}
            description={
              state.q
                ? 'Try another code or name.'
                : 'Open Brand shades and add the ones you use most.'
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
        noun="favourites"
      />
    </>
  );
}

async function BrandShades({ shopId, base, search, canEdit }: SectionProps) {
  const brands = await loadBrands();
  const requested = text(search.brandId);
  const brand = brands.find((b) => b.id === requested) ?? brands.at(0);
  if (!brand) {
    return (
      <StateMessage
        icon="palette"
        title="The brand catalogue is empty"
        description="The platform team has not added brands yet."
      />
    );
  }
  const state = {
    view: 'brand',
    brandId: brand.id,
    q: text(search.q)?.slice(0, 60),
    ...readPaging(search),
  };
  const data = await browseBrandShades(
    await requireShopSession(),
    shopId,
    state,
  );
  const link = (next: Partial<typeof state>) =>
    listLink(base, { ...state, ...next }, DEFAULTS);

  const columns: Column<BrandShadeItem>[] = [
    swatchColumn((row) => row.shade),
    {
      key: 'favourite',
      header: 'Favourite',
      width: 'w-40',
      cell: (row) =>
        row.favourite ? <Badge tone="success">Favourite</Badge> : null,
    },
    ...(canEdit
      ? [
          {
            key: 'action',
            header: 'Action',
            align: 'end' as const,
            width: 'w-48',
            cellClassName: 'whitespace-nowrap',
            cell: (row: BrandShadeItem) => (
              <ActionButtonForm
                action={setFavouriteShadeAction.bind(
                  null,
                  shopId,
                  row.shade.id,
                  !row.favourite,
                )}
                label={row.favourite ? 'Remove favourite' : 'Add to favourites'}
                pendingLabel="Saving…"
                variant="tertiary"
                accessibleLabel={
                  row.favourite
                    ? `Remove ${row.shade.code} from favourites`
                    : `Add ${row.shade.code} to favourites`
                }
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Toolbar
        base={base}
        view="brand"
        q={state.q}
        placeholder="Code or name, then press Enter"
      >
        <ColumnSelectFilter
          form={FORM}
          name="brandId"
          label="Brand"
          allLabel={null}
          value={brand.id}
          options={brands.map((b) => ({ value: b.id, label: b.name }))}
        />
      </Toolbar>
      <DataTable
        caption={`${brand.name} shades`}
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.shade.id}
        empty={
          <StateMessage
            icon="palette"
            title={state.q ? 'No shades match' : `No ${brand.name} shades yet`}
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
        noun="shades"
      />
    </>
  );
}

async function OwnShades({ shopId, base, search, canEdit }: SectionProps) {
  const state = {
    view: 'own',
    q: text(search.q)?.slice(0, 60),
    ...readPaging(search),
  };
  const [brands, data] = await Promise.all([
    loadBrands(),
    listOwnShades(await requireShopSession(), shopId, state),
  ]);
  const link = (next: Partial<typeof state>) =>
    listLink(base, { ...state, ...next }, DEFAULTS);

  const columns: Column<ShopShade>[] = [
    swatchColumn((row) => row),
    {
      key: 'brand',
      header: 'Brand',
      width: 'w-56',
      cell: (row) =>
        row.brand ? (
          row.brand.name
        ) : (
          <span className="text-text-secondary">No brand</span>
        ),
    },
    ...(canEdit
      ? [
          {
            key: 'action',
            header: 'Action',
            align: 'end' as const,
            width: 'w-40',
            cell: (row: ShopShade) => (
              <ActionButtonForm
                action={removeOwnShadeAction.bind(null, shopId, row.id)}
                label="Remove"
                pendingLabel="Removing…"
                variant="tertiary"
                accessibleLabel={`Remove shade ${row.code}`}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {canEdit ? (
        <SideSheet
          id={SHADE_SHEET}
          title="Add a shade"
          description="Codes you mix or use in the shop that are not on a brand shade card."
        >
          <OwnShadeForm
            action={createOwnShadeAction.bind(null, shopId)}
            brands={brands}
          />
        </SideSheet>
      ) : null}
      <Toolbar
        base={base}
        view="own"
        q={state.q}
        placeholder="Code or name, then press Enter"
        aside={
          canEdit ? (
            <SideSheetButton sheet={SHADE_SHEET} icon="plus">
              Add shade
            </SideSheetButton>
          ) : null
        }
      />
      <DataTable
        caption="Your own shades"
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.id}
        empty={
          <StateMessage
            icon="palette"
            title={state.q ? 'No shades match' : 'No shades of your own yet'}
            description={
              state.q
                ? 'Try another code or name.'
                : 'Add the codes you mix or use that are not on a brand shade card.'
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
        noun="shades"
      />
    </>
  );
}
