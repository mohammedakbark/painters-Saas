import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  CustomerForm,
  SitesPanel,
} from '@/components/customers/customer-forms';
import { PageLoading } from '@/components/layout/page-loading';
import { ActionButtonForm } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SideSheet, SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import { getCustomer } from '@/lib/api/customers';
import { orNotFound } from '@/lib/api/or-not-found';
import { listOrders } from '@/lib/api/orders';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { customersBase, KIND_LABEL } from '@/lib/customers/customer-forms';
import { formatRupees } from '@/lib/money';
import {
  FULFILMENT_LABEL,
  formatOrderTime,
  ORDER_STATUS,
  orderNumber,
  ordersBase,
} from '@/lib/orders/labels';
import { formatIndianMobile } from '@/lib/phone';
import {
  saveSiteAction,
  setSiteArchivedAction,
  updateCustomerAction,
} from '../actions';

export const metadata: Metadata = { title: 'Customer' };

type Props = PageProps<'/shops/[shopId]/customers/[customerId]'>;

const EDIT_SHEET = 'edit-customer';

/** One customer (ORD-004): details, painters' sites and their orders. */
export default function CustomerPage(props: Props) {
  return (
    <Suspense fallback={<PageLoading label="Loading the customer…" />}>
      <CustomerView {...props} />
    </Suspense>
  );
}

async function CustomerView({ params }: Props) {
  const { shopId, customerId } = await params;
  await requireShopAccess(shopId);
  const token = await requireShopSession();
  const customer = await orNotFound(getCustomer(token, shopId, customerId));
  const orders = await listOrders(token, shopId, {
    status: 'all',
    customerId: customer.id,
    page: 1,
    pageSize: 10,
  });
  const canHaveSites = customer.kind === 'PAINTER' && !customer.hasApp;
  const activeSites = customer.sites.filter((site) => !site.archived);
  const archivedSites = customer.sites.filter((site) => site.archived);
  const newOrderHref = `${ordersBase(shopId)}/new?customer=${encodeURIComponent(customer.id)}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: customersBase(shopId), label: 'Customers' }}
        title={customer.name}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <Badge tone={customer.kind === 'PAINTER' ? 'info' : 'neutral'}>
              {KIND_LABEL[customer.kind]}
            </Badge>
            <a
              href={`tel:${customer.phone}`}
              className="font-semibold text-brand-primary tabular-nums underline-offset-4 hover:underline"
            >
              {formatIndianMobile(customer.phone)}
            </a>
            <span>
              {customer.hasApp ? 'Uses the app' : 'Recorded by your shop'}
            </span>
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <SideSheetButton sheet={EDIT_SHEET} variant="secondary">
              Edit
            </SideSheetButton>
            <ButtonLink href={newOrderHref}>New order</ButtonLink>
          </div>
        }
      />

      <div className="grid items-start gap-6 desktop:grid-cols-[minmax(0,1fr)_22rem]">
        <Card
          as="section"
          aria-labelledby="orders-heading"
          className="flex flex-col gap-3 p-5 medium:p-6"
        >
          <h2 id="orders-heading" className="text-heading3 font-semibold">
            Orders
          </h2>
          {orders.items.length === 0 ? (
            <StateMessage
              icon="receipt"
              title="No orders yet"
              description="Record an order for this customer with New order."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border-default">
              {orders.items.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`${ordersBase(shopId)}/${order.id}`}
                      className="w-fit rounded-nav-item font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
                    >
                      {orderNumber(order.number)}
                    </Link>
                    <span className="text-caption text-text-secondary">
                      {formatOrderTime(order.placedAt)} ·{' '}
                      {FULFILMENT_LABEL[order.fulfilment]}
                      {order.siteLabel ? ` · ${order.siteLabel}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">
                      {formatRupees(order.totalPaise)}
                    </span>
                    <Badge tone={ORDER_STATUS[order.status].tone}>
                      {ORDER_STATUS[order.status].label}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {orders.total > orders.items.length ? (
            <p className="text-body text-text-secondary">
              Showing the latest {orders.items.length} of {orders.total} orders.
            </p>
          ) : null}
        </Card>

        <Card
          as="section"
          aria-labelledby="sites-heading"
          className="flex flex-col gap-3 p-5"
        >
          <h2 id="sites-heading" className="text-title font-semibold">
            Sites
          </h2>
          {!canHaveSites ? (
            <p className="text-body text-text-secondary">
              {customer.hasApp
                ? 'Painters who use the app keep their own sites.'
                : 'Sites are for painters. Change the type to Painter to add sites.'}
            </p>
          ) : (
            <SitesPanel
              sites={activeSites}
              saveAction={saveSiteAction.bind(null, shopId, customer.id)}
              archiveSlot={Object.fromEntries(
                activeSites.map((site) => [
                  site.id,
                  <ActionButtonForm
                    key={site.id}
                    action={setSiteArchivedAction.bind(
                      null,
                      shopId,
                      customer.id,
                      site.id,
                      true,
                    )}
                    label="Archive"
                    size="compact"
                    pendingLabel="Archiving…"
                    accessibleLabel={`Archive ${site.name}`}
                    variant="tertiary"
                  />,
                ]),
              )}
            />
          )}
          {archivedSites.length > 0 ? (
            <details className="text-body">
              <summary className="cursor-pointer font-semibold text-text-secondary">
                Archived sites ({archivedSites.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-2">
                {archivedSites.map((site) => (
                  <li
                    key={site.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span>{site.name}</span>
                    <ActionButtonForm
                      action={setSiteArchivedAction.bind(
                        null,
                        shopId,
                        customer.id,
                        site.id,
                        false,
                      )}
                      label="Restore"
                      size="compact"
                      pendingLabel="Restoring…"
                      accessibleLabel={`Restore ${site.name}`}
                      variant="tertiary"
                    />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Card>
      </div>

      <SideSheet id={EDIT_SHEET} title="Edit customer">
        <CustomerForm
          action={updateCustomerAction.bind(
            null,
            shopId,
            customer.id,
            customer.hasApp,
          )}
          customer={customer}
          submitLabel="Save"
        />
      </SideSheet>
    </div>
  );
}
