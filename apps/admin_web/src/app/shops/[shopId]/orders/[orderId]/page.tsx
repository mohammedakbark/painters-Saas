import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import {
  CancelOrderButton,
  CancelOrderSheet,
  OrderItems,
  PaymentButton,
  PaymentSheet,
} from '@/components/orders/order-forms';
import { StepButton } from '@/components/orders/step-button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { orNotFound } from '@/lib/api/or-not-found';
import { getOrder, type OrderDetail } from '@/lib/api/orders';
import { getShopSettings } from '@/lib/api/shop-settings';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { formatDateTime } from '@/lib/format';
import { formatRupees } from '@/lib/money';
import { formatIndianMobile } from '@/lib/phone';
import {
  eventSentence,
  FULFILMENT_LABEL,
  formatOrderTime,
  ORDER_STATUS,
  orderNumber,
  ordersBase,
  PAYMENT_METHOD_LABEL,
  STEP_ACTION,
} from '@/lib/orders/labels';
import {
  cancelOrderAction,
  moveOrderAction,
  notAvailableAction,
  recordPaymentAction,
  returnItemAction,
  searchPacksAction,
  substituteAction,
} from '../actions';

export const metadata: Metadata = { title: 'Order' };

type Props = PageProps<'/shops/[shopId]/orders/[orderId]'>;

/** One order (ORD-002): items, totals, customer, payment and the timeline. */
export default function OrderPage(props: Props) {
  return (
    <>
      <Suspense fallback={<PageLoading label="Loading the order…" />}>
        <OrderView {...props} />
      </Suspense>
    </>
  );
}

async function OrderView({ params, searchParams }: Props) {
  const { shopId, orderId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  // Another shop's order or a malformed id is "not found" (API 404).
  const order = await orNotFound(getOrder(token, shopId, orderId));
  const settings = await getShopSettings(token, shopId);
  const isOwner = shop.myRole === 'MASTER';
  const status = ORDER_STATUS[order.status];
  const steps = order.nextSteps.filter((step) => step !== 'CANCELLED');
  const canCancel = order.nextSteps.includes('CANCELLED');
  const justRecorded = (await searchParams).recorded === '1';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: ordersBase(shopId), label: 'Orders' }}
        title={`Order ${orderNumber(order.number)}`}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <Badge tone={status.tone}>{status.label}</Badge>
            <span>
              {FULFILMENT_LABEL[order.fulfilment]} ·{' '}
              {formatOrderTime(order.placedAt)}
            </span>
          </span>
        }
        actions={
          steps.length > 0 || canCancel ? (
            <div className="flex flex-wrap gap-3">
              {steps.map((step) => (
                <StepButton
                  key={step}
                  action={moveOrderAction.bind(
                    null,
                    shopId,
                    order.id,
                    order.number,
                    step,
                  )}
                  label={STEP_ACTION[step]}
                  variant="primary"
                />
              ))}
              {canCancel ? <CancelOrderButton /> : null}
            </div>
          ) : undefined
        }
      />

      {justRecorded ? (
        <Alert tone="success" title="Order saved">
          {orderNumber(order.number)} is recorded for {order.customer.name}.
          {order.status === 'COMPLETED' ? ' It is saved as handed over.' : ''}
        </Alert>
      ) : null}
      {order.cancelled ? (
        <Card tone="subtle" className="flex flex-col gap-1 p-5">
          <p className="font-semibold">
            Cancelled by{' '}
            {order.cancelled.by === 'CUSTOMER' ? 'the customer' : 'the shop'} on{' '}
            {formatDateTime(order.cancelled.at)}
          </p>
          {order.cancelled.reason ? (
            <p className="text-body text-text-secondary">
              Reason: {order.cancelled.reason}
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid items-start gap-6 desktop:grid-cols-[minmax(0,1fr)_22rem]">
        <Card
          as="section"
          aria-labelledby="items-heading"
          className="flex flex-col gap-2 p-5 medium:p-6"
        >
          <h2 id="items-heading" className="text-heading3 font-semibold">
            Items
          </h2>
          {order.canEditItems ? (
            <p className="text-body text-text-secondary">
              Out of stock? Mark the item not available or suggest a substitute.
              The customer sees your message.
            </p>
          ) : null}
          <OrderItems
            items={order.items}
            canEditItems={order.canEditItems}
            canReturnItems={order.canReturnItems}
            isOwner={isOwner}
            messages={settings.orderMessages}
            notAvailableAction={notAvailableAction.bind(null, shopId, order.id)}
            substituteAction={substituteAction.bind(null, shopId, order.id)}
            returnAction={returnItemAction.bind(null, shopId, order.id)}
            searchPacks={searchPacksAction.bind(null, shopId)}
          />
          <Totals order={order} />
        </Card>

        <aside className="flex flex-col gap-6">
          <Card
            as="section"
            aria-labelledby="customer-heading"
            className="flex flex-col gap-2 p-5"
          >
            <h2 id="customer-heading" className="text-title font-semibold">
              Customer
            </h2>
            <p className="text-body-large font-semibold">
              {order.customer.name}
            </p>
            <a
              href={`tel:${order.customer.phone}`}
              className="w-fit font-semibold text-brand-primary tabular-nums underline-offset-4 hover:underline"
            >
              {formatIndianMobile(order.customer.phone)}
            </a>
            <p className="text-body text-text-secondary">
              {order.customer.hasApp
                ? 'Orders in the app'
                : 'Recorded by your shop'}
            </p>
            {order.siteLabel ? (
              <p className="text-body">Site: {order.siteLabel}</p>
            ) : null}
            {order.source === 'SHOP' ? (
              <p className="text-caption text-text-secondary">
                This order was recorded by your shop.
              </p>
            ) : null}
          </Card>

          <Card
            as="section"
            aria-labelledby="fulfilment-heading"
            className="flex flex-col gap-2 p-5"
          >
            <h2 id="fulfilment-heading" className="text-title font-semibold">
              {order.delivery ? 'Delivery' : 'Pickup'}
            </h2>
            {order.delivery ? (
              <>
                <p className="text-body">{order.delivery.address}</p>
                {order.delivery.distanceKm !== null &&
                order.delivery.latitude !== null &&
                order.delivery.longitude !== null ? (
                  <>
                    <p className="text-body text-text-secondary">
                      {order.delivery.distanceKm.toFixed(1)} km from the shop
                    </p>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${order.delivery.latitude}&mlon=${order.delivery.longitude}#map=17/${order.delivery.latitude}/${order.delivery.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-fit font-semibold text-brand-primary underline-offset-4 hover:underline"
                    >
                      Open map
                    </a>
                  </>
                ) : (
                  <p className="text-body text-text-secondary">
                    No map pin for this address.
                  </p>
                )}
              </>
            ) : (
              <p className="text-body text-text-secondary">
                The customer collects the order at your shop.
              </p>
            )}
          </Card>

          <Card
            as="section"
            aria-labelledby="payment-heading"
            className="flex flex-col gap-3 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="payment-heading" className="text-title font-semibold">
                Payment
              </h2>
              {order.payment.status === 'PAID' ? (
                <Badge tone="success">Paid</Badge>
              ) : (
                <Badge tone="neutral">Unpaid</Badge>
              )}
            </div>
            {order.payment.status === 'PAID' && order.payment.method ? (
              <p className="text-body">
                {PAYMENT_METHOD_LABEL[order.payment.method]}
                {order.payment.paidAt
                  ? `, ${formatDateTime(order.payment.paidAt)}`
                  : ''}
              </p>
            ) : (
              <p className="text-body text-text-secondary">
                The customer pays at{' '}
                {order.fulfilment === 'DELIVERY' ? 'delivery' : 'pickup'}.
              </p>
            )}
            {order.canRecordPayment && isOwner ? (
              <div>
                <PaymentButton />
              </div>
            ) : null}
          </Card>

          <Card
            as="section"
            aria-labelledby="timeline-heading"
            className="flex flex-col gap-3 p-5"
          >
            <h2 id="timeline-heading" className="text-title font-semibold">
              Timeline
            </h2>
            <ol className="flex flex-col gap-3">
              {[...order.events].reverse().map((event) => (
                <li key={event.id} className="flex flex-col gap-0.5">
                  <span className="text-body">{eventSentence(event)}</span>
                  <span className="text-caption text-text-secondary">
                    {formatOrderTime(event.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>

      {/* Always mounted: the sheet shows the toast after the step it ends. */}
      <CancelOrderSheet
        action={cancelOrderAction.bind(null, shopId, order.id)}
        messages={settings.orderMessages}
      />
      {isOwner ? (
        <PaymentSheet
          action={recordPaymentAction.bind(null, shopId, order.id)}
        />
      ) : null}
    </div>
  );
}

function Totals({ order }: { order: OrderDetail }) {
  return (
    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-border-default pt-4 text-body">
      <dt className="text-text-secondary">Items</dt>
      <dd className="text-right tabular-nums">
        {formatRupees(order.totals.itemsPaise)}
      </dd>
      {order.fulfilment === 'DELIVERY' ? (
        <>
          <dt className="text-text-secondary">Delivery</dt>
          <dd className="text-right tabular-nums">
            {order.totals.deliveryChargePaise === 0
              ? 'Free'
              : formatRupees(order.totals.deliveryChargePaise)}
          </dd>
        </>
      ) : null}
      <dt className="text-body-large font-semibold">Total</dt>
      <dd className="text-right text-body-large font-semibold tabular-nums">
        {formatRupees(order.totals.totalPaise)}
      </dd>
    </dl>
  );
}
