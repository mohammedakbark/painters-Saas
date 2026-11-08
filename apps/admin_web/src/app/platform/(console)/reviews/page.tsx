import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import {
  ColumnSearchFilter,
  ColumnSelectFilter,
} from '@/components/ui/column-filter';
import { type Column, DataTable } from '@/components/ui/data-table';
import { FilterForm } from '@/components/ui/filter-form';
import { FlashToast } from '@/components/ui/flash-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { StateMessage } from '@/components/ui/state-message';
import { Thumbnail } from '@/components/ui/thumbnail';
import {
  listReviewQueue,
  type ReviewQueuePage,
  type ReviewQueueParams,
} from '@/lib/api/shop-review';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { daysSince, formatDateTime } from '@/lib/format';
import { listLink, oneOf, readPaging, text } from '@/lib/list-params';
import { formatIndianMobile } from '@/lib/phone';

export const metadata: Metadata = { title: 'Reviews' };

const BASE = '/platform/reviews';
const FORM = 'review-filters';
const DEFAULTS = { sort: 'oldest', page: '1', pageSize: '25' };
/** A shop waiting this long or more is highlighted. */
const LONG_WAIT_DAYS = 2;

type Entry = ReviewQueuePage['items'][number];

export default function ReviewQueuePage(props: PageProps<'/platform/reviews'>) {
  return (
    <Suspense fallback={<PageLoading label="Loading the review queue…" />}>
      <ReviewQueue {...props} />
    </Suspense>
  );
}

function waitingLabel(days: number): string {
  if (days < 1) return 'Waiting since today';
  return days === 1 ? 'Waiting 1 day' : `Waiting ${days} days`;
}

async function ReviewQueue({ searchParams }: PageProps<'/platform/reviews'>) {
  const { token } = await requirePlatformAdmin();
  const search = await searchParams;
  const decided = search.decided;
  const shopName =
    typeof search.shop === 'string' ? search.shop.slice(0, 120) : null;
  const state: ReviewQueueParams = {
    q: text(search.q)?.slice(0, 60),
    sort: oneOf(['oldest', 'newest'] as const, text(search.sort), 'oldest'),
    ...readPaging(search),
  };
  const data = await listReviewQueue(token, state);
  const link = (next: Partial<ReviewQueueParams>) =>
    listLink(BASE, { ...state, ...next }, DEFAULTS);

  const columns: Column<Entry>[] = [
    {
      key: 'photo',
      header: 'Photo',
      width: 'w-20',
      cell: (item) => (
        <Thumbnail
          src={item.photoThumbUrl}
          alt={`Photo of ${item.shopName}`}
          placeholder="store"
        />
      ),
    },
    {
      key: 'shop',
      header: 'Shop',
      cell: (item) => (
        <span className="flex flex-col items-end gap-1 desktop:items-start">
          <Link
            href={`${BASE}/${item.shopId}`}
            className="rounded-nav-item text-body-large font-semibold text-text-primary hover:text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            {item.shopName}
          </Link>
          {item.resubmission ? (
            <Badge tone="info">Submitted again</Badge>
          ) : null}
        </span>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      cell: (item) => (
        <span className="flex flex-col items-end desktop:items-start">
          <span className="font-medium">{item.ownerName ?? 'No name'}</span>
          {item.ownerPhone ? (
            <span className="text-caption text-text-secondary tabular-nums">
              {formatIndianMobile(item.ownerPhone)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      width: 'w-56',
      cell: (item) => {
        const days = daysSince(item.submittedAt);
        return (
          <span className="flex flex-col items-end gap-1 desktop:items-start">
            <span className="text-body">
              {formatDateTime(item.submittedAt)}
            </span>
            <Badge tone={days >= LONG_WAIT_DAYS ? 'warning' : 'neutral'}>
              {waitingLabel(days)}
            </Badge>
          </span>
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      align: 'end',
      width: 'w-36',
      cell: (item) => (
        <ButtonLink href={`${BASE}/${item.shopId}`}>Review</ButtonLink>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {decided === 'approved' ? (
        <FlashToast
          param="decided"
          message={`${shopName ?? 'The shop'} is approved and now live.`}
        />
      ) : decided === 'changes' ? (
        <FlashToast
          param="decided"
          message={`Changes requested from ${shopName ?? 'the shop'}. The owner sees your reasons and can submit again.`}
        />
      ) : null}
      <PageHeader
        title="Reviews"
        description="Shops waiting for review, oldest first. Check each shop's photo, location, address, support mobile and products before deciding."
      />
      <FilterForm
        id={FORM}
        action={BASE}
        className="grid gap-3 rounded-card border border-card-border bg-card-background p-4 medium:grid-cols-[minmax(0,1fr)_14rem] medium:items-end"
      >
        <ColumnSearchFilter
          form={FORM}
          name="q"
          label="Search the queue"
          placeholder="Shop name, owner or mobile, then press Enter"
          value={state.q}
        />
        <ColumnSelectFilter
          form={FORM}
          name="sort"
          label="Sort"
          allLabel="Oldest first"
          value={state.sort === 'oldest' ? undefined : state.sort}
          options={[{ value: 'newest', label: 'Newest first' }]}
        />
      </FilterForm>
      <DataTable
        caption="Shops waiting for review"
        columns={columns}
        rows={data.items}
        rowKey={(item) => item.reviewId}
        empty={
          <StateMessage
            icon="shield"
            title={
              state.q
                ? 'No waiting shop matches this search'
                : 'No shops are waiting'
            }
            description={state.q ? undefined : 'Submitted shops appear here.'}
            action={
              state.q ? (
                <ButtonLink
                  href={link({ q: undefined, page: 1 })}
                  variant="secondary"
                >
                  Clear search
                </ButtonLink>
              ) : undefined
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
        noun="shops"
      />
    </div>
  );
}
