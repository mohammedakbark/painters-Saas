import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StateMessage } from '@/components/ui/state-message';
import { listReviewQueue } from '@/lib/api/shop-review';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Reviews' };

export default function ReviewQueuePage(props: PageProps<'/platform/reviews'>) {
  return (
    <Suspense fallback={<PageLoading label="Loading the review queue…" />}>
      <ReviewQueue {...props} />
    </Suspense>
  );
}

async function ReviewQueue({ searchParams }: PageProps<'/platform/reviews'>) {
  const { token } = await requirePlatformAdmin();
  const search = await searchParams;
  const cursor = typeof search.cursor === 'string' ? search.cursor : undefined;
  const decided = search.decided;
  const page = await listReviewQueue(token, cursor);

  return (
    <div className="flex flex-col gap-6">
      {decided === 'approved' ? (
        <Alert tone="success" title="Shop approved">
          The shop is live.
        </Alert>
      ) : decided === 'changes' ? (
        <Alert tone="success" title="Changes requested">
          The owner sees your reasons and can submit the shop again.
        </Alert>
      ) : null}
      <PageHeader
        title="Reviews"
        description="Shops waiting for review, oldest first. Check each shop's photo, location, address, support mobile and products before deciding."
      />
      {page.items.length === 0 ? (
        <StateMessage
          title="No shops are waiting"
          description="Submitted shops appear here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {page.items.map((item) => (
            <Card
              as="li"
              key={item.reviewId}
              className="flex flex-wrap items-center justify-between gap-3 p-5"
            >
              <div className="flex flex-col gap-1">
                <Link
                  href={`/platform/reviews/${item.shopId}`}
                  className="text-heading3 font-semibold text-brand-primary underline-offset-4 hover:underline"
                >
                  {item.shopName}
                </Link>
                <span className="text-body text-text-secondary">
                  Submitted {formatDateTime(item.submittedAt)}
                </span>
              </div>
              {item.resubmission ? (
                <Badge tone="info">Submitted again</Badge>
              ) : (
                <Badge>First submission</Badge>
              )}
            </Card>
          ))}
        </ul>
      )}
      {page.nextCursor ? (
        <div>
          <ButtonLink
            href={`/platform/reviews?cursor=${encodeURIComponent(page.nextCursor)}`}
            variant="secondary"
          >
            Next page
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
