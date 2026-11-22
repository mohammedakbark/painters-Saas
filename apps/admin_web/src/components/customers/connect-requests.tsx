import Link from 'next/link';
import { answerConnectRequestAction } from '@/app/shops/[shopId]/customers/actions';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Card } from '@/components/ui/card';
import { listConnectRequests } from '@/lib/api/connect';
import { requireShopSession } from '@/lib/auth/shop-access';
import { customerPath } from '@/lib/customers/customer-forms';
import { formatOrderTime } from '@/lib/orders/labels';
import { formatIndianMobile } from '@/lib/phone';

/**
 * Requests from app users to connect the records you keep of their mobile
 * (CON-001, D-063). Shown only when there are any; loads on its own
 * (D-044). Approving shares this record's orders and bill with the person;
 * when they already order here in the app, the two records become one.
 */
export async function ConnectRequests({ shopId }: { shopId: string }) {
  const requests = await listConnectRequests(
    await requireShopSession(),
    shopId,
  );
  if (requests.length === 0) return null;
  return (
    <Card
      as="section"
      aria-labelledby="connect-heading"
      className="flex flex-col gap-3 p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="connect-heading" className="text-title font-semibold">
          Connection requests
        </h2>
        <p className="text-body text-text-secondary">
          These people use the app with a mobile you have recorded. Connect only
          if they asked you to.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border-default">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link
                href={customerPath(shopId, request.customer.id)}
                className="w-fit rounded-nav-item font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
              >
                {request.customer.name}
              </Link>
              <span className="text-caption text-text-secondary">
                {formatIndianMobile(request.customer.phone)} · asked{' '}
                {formatOrderTime(request.requestedAt)}
                {request.mergesIntoAppRecord
                  ? ' · already orders in the app'
                  : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <ConfirmActionButton
                action={answerConnectRequestAction.bind(
                  null,
                  shopId,
                  request.id,
                  request.customer.name,
                  false,
                )}
                label="Decline"
                accessibleLabel={`Decline ${request.customer.name}'s request`}
                title={`Decline ${request.customer.name}'s request?`}
                message="Your records stay private to your shop. They can ask again later."
                confirmLabel="Decline"
              />
              <ConfirmActionButton
                action={answerConnectRequestAction.bind(
                  null,
                  shopId,
                  request.id,
                  request.customer.name,
                  true,
                )}
                label="Connect"
                variant="secondary"
                accessibleLabel={`Connect ${request.customer.name}'s records`}
                title={`Connect ${request.customer.name}'s records?`}
                message={
                  request.mergesIntoAppRecord
                    ? 'They already order here in the app. Your record, its orders, bill and sites move into their app record, and the two become one. Amounts don’t change. This can’t be undone.'
                    : 'They will see the orders and bill of this record in their app. This can’t be undone.'
                }
                confirmLabel="Connect"
                tone="default"
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
