import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { OnboardingChecklist } from '@/components/shops/onboarding-checklist';
import { Card, CardLink } from '@/components/ui/card';
import { Icon, IconTile } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { ReviewPanel } from '@/components/shops/review-panel';
import { getShopOnboarding } from '@/lib/api/shop-profile';
import { getShopReview } from '@/lib/api/shop-review';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { shopRoleLabel, shopStatusLabel } from '@/lib/shops/labels';
import { submitForReviewAction, withdrawReviewAction } from './review-actions';

/**
 * Request data is read inside Suspense so navigating here from another page
 * of the shop console is instant (only the page below the shared layout
 * re-renders, so the layout's own boundary does not cover it).
 */
export default function ShopOverviewPage(props: PageProps<'/shops/[shopId]'>) {
  return (
    <Suspense fallback={<PageLoading label="Loading your shop…" />}>
      <ShopOverview {...props} />
    </Suspense>
  );
}

async function ShopOverview({
  params,
  searchParams,
}: PageProps<'/shops/[shopId]'>) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  const [onboarding, review] = await Promise.all([
    getShopOnboarding(token, shopId),
    getShopReview(token, shopId),
  ]);
  const justRegistered = (await searchParams).registered === '1';
  const status = shopStatusLabel(review.status);

  return (
    <>
      {justRegistered ? (
        <Alert tone="success" title="Shop registered">
          {shop.name} is registered and you are its owner.
        </Alert>
      ) : null}
      <PageHeader
        eyebrow="Overview"
        title={shop.name}
        description={shopRoleLabel(shop.myRole)}
      />
      <div className="grid items-start gap-6 desktop:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <Card
            as="section"
            aria-labelledby="status-heading"
            className="flex flex-col gap-4 p-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="status-heading" className="text-heading3 font-semibold">
                Status
              </h2>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <p className="text-body-large text-text-secondary">
              {status.description}
            </p>
            <ReviewPanel
              review={review}
              canEdit={shop.myRole === 'MASTER'}
              submitAction={submitForReviewAction.bind(null, shop.id)}
              withdrawAction={withdrawReviewAction.bind(null, shop.id)}
            />
          </Card>
          <OnboardingChecklist shopId={shop.id} onboarding={onboarding} />
        </div>
        <nav aria-label="Manage your shop">
          <ul className="grid gap-4 medium:grid-cols-2 desktop:grid-cols-1">
            {[
              {
                href: `/shops/${shop.id}/profile`,
                icon: 'store' as const,
                title: 'Shop profile',
                text: 'Photo, support mobile, address and map location.',
              },
              {
                href: `/shops/${shop.id}/catalogue`,
                icon: 'tag' as const,
                title: 'Catalogue',
                text: 'The products you sell, with a price and availability for each pack size.',
              },
            ].map((item) => (
              <li key={item.href}>
                <CardLink
                  href={item.href}
                  variant="raised"
                  className="flex h-full flex-col gap-3 p-5"
                >
                  <span className="flex items-center justify-between gap-3">
                    <IconTile name={item.icon} />
                    <Icon
                      name="arrowRight"
                      className="text-brand-primary transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </span>
                  <span className="text-title font-semibold text-text-primary">
                    {item.title}
                  </span>
                  <span className="text-body text-text-secondary">
                    {item.text}
                  </span>
                </CardLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
