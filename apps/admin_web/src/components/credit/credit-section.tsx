import Link from 'next/link';
import {
  changeCreditAction,
  checkIdAction,
} from '@/app/shops/[shopId]/customers/credit-actions';
import {
  CREDIT_CHANGE_SHEET,
  CREDIT_GIVE_SHEET,
  CREDIT_ID_SHEET,
  CREDIT_STOP_SHEET,
  CreditLimitSheet,
  IdCheckSheet,
  StopCreditSheet,
} from '@/components/credit/credit-forms';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import { getCredit } from '@/lib/api/credit';
import { requireShopSession } from '@/lib/auth/shop-access';
import {
  creditEventLabel,
  creditState,
  ID_TYPE_LABEL,
} from '@/lib/credit/labels';
import { formatRupees } from '@/lib/money';
import { formatOrderTime, orderNumber, ordersBase } from '@/lib/orders/labels';

/**
 * A customer's credit with this shop (CRD-001, D-064): the limit and what
 * is left, the ID check, and every change. Loads on its own behind Suspense
 * (D-044). Changing needs `credit.manage`; the API checks it again.
 */
export async function CreditSection({
  shopId,
  customerId,
  page,
  pageHref,
  canManage,
}: {
  shopId: string;
  customerId: string;
  page: number;
  pageHref: (page: number) => string;
  canManage: boolean;
}) {
  const credit = await getCredit(
    await requireShopSession(),
    shopId,
    customerId,
    page,
  );
  const state = creditState(credit.status, credit.leftPaise);
  const active = credit.status === 'active';
  const events = credit.events.items;

  return (
    <Card
      as="section"
      aria-labelledby="credit-heading"
      className="flex flex-col gap-4 p-5 medium:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="credit-heading" className="text-heading3 font-semibold">
            Credit
          </h2>
          <p className="flex flex-wrap items-center gap-3">
            {active ? (
              <span className="text-heading2 font-semibold tabular-nums">
                {formatRupees(credit.limitPaise ?? 0)}
              </span>
            ) : null}
            <Badge tone={state.tone}>{state.label}</Badge>
          </p>
          {active && credit.leftPaise !== null ? (
            <p className="text-body text-text-secondary">
              {credit.leftPaise >= 0
                ? `${formatRupees(credit.leftPaise)} left · owes ${formatRupees(credit.owedPaise)}`
                : `${formatRupees(-credit.leftPaise)} over · owes ${formatRupees(credit.owedPaise)}`}
            </p>
          ) : null}
        </div>
        {canManage && credit.eligible ? (
          <div className="flex flex-wrap gap-3">
            {active ? (
              <>
                <SideSheetButton sheet={CREDIT_CHANGE_SHEET}>
                  Change limit
                </SideSheetButton>
                <SideSheetButton sheet={CREDIT_STOP_SHEET} variant="secondary">
                  Stop credit
                </SideSheetButton>
              </>
            ) : credit.idCheck ? (
              <SideSheetButton sheet={CREDIT_GIVE_SHEET}>
                Give credit
              </SideSheetButton>
            ) : (
              <SideSheetButton sheet={CREDIT_ID_SHEET}>
                Check ID
              </SideSheetButton>
            )}
          </div>
        ) : null}
      </div>

      {!credit.eligible ? (
        <p className="text-body text-text-secondary">
          Credit needs the customer to use the app with this mobile number and
          connect to your shop.
        </p>
      ) : credit.idCheck ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body">
          <span className="font-semibold">
            {ID_TYPE_LABEL[credit.idCheck.type]} ···{credit.idCheck.last4}
          </span>
          <span className="text-text-secondary">
            Checked by {credit.idCheck.checkedBy},{' '}
            {formatOrderTime(credit.idCheck.checkedAt)}
          </span>
          {canManage ? (
            <SideSheetButton
              sheet={CREDIT_ID_SHEET}
              variant="tertiary"
              size="compact"
            >
              Check again
            </SideSheetButton>
          ) : null}
        </p>
      ) : (
        <p className="text-body text-text-secondary">
          Check the customer’s original ID at the counter before giving credit.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-title font-semibold">History</h3>
        {events.length === 0 ? (
          <StateMessage
            variant="plain"
            icon="receipt"
            title="No credit changes yet"
            description="ID checks, limits and orders accepted over the limit show here."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border-default">
            {events.map((event) => (
              <li key={event.id} className="flex flex-col gap-0.5 py-3">
                <span className="font-semibold">
                  {creditEventLabel(event)}
                  {event.order ? (
                    <>
                      {' · '}
                      <Link
                        href={`${ordersBase(shopId)}/${event.order.id}`}
                        className="rounded-nav-item text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
                      >
                        {orderNumber(event.order.number)}
                      </Link>
                    </>
                  ) : null}
                </span>
                <span className="text-caption text-text-secondary">
                  {formatOrderTime(event.at)} · {event.by}
                  {event.reason ? ` · ${event.reason}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
        {page > 1 || credit.events.hasMore ? (
          <div className="flex flex-wrap justify-between gap-3">
            {page > 1 ? (
              <ButtonLink href={pageHref(page - 1)} variant="tertiary">
                Newer
              </ButtonLink>
            ) : (
              <span />
            )}
            {credit.events.hasMore ? (
              <ButtonLink href={pageHref(page + 1)} variant="tertiary">
                Older
              </ButtonLink>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Always mounted: each sheet shows its toast after the save. */}
      {canManage && credit.eligible ? (
        <>
          <IdCheckSheet action={checkIdAction.bind(null, shopId, customerId)} />
          <CreditLimitSheet
            kind="give"
            currentPaise={null}
            action={changeCreditAction.bind(null, shopId, customerId, 'give')}
          />
          <CreditLimitSheet
            kind="change"
            currentPaise={credit.limitPaise}
            action={changeCreditAction.bind(null, shopId, customerId, 'change')}
          />
          <StopCreditSheet
            action={changeCreditAction.bind(null, shopId, customerId, 'stop')}
          />
        </>
      ) : null}
    </Card>
  );
}
