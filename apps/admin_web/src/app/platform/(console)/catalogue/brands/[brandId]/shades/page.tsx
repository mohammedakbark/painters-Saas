import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  ActiveToggleForm,
  ShadeCreateForm,
} from '@/components/catalogue/shade-forms';
import { PageLoading } from '@/components/layout/page-loading';
import { ButtonLink } from '@/components/ui/button-link';
import { ColumnSearchFilter } from '@/components/ui/column-filter';
import { type Column, DataTable } from '@/components/ui/data-table';
import { FilterForm } from '@/components/ui/filter-form';
import { Pagination } from '@/components/ui/pagination';
import { SegmentedLinks } from '@/components/ui/segmented-links';
import { SideSheet, SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import {
  getBrand,
  type ListStatus,
  listShades,
  type Shade,
} from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { listLink, oneOf, readPaging, text } from '@/lib/list-params';
import { createShadeAction, setShadeActiveAction } from '../../../actions';
import { ActiveBadge, orNotFound, ShadeSwatch } from '../../../catalogue-parts';
import { BrandHeader } from '../brand-header';

export const metadata: Metadata = { title: 'Shades · Catalogue' };

const FORM = 'shade-filters';
const SHEET = 'add-shade';
const STATUSES = ['all', 'active', 'archived'] as const;
const STATUS_LABELS: Record<ListStatus, string> = {
  all: 'All',
  active: 'Active',
  archived: 'Archived',
};
const DEFAULTS = { status: 'all', page: '1', pageSize: '25' };

/** A brand's shade card (CAT-001; table and side sheet WEB-007). */
export default function BrandShadesPage(
  props: PageProps<'/platform/catalogue/brands/[brandId]/shades'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading shades…" />}>
      <BrandShades {...props} />
    </Suspense>
  );
}

async function BrandShades({
  params,
  searchParams,
}: PageProps<'/platform/catalogue/brands/[brandId]/shades'>) {
  const { token } = await requirePlatformAdmin();
  const { brandId } = await params;
  const search = await searchParams;
  const base = `/platform/catalogue/brands/${brandId}/shades`;
  const state = {
    q: text(search.q)?.slice(0, 60),
    status: oneOf(STATUSES, text(search.status), 'all') as ListStatus,
    ...readPaging(search),
  };
  const brand = await orNotFound(getBrand(token, brandId));
  const data = await listShades(token, brandId, state);
  const link = (next: Partial<typeof state>) =>
    listLink(base, { ...state, ...next }, DEFAULTS);

  const columns: Column<Shade>[] = [
    {
      key: 'shade',
      header: 'Shade',
      cell: (shade) => <ShadeSwatch shade={shade} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-36',
      cell: (shade) => <ActiveBadge active={shade.active} />,
    },
    {
      key: 'action',
      header: 'Action',
      align: 'end',
      width: 'w-36',
      cell: (shade) => (
        <ActiveToggleForm
          action={setShadeActiveAction.bind(null, shade.id, !shade.active)}
          active={shade.active}
          label={`shade ${shade.code} ${shade.name}`}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <BrandHeader brand={brand} />
      <SideSheet
        id={SHEET}
        title="Add a shade"
        description={`For the ${brand.name} shade card.`}
      >
        <ShadeCreateForm action={createShadeAction.bind(null, brand.id)} />
      </SideSheet>

      <div className="flex flex-col gap-3 medium:flex-row medium:items-center medium:justify-between">
        <SegmentedLinks
          label="Shade status"
          segments={STATUSES.map((status) => ({
            href: link({ status, page: 1 }),
            label: STATUS_LABELS[status],
            current: state.status === status,
          }))}
        />
        <SideSheetButton sheet={SHEET} icon="plus">
          Add shade
        </SideSheetButton>
      </div>

      <FilterForm
        id={FORM}
        action={base}
        className="grid gap-3 rounded-card border border-card-border bg-card-background p-4"
      >
        {state.status !== 'all' ? (
          <input type="hidden" name="status" value={state.status} />
        ) : null}
        <ColumnSearchFilter
          form={FORM}
          name="q"
          label="Search shades"
          placeholder="Code or name, then press Enter"
          value={state.q}
        />
      </FilterForm>

      <p className="text-caption text-text-secondary">
        Colours on screen are indicative only. Customers and shops should always
        go by the shade code and the printed shade card.
      </p>

      <DataTable
        caption={`${brand.name} shades`}
        columns={columns}
        rows={data.items}
        rowKey={(shade) => shade.id}
        empty={
          <StateMessage
            icon="palette"
            title={state.q ? 'No shades match' : 'No shades here'}
            description={
              state.q
                ? 'Try another code or name.'
                : 'Add a shade, or import the shade card as a CSV file.'
            }
            action={
              state.q ? (
                <ButtonLink
                  href={link({ q: undefined, page: 1 })}
                  variant="secondary"
                >
                  Clear search
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
        noun="shades"
      />
    </div>
  );
}
