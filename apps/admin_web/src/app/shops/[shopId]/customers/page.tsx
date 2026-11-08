import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CustomerForm } from '@/components/customers/customer-forms';
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
import { SectionLoading } from '@/components/ui/section-loading';
import { SideSheet, SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import {
  type CustomerKind,
  type CustomerRow,
  listCustomers,
} from '@/lib/api/customers';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import {
  customerPath,
  customersBase,
  KIND_LABEL,
} from '@/lib/customers/customer-forms';
import { countLabel } from '@/lib/format';
import { listLink, oneOf, readPaging, text } from '@/lib/list-params';
import { formatOrderTime, ordersBase } from '@/lib/orders/labels';
import { formatIndianMobile } from '@/lib/phone';
import { createCustomerAction } from './actions';

export const metadata: Metadata = { title: 'Customers' };

type Props = PageProps<'/shops/[shopId]/customers'>;

const FORM = 'customer-filters';
const DEFAULTS = { page: '1', pageSize: '25' };
const ADD_SHEET = 'add-customer';

/**
 * Customers (ORD-004): people who order in the app and people the shop
 * records by mobile (private to the shop, D-054). Static heading; the list
 * loads behind Suspense (PERF-001).
 */
export default function CustomersPage(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<HeaderShell />}>
        <Header {...props} />
      </Suspense>
      <Suspense fallback={<SectionLoading label="Loading customers…" />}>
        <Customers {...props} />
      </Suspense>
    </div>
  );
}

const DESCRIPTION =
  'People who order in the app, and people you record by mobile number. Your records are private to your shop.';

function HeaderShell() {
  return <PageHeader title="Customers" description={DESCRIPTION} />;
}

async function Header({ params }: Props) {
  const { shopId } = await params;
  return (
    <>
      <PageHeader
        title="Customers"
        description={DESCRIPTION}
        actions={
          <div className="flex flex-wrap gap-3">
            <SideSheetButton sheet={ADD_SHEET} icon="plus" variant="secondary">
              Add customer
            </SideSheetButton>
            <ButtonLink href={`${ordersBase(shopId)}/new`}>
              New order
            </ButtonLink>
          </div>
        }
      />
      <SideSheet
        id={ADD_SHEET}
        title="Add customer"
        description="For people who order by phone or at the counter."
      >
        <CustomerForm
          action={createCustomerAction.bind(null, shopId)}
          submitLabel="Add customer"
        />
      </SideSheet>
    </>
  );
}

async function Customers({ params, searchParams }: Props) {
  const { shopId } = await params;
  await requireShopAccess(shopId);
  const search = await searchParams;
  const state = {
    q: text(search.q)?.trim().slice(0, 60) || undefined,
    kind: (oneOf(['PAINTER', 'CUSTOMER', ''] as const, text(search.kind), '') ||
      undefined) as CustomerKind | undefined,
    ...readPaging(search),
  };
  const data = await listCustomers(await requireShopSession(), shopId, state);
  const base = customersBase(shopId);
  const link = (next: Partial<typeof state>) =>
    listLink(base, { ...state, ...next }, DEFAULTS);
  const filtered = Boolean(state.q || state.kind);

  const columns: Column<CustomerRow>[] = [
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div className="flex min-w-0 flex-col items-end gap-1 desktop:items-start">
          <Link
            href={customerPath(shopId, row.id)}
            className="w-fit rounded-nav-item font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            {row.name}
          </Link>
          <span className="text-body whitespace-nowrap text-text-secondary tabular-nums">
            {formatIndianMobile(row.phone)}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-48',
      cell: (row) => (
        <div className="flex flex-col items-end gap-1 desktop:items-start">
          <Badge tone={row.kind === 'PAINTER' ? 'info' : 'neutral'}>
            {KIND_LABEL[row.kind]}
          </Badge>
          <span className="text-caption text-text-secondary">
            {row.hasApp ? 'Uses the app' : 'Recorded by you'}
          </span>
        </div>
      ),
    },
    {
      key: 'orders',
      header: 'Orders',
      width: 'w-44',
      cell: (row) => (
        <div className="flex flex-col items-end gap-1 desktop:items-start">
          <span>{countLabel(row.orderCount, 'order')}</span>
          {row.lastOrderAt ? (
            <span className="text-caption whitespace-nowrap text-text-secondary">
              Last {formatOrderTime(row.lastOrderAt)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'sites',
      header: 'Sites',
      width: 'w-28',
      cell: (row) =>
        row.kind === 'PAINTER' ? countLabel(row.siteCount, 'site') : '–',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <FilterForm
        id={FORM}
        action={base}
        className="grid gap-3 rounded-card border border-card-border bg-card-background p-4 medium:grid-cols-[minmax(0,1fr)_14rem] medium:items-end"
      >
        <ColumnSearchFilter
          form={FORM}
          name="q"
          label="Search customers"
          placeholder="Name or mobile number"
          value={state.q}
        />
        <ColumnSelectFilter
          form={FORM}
          name="kind"
          label="Type"
          allLabel="Painters and customers"
          value={state.kind}
          options={[
            { value: 'PAINTER', label: 'Painters' },
            { value: 'CUSTOMER', label: 'Customers' },
          ]}
        />
      </FilterForm>
      {filtered ? (
        <div className="-mt-3 flex justify-end">
          <ButtonLink href={base} variant="tertiary">
            Clear filters
          </ButtonLink>
        </div>
      ) : null}
      <DataTable
        caption="Customers"
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.id}
        empty={
          <StateMessage
            icon={filtered ? 'search' : 'user'}
            title={
              filtered ? 'No customers match these filters' : 'No customers yet'
            }
            description={
              filtered
                ? 'Try another search or clear the filters.'
                : 'Customers who order in the app appear here. Add people who order by phone or at the counter.'
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
        noun="customers"
      />
    </div>
  );
}
