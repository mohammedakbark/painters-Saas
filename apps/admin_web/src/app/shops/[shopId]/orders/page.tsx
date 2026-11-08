import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { OrdersAutoRefresh } from '@/components/orders/orders-auto-refresh';
import { StepButton } from '@/components/orders/step-button';
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
import { SegmentedLinks } from '@/components/ui/segmented-links';
import { StateMessage } from '@/components/ui/state-message';
import { ToastHost } from '@/components/ui/toast';
import {
  type Fulfilment,
  listOrders,
  ORDER_TABS,
  type OrderListPage,
  type OrderRow,
  type OrderTab,
} from '@/lib/api/orders';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { countLabel } from '@/lib/format';
import { listLink, oneOf, readPaging, text } from '@/lib/list-params';
import { formatRupees } from '@/lib/money';
import { formatIndianMobile } from '@/lib/phone';
import {
  FULFILMENT_LABEL,
  formatOrderTime,
  nextStepFor,
  ORDER_STATUS,
  orderNumber,
  ordersBase,
  STEP_ACTION,
} from '@/lib/orders/labels';
import { moveOrderAction } from './actions';

export const metadata: Metadata = { title: 'Orders' };

type Props = PageProps<'/shops/[shopId]/orders'>;

const FORM = 'order-filters';
const DEFAULTS = { status: 'open', page: '1', pageSize: '25' };
const TAB_LABELS: Record<OrderTab, string> = {
  open: 'Open',
  NEW: 'New',
  PACKING: 'Packing',
  ready: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  all: 'All',
};
const tabCount = (counts: OrderListPage['counts'], tab: OrderTab) =>
  tab === 'open'
    ? counts.open
    : tab === 'ready'
      ? counts.ready
      : tab === 'all'
        ? counts.all
        : counts[tab];

/**
 * Orders (ORD-002): status tabs with counts, search and filters, a table
 * with a one-click next step, and a quiet refresh every 30 seconds. The
 * heading is a static shell; the list loads behind Suspense (PERF-001).
 */
export default function OrdersPage(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        description="New orders appear here by themselves. Move each order to its next step as you go."
      />
      <Suspense fallback={<SectionLoading label="Loading orders…" />}>
        <Orders {...props} />
      </Suspense>
      <ToastHost />
    </div>
  );
}

async function Orders({ params, searchParams }: Props) {
  const { shopId } = await params;
  await requireShopAccess(shopId);
  const search = await searchParams;
  const state = {
    status: oneOf(ORDER_TABS, text(search.status), 'open'),
    q: text(search.q)?.trim().slice(0, 60) || undefined,
    fulfilment:
      oneOf(['PICKUP', 'DELIVERY', ''] as const, text(search.fulfilment), '') ||
      undefined,
    payment:
      oneOf(['UNPAID', 'PAID', ''] as const, text(search.payment), '') ||
      undefined,
    ...readPaging(search),
  };
  const data = await listOrders(await requireShopSession(), shopId, state);
  const base = ordersBase(shopId);
  const link = (next: Partial<typeof state>) =>
    listLink(base, { ...state, ...next }, DEFAULTS);
  const filtered = Boolean(state.q || state.fulfilment || state.payment);

  // Four compact columns and a flexible Customer column, so the table fits
  // from the 900 px desktop layout up (fixed table layout).
  const columns: Column<OrderRow>[] = [
    {
      key: 'order',
      header: 'Order',
      width: 'w-40',
      cell: (row) => (
        <div className="flex flex-col items-end gap-1 desktop:items-start">
          <Link
            href={`${base}/${row.id}`}
            className="w-fit rounded-nav-item text-body-large font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            {orderNumber(row.number)}
          </Link>
          <span className="text-caption whitespace-nowrap text-text-secondary">
            {formatOrderTime(row.placedAt)}
          </span>
          <span className="text-caption text-text-secondary">
            {FULFILMENT_LABEL[row.fulfilment]}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div className="flex min-w-0 flex-col items-end gap-1 desktop:items-start">
          <span className="font-semibold">{row.customer.name}</span>
          <a
            href={`tel:${row.customer.phone}`}
            className="w-fit text-body whitespace-nowrap text-text-secondary tabular-nums underline-offset-4 hover:underline"
          >
            {formatIndianMobile(row.customer.phone)}
          </a>
          {row.siteLabel ? (
            <span className="text-caption text-text-secondary">
              Site: {row.siteLabel}
            </span>
          ) : null}
          <span className="text-caption text-text-secondary">
            {countLabel(row.itemCount, 'item')}
            {row.notAvailableCount > 0 ? (
              <span className="font-semibold text-status-warning">
                {' '}
                · {row.notAvailableCount} not available
              </span>
            ) : null}
          </span>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'end',
      width: 'w-32',
      cell: (row) => (
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-semibold tabular-nums">
            {formatRupees(row.totalPaise)}
          </span>
          {row.paymentStatus === 'PAID' ? (
            <Badge tone="success">Paid</Badge>
          ) : (
            <Badge tone="neutral">Unpaid</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status and next step',
      width: 'w-48',
      cell: (row) => {
        const next = nextStepFor(row.status, row.fulfilment);
        return (
          <div className="flex flex-col items-end gap-1 desktop:items-start">
            <Badge tone={ORDER_STATUS[row.status].tone}>
              {ORDER_STATUS[row.status].label}
            </Badge>
            {next ? (
              <StepButton
                action={moveOrderAction.bind(
                  null,
                  shopId,
                  row.id,
                  row.number,
                  next,
                )}
                label={STEP_ACTION[next]}
                accessibleLabel={`${STEP_ACTION[next]}, order ${orderNumber(row.number)}`}
                variant="tertiary"
                inRow
              />
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <OrdersAutoRefresh
        key={`${state.q ?? ''}|${state.fulfilment ?? ''}|${state.payment ?? ''}`}
        total={data.counts.all}
        newHref={listLink(base, { status: 'NEW' }, DEFAULTS)}
      />
      <SegmentedLinks
        label="Order status"
        segments={ORDER_TABS.map((tab) => ({
          href: link({ status: tab, page: 1 }),
          label: `${TAB_LABELS[tab]} (${tabCount(data.counts, tab)})`,
          current: state.status === tab,
        }))}
      />
      <FilterForm
        id={FORM}
        action={base}
        className="grid gap-3 rounded-card border border-card-border bg-card-background p-4 medium:grid-cols-2 medium:items-end wide:grid-cols-[minmax(0,1fr)_14rem_14rem]"
      >
        {state.status !== 'open' ? (
          <input type="hidden" name="status" value={state.status} />
        ) : null}
        <div className="medium:col-span-2 wide:col-span-1">
          <ColumnSearchFilter
            form={FORM}
            name="q"
            label="Search orders"
            placeholder="Order number, customer name or mobile"
            value={state.q}
          />
        </div>
        <ColumnSelectFilter
          form={FORM}
          name="fulfilment"
          label="Pickup or delivery"
          allLabel="Pickup and delivery"
          value={state.fulfilment}
          options={(['PICKUP', 'DELIVERY'] as Fulfilment[]).map((value) => ({
            value,
            label: FULFILMENT_LABEL[value],
          }))}
        />
        <ColumnSelectFilter
          form={FORM}
          name="payment"
          label="Payment"
          allLabel="Paid and unpaid"
          value={state.payment}
          options={[
            { value: 'UNPAID', label: 'Unpaid' },
            { value: 'PAID', label: 'Paid' },
          ]}
        />
      </FilterForm>
      {filtered ? (
        <div className="-mt-3 flex justify-end">
          <ButtonLink
            href={listLink(base, { status: state.status }, DEFAULTS)}
            variant="tertiary"
          >
            Clear filters
          </ButtonLink>
        </div>
      ) : null}

      <DataTable
        caption={`Orders, ${TAB_LABELS[state.status].toLowerCase()}`}
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.id}
        empty={
          <StateMessage
            icon={filtered ? 'search' : 'receipt'}
            title={
              filtered
                ? 'No orders match these filters'
                : data.counts.all === 0
                  ? 'No orders yet'
                  : `No ${TAB_LABELS[state.status].toLowerCase()} orders`
            }
            description={
              filtered
                ? 'Try another search or clear the filters.'
                : data.counts.all === 0
                  ? 'Orders from customers appear here as soon as they are placed.'
                  : 'Orders in this step appear here.'
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
        noun="orders"
      />
    </div>
  );
}
