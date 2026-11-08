import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { ReviewDecisionForm } from '@/components/platform/review-decision-form';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cardClasses } from '@/components/ui/card';
import { StateMessage } from '@/components/ui/state-message';
import { PageHeader } from '@/components/ui/page-header';
import { orNotFound } from '@/lib/api/or-not-found';
import {
  getShopReviewSnapshot,
  type ShopReviewSnapshot,
} from '@/lib/api/shop-review';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { formatDate, formatDateTime } from '@/lib/format';
import { formatRupees } from '@/lib/money';
import { formatIndianMobile } from '@/lib/phone';
import { shopStatusLabel } from '@/lib/shops/labels';
import { checklistItemName, reviewReasonLabel } from '@/lib/shops/review';
import { decideReviewAction } from '../actions';
import { Panel } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Review a shop' };

export default function ShopReviewPage(
  props: PageProps<'/platform/reviews/[shopId]'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading the shop…" />}>
      <ShopReview {...props} />
    </Suspense>
  );
}

const card = cardClasses('flex flex-col gap-4 p-6');

async function ShopReview({ params }: PageProps<'/platform/reviews/[shopId]'>) {
  const { token } = await requirePlatformAdmin();
  const { shopId } = await params;
  const review = await orNotFound(getShopReviewSnapshot(token, shopId));
  const status = shopStatusLabel(review.shop.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: '/platform/reviews', label: 'All reviews' }}
        title={review.shop.name}
        description={
          <span className="flex flex-col gap-2">
            <span className="flex flex-wrap items-center gap-3">
              <Badge tone={status.tone}>{status.label}</Badge>
              {review.open?.resubmission ? (
                <Badge tone="neutral">Submitted again</Badge>
              ) : null}
              {review.open ? (
                <span>Submitted {formatDateTime(review.open.submittedAt)}</span>
              ) : null}
            </span>
            <span className="text-body">
              This page shows the shop&apos;s private details. Each view is
              recorded in the audit trail.
            </span>
          </span>
        }
      />

      <div className="grid gap-6 desktop:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ProfileSection review={review} />
          <ChecklistSection review={review} />
        </div>
        <div className="flex flex-col gap-6">
          <section aria-labelledby="decision-heading" className={card}>
            <h2 id="decision-heading" className="text-heading3 font-semibold">
              Decision
            </h2>
            {review.open ? (
              <ReviewDecisionForm
                action={decideReviewAction.bind(
                  null,
                  review.shop.id,
                  review.shop.name,
                )}
              />
            ) : (
              <Alert tone="info" title="Not waiting for review">
                This shop is {status.label.toLowerCase()}. A decision can be
                made after the owner submits it.
              </Alert>
            )}
          </section>
          <HistorySection review={review} />
        </div>
      </div>
      <ProductsSection review={review} />
    </div>
  );
}

function ProfileSection({ review }: { review: ShopReviewSnapshot }) {
  const { profile, shop } = review;
  const address = profile.address;
  const location = profile.location;
  return (
    <section aria-labelledby="profile-heading" className={card}>
      <h2 id="profile-heading" className="text-heading3 font-semibold">
        Shop profile
      </h2>
      {profile.photo ? (
        // Pre-sized WebP from object storage (see ImageUploadForm).
        // eslint-disable-next-line @next/next/no-img-element -- see above
        <img
          src={profile.photo.url}
          alt={`Photo of ${shop.name}`}
          className="aspect-video w-full rounded-image object-cover"
        />
      ) : (
        <StateMessage
          variant="plain"
          icon="alertCircle"
          title="No shop photo"
          description="The shop must add a photo before it can be approved."
        />
      )}
      <dl className="grid gap-3">
        <Detail label="Owner">
          {shop.master?.name ?? 'Not given'}
          {shop.master?.phone
            ? ` · ${formatIndianMobile(shop.master.phone)}`
            : ''}
        </Detail>
        <Detail label="Support mobile">
          {profile.supportPhone
            ? formatIndianMobile(profile.supportPhone)
            : 'Not given'}
        </Detail>
        <Detail label="Address">
          {address ? (
            <span className="flex flex-col">
              <span>{address.line1}</span>
              {address.line2 ? <span>{address.line2}</span> : null}
              {address.landmark ? <span>Near {address.landmark}</span> : null}
              <span>
                {address.city}, {address.district}
              </span>
              <span>
                {address.stateName} {address.postalCode}
              </span>
            </span>
          ) : (
            'Not given'
          )}
        </Detail>
        <Detail label="Map location">
          {location ? (
            <span className="flex flex-col gap-1">
              <span className="tabular-nums">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}{' '}
                (
                {location.source === 'DEVICE_GPS'
                  ? 'current location'
                  : 'map pin'}
                )
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-primary underline underline-offset-4"
              >
                Open in Google Maps (new tab)
              </a>
            </span>
          ) : (
            'Not given'
          )}
        </Detail>
        <Detail label="Registered">{formatDate(shop.createdAt)}</Detail>
      </dl>
    </section>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption font-semibold text-text-secondary">
        {label}
      </dt>
      <dd className="text-body-large text-text-primary">{children}</dd>
    </div>
  );
}

function ChecklistSection({ review }: { review: ShopReviewSnapshot }) {
  return (
    <section aria-labelledby="checklist-heading" className={card}>
      <h2 id="checklist-heading" className="text-heading3 font-semibold">
        Checklist
      </h2>
      <ul className="flex flex-col divide-y divide-border-default">
        {review.checklist.items.map((item) => (
          <li
            key={item.key}
            className="flex items-center justify-between gap-3 py-2"
          >
            <span className="text-body-large">
              {checklistItemName(item.key)}
              {item.progress
                ? ` (${item.progress.current} of ${item.progress.required})`
                : ''}
            </span>
            {item.done ? (
              <Badge tone="success">Done</Badge>
            ) : (
              <Badge tone="warning">Missing</Badge>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function HistorySection({ review }: { review: ShopReviewSnapshot }) {
  return (
    <section aria-labelledby="history-heading" className={card}>
      <h2 id="history-heading" className="text-heading3 font-semibold">
        Earlier submissions
      </h2>
      {review.history.length === 0 ? (
        <p className="text-body text-text-secondary">No earlier submissions.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {review.history.map((entry) => (
            <li key={entry.decidedAt} className="flex flex-col gap-1">
              <span className="text-body-large font-semibold">
                {entry.decision === 'APPROVED'
                  ? 'Approved'
                  : entry.decision === 'CHANGES_REQUESTED'
                    ? 'Changes requested'
                    : 'Withdrawn by the owner'}{' '}
                <span className="font-normal text-text-secondary">
                  · {formatDateTime(entry.decidedAt)}
                </span>
              </span>
              {entry.reasons.length > 0 ? (
                <ul className="list-disc pl-5 text-body">
                  {entry.reasons.map((reason) => (
                    <li key={reason}>{reviewReasonLabel(reason)}</li>
                  ))}
                </ul>
              ) : null}
              {entry.note ? (
                <p className="text-body text-text-secondary">
                  Note: <q>{entry.note}</q>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProductsSection({ review }: { review: ShopReviewSnapshot }) {
  const { activeCount, items } = review.products;
  return (
    <section aria-labelledby="products-heading" className={card}>
      <h2 id="products-heading" className="text-heading3 font-semibold">
        Products on sale ({activeCount})
      </h2>
      {activeCount > items.length ? (
        <p className="text-body text-text-secondary">
          Showing the newest {items.length}.
        </p>
      ) : null}
      {items.length === 0 ? (
        <StateMessage
          variant="plain"
          icon="tag"
          title="No products yet"
          description="The shop has not listed any products."
        />
      ) : (
        <ul className="grid gap-3 desktop:grid-cols-2">
          {items.map((product) => (
            <Panel as="li" key={product.id} className="flex flex-col gap-2 p-4">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-body-large font-semibold">
                  {product.name}
                </span>
                {product.source === 'own' ? (
                  <Badge tone="info">Own product</Badge>
                ) : null}
              </span>
              <span className="text-body text-text-secondary">
                {[product.brand?.name, product.category.name]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <ul className="flex flex-col gap-1">
                {product.packs.map((pack) => (
                  <li key={pack.id} className="text-body tabular-nums">
                    {pack.label}: {formatRupees(pack.pricePaise)}
                    {pack.mrpPaise === null
                      ? ''
                      : ` (MRP ${formatRupees(pack.mrpPaise)})`}
                    {pack.available ? '' : ' · unavailable'}
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </ul>
      )}
    </section>
  );
}
