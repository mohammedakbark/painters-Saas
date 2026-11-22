import Link from 'next/link';
import { recordBillMoneyAction } from '@/app/shops/[shopId]/bills/actions';
import {
  BILL_PAYMENT_SHEET,
  BILL_REFUND_SHEET,
  BillMoneySheet,
} from '@/components/bills/bill-forms';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import { getBill } from '@/lib/api/bills';
import { requireShopSession } from '@/lib/auth/shop-access';
import { balanceState, ENTRY_LABEL, signedRupees } from '@/lib/bills/labels';
import { formatRupees } from '@/lib/money';
import {
  formatOrderTime,
  orderNumber,
  ordersBase,
  PAYMENT_METHOD_LABEL,
} from '@/lib/orders/labels';

/**
 * A customer's running bill with this shop (BIL-001, D-062): who owes whom,
 * what each site was billed (painters), and every entry, newest first.
 * Loads on its own behind Suspense (D-044). Recording needs the payments
 * permission; the API checks it again.
 */
export async function BillSection({
  shopId,
  customerId,
  page,
  pageHref,
  canRecord,
}: {
  shopId: string;
  customerId: string;
  page: number;
  pageHref: (page: number) => string;
  canRecord: boolean;
}) {
  const bill = await getBill(
    await requireShopSession(),
    shopId,
    customerId,
    page,
  );
  const state = balanceState(bill.balancePaise);
  const entries = bill.entries.items;

  return (
    <Card
      as="section"
      aria-labelledby="bill-heading"
      className="flex flex-col gap-4 p-5 medium:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="bill-heading" className="text-heading3 font-semibold">
            Bill
          </h2>
          <p className="flex flex-wrap items-center gap-3">
            <span className="text-heading2 font-semibold tabular-nums">
              {state.amount}
            </span>
            <Badge tone={state.tone}>{state.label}</Badge>
          </p>
        </div>
        {canRecord && bill.balancePaise !== 0 ? (
          <SideSheetButton
            sheet={
              bill.balancePaise > 0 ? BILL_PAYMENT_SHEET : BILL_REFUND_SHEET
            }
          >
            {bill.balancePaise > 0 ? 'Record payment' : 'Record refund'}
          </SideSheetButton>
        ) : null}
      </div>
      {bill.balancePaise < 0 ? (
        <p className="text-body text-text-secondary">
          A return left you owing the customer. Record a refund, or it pays
          their next orders.
        </p>
      ) : null}

      {bill.sites.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-title font-semibold">Billed by site</h3>
          <ul className="flex flex-col divide-y divide-border-default">
            {bill.sites.map((site) => (
              <li
                key={site.label}
                className="flex flex-wrap items-center justify-between gap-3 py-2"
              >
                <span>
                  {site.label}{' '}
                  <span className="text-caption text-text-secondary">
                    · {site.orderCount}{' '}
                    {site.orderCount === 1 ? 'order' : 'orders'}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">
                  {formatRupees(site.billedPaise)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-caption text-text-secondary">
            Payments go against the one balance, not a site.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-title font-semibold">Entries</h3>
        {entries.length === 0 ? (
          <StateMessage
            variant="plain"
            icon="receipt"
            title="Nothing on the bill yet"
            description="Completed orders and payments show here."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border-default">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold">
                    {ENTRY_LABEL[entry.kind]}
                    {entry.order ? (
                      <>
                        {' · '}
                        <Link
                          href={`${ordersBase(shopId)}/${entry.order.id}`}
                          className="rounded-nav-item text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
                        >
                          {orderNumber(entry.order.number)}
                        </Link>
                      </>
                    ) : null}
                    {entry.method
                      ? ` · ${PAYMENT_METHOD_LABEL[entry.method]}`
                      : ''}
                  </span>
                  <span className="text-caption text-text-secondary">
                    {formatOrderTime(entry.createdAt)}
                    {entry.order?.siteLabel
                      ? ` · ${entry.order.siteLabel}`
                      : ''}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </span>
                </div>
                <span className="font-semibold tabular-nums">
                  {signedRupees(entry.amountPaise)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {page > 1 || bill.entries.hasMore ? (
          <div className="flex flex-wrap justify-between gap-3">
            {page > 1 ? (
              <ButtonLink href={pageHref(page - 1)} variant="tertiary">
                Newer entries
              </ButtonLink>
            ) : (
              <span />
            )}
            {bill.entries.hasMore ? (
              <ButtonLink href={pageHref(page + 1)} variant="tertiary">
                Older entries
              </ButtonLink>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Always mounted: the sheet shows the toast after the save settles the bill. */}
      {canRecord ? (
        <>
          <BillMoneySheet
            kind="payment"
            maxPaise={Math.max(bill.balancePaise, 0)}
            action={recordBillMoneyAction.bind(
              null,
              shopId,
              customerId,
              'payments',
            )}
          />
          <BillMoneySheet
            kind="refund"
            maxPaise={Math.max(-bill.balancePaise, 0)}
            action={recordBillMoneyAction.bind(
              null,
              shopId,
              customerId,
              'refunds',
            )}
          />
        </>
      ) : null}
    </Card>
  );
}
