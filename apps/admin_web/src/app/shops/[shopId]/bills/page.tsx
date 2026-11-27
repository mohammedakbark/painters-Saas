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
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SectionLoading } from '@/components/ui/section-loading';
import { StatTile } from '@/components/ui/stat-tile';
import { StateMessage } from '@/components/ui/state-message';
import { type BillRow, type BillStatus, listBills } from '@/lib/api/bills';
import type { CustomerKind } from '@/lib/api/customers';
import { can } from '@/lib/api/shops';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { balanceState, billsBase } from '@/lib/bills/labels';
import { creditState } from '@/lib/credit/labels';
import { customerPath, KIND_LABEL } from '@/lib/customers/customer-forms';
import { listLink, oneOf, readPaging, text } from '@/lib/list-params';
import { formatRupees } from '@/lib/money';
import { formatOrderTime } from '@/lib/orders/labels';
import { formatIndianMobile } from '@/lib/phone';

export const metadata: Metadata = { title: 'Bills' };

type Props = PageProps<'/shops/[shopId]/bills'>;

const FORM = 'bill-filters';
const DEFAULTS = { page: '1', pageSize: '25' };
const DESCRIPTION =
  'Each customer’s running bill with your shop: completed orders, payments and returns. Open a customer to record a payment.';

/**
 * Bills (BIL-001, D-062): customers with a running bill, largest owed first,
 * with what customers owe and what the shop owes. Static heading; the list
 * loads behind Suspense (D-044).
 */
export default function BillsPage(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Bills" description={DESCRIPTION} />
      <Suspense fallback={<SectionLoading label="Loading bills…" />}>
        <Bills {...props} />
      </Suspense>
    </div>
  );
}

async function Bills({ params, searchParams }: Props) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  if (!can(shop, 'orders.payments') && !can(shop, 'reports.view')) {
    return (
      <StateMessage
        icon="lock"
        title="Bills are for the shop owner"
        description="Ask the owner for access to payments or money figures."
      />
    );
  }
  const search = await searchParams;
  const state = {
    q: text(search.q)?.trim().slice(0, 60) || undefined,
    kind: (oneOf(['PAINTER', 'CUSTOMER', ''] as const, text(search.kind), '') ||
      undefined) as CustomerKind | undefined,
    status: (oneOf(
      ['owing', 'shop_owes', 'settled', 'over_limit', ''] as const,
      text(search.status),
      '',
    ) || undefined) as BillStatus | undefined,
    ...readPaging(search),
  };
  const data = await listBills(await requireShopSession(), shopId, state);
  const base = billsBase(shopId);
  const link = (next: Partial<typeof state>) =>
    listLink(base, { ...state, ...next }, DEFAULTS);
  const filtered = Boolean(state.q || state.kind || state.status);

  const columns: Column<BillRow>[] = [
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div className="flex min-w-0 flex-col items-end gap-1 desktop:items-start">
          <Link
            href={`${customerPath(shopId, row.customer.id)}#bill-heading`}
            className="w-fit rounded-nav-item font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            {row.customer.name}
          </Link>
          <span className="text-body whitespace-nowrap text-text-secondary tabular-nums">
            {formatIndianMobile(row.customer.phone)}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-40',
      cell: (row) => (
        <Badge tone={row.customer.kind === 'PAINTER' ? 'info' : 'neutral'}>
          {KIND_LABEL[row.customer.kind]}
        </Badge>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      width: 'w-56',
      cell: (row) => {
        const balance = balanceState(row.balancePaise);
        return (
          <div className="flex flex-wrap items-center justify-end gap-2 desktop:justify-start">
            <span className="font-semibold tabular-nums">{balance.amount}</span>
            <Badge tone={balance.tone}>{balance.label}</Badge>
          </div>
        );
      },
    },
    {
      key: 'credit',
      header: 'Credit',
      width: 'w-48',
      cell: (row) => {
        const { status, limitPaise } = row.credit;
        const over =
          status === 'active' &&
          limitPaise !== null &&
          row.balancePaise > limitPaise;
        const credit = creditState(status, over ? -1 : null);
        return (
          <div className="flex flex-wrap items-center justify-end gap-2 desktop:justify-start">
            {limitPaise !== null ? (
              <span className="tabular-nums">{formatRupees(limitPaise)}</span>
            ) : null}
            <Badge tone={credit.tone}>{credit.label}</Badge>
          </div>
        );
      },
    },
    {
      key: 'last',
      header: 'Last entry',
      width: 'w-48',
      cell: (row) => (
        <span className="whitespace-nowrap text-text-secondary">
          {formatOrderTime(row.lastEntryAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 medium:grid-cols-2">
        <StatTile
          lead
          label="Customers owe you"
          value={formatRupees(data.totals.owingPaise)}
          href={link({ status: 'owing', page: 1 })}
        />
        <StatTile
          label="You owe after returns"
          value={formatRupees(data.totals.shopOwesPaise)}
          href={link({ status: 'shop_owes', page: 1 })}
        />
      </div>
      <FilterForm
        id={FORM}
        action={base}
        className="grid gap-3 rounded-card border border-card-border bg-card-background p-4 medium:grid-cols-[minmax(0,1fr)_14rem_14rem] medium:items-end"
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
        <ColumnSelectFilter
          form={FORM}
          name="status"
          label="Balance"
          allLabel="All balances"
          value={state.status}
          options={[
            { value: 'owing', label: 'Owes you' },
            { value: 'shop_owes', label: 'You owe' },
            { value: 'settled', label: 'Settled' },
            { value: 'over_limit', label: 'Over credit limit' },
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
        caption="Bills"
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.customer.id}
        empty={
          <StateMessage
            icon={filtered ? 'search' : 'receipt'}
            title={filtered ? 'No bills match these filters' : 'No bills yet'}
            description={
              filtered
                ? 'Try another search or clear the filters.'
                : 'A customer’s bill starts when you complete their first order.'
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
        noun="bills"
      />
    </div>
  );
}
