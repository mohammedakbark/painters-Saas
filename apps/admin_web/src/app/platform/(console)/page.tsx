import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BRAND } from '@/lib/brand';
import { PageHeader } from '@/components/ui/page-header';
import { SectionBoundary } from '@/components/ui/section-boundary';
import { TilesSkeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/ui/stat-tile';
import { getPlatformSummary } from '@/lib/api/platform-shops';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { countLabel, daysSince } from '@/lib/format';

// The console's title template applies below this folder, not to this page.
export const metadata: Metadata = {
  title: { absolute: `Overview · Platform · ${BRAND.adminPortalName}` },
};

/**
 * Platform Overview (UX-003): what needs attention (reviews), shops by
 * status and the shared catalogue, each linking to the list behind it.
 * The heading is static; the figures load on their own (PERF-001).
 */
export default function PlatformOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Overview"
        title="Platform at a glance"
        description="Shops waiting for review, shops by status and the shared brand catalogue."
      />
      <SectionBoundary what="platform figures">
        <Suspense fallback={<OverviewSkeleton />}>
          <Figures />
        </Suspense>
      </SectionBoundary>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <TilesSkeleton label="Loading platform figures…" />
      <TilesSkeleton label="Loading catalogue figures…" tiles={3} />
    </div>
  );
}

async function Figures() {
  const { token } = await requirePlatformAdmin();
  const { reviews, shops, catalogue } = await getPlatformSummary(token);
  const oldestDays = reviews.oldestSubmittedAt
    ? daysSince(reviews.oldestSubmittedAt)
    : null;

  return (
    <>
      <section aria-labelledby="shops-heading" className="flex flex-col gap-3">
        <h2 id="shops-heading" className="text-heading3 font-semibold">
          Shops
        </h2>
        <div className="grid grid-cols-2 gap-4 wide:grid-cols-4">
          <StatTile
            label="Waiting for review"
            value={reviews.waiting}
            status={
              reviews.waiting > 0
                ? { tone: 'info', label: 'Needs attention' }
                : undefined
            }
            context={
              oldestDays === null
                ? undefined
                : oldestDays === 0
                  ? 'Oldest sent today'
                  : `Oldest waiting ${countLabel(oldestDays, 'day')}`
            }
            href="/platform/reviews"
          />
          <StatTile
            label="Live"
            value={shops.live}
            href="/platform/shops?status=ACTIVE"
          />
          <StatTile
            label="Changes requested"
            value={shops.changesRequested}
            status={
              shops.changesRequested > 0
                ? { tone: 'warning', label: 'With the shop' }
                : undefined
            }
            href="/platform/shops?status=CHANGES_REQUESTED"
          />
          <StatTile
            label="Draft"
            value={shops.draft}
            context="Still setting up"
            href="/platform/shops?status=DRAFT"
          />
        </div>
      </section>
      <section
        aria-labelledby="catalogue-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="catalogue-heading" className="text-heading3 font-semibold">
          Brand catalogue
        </h2>
        <div className="grid grid-cols-2 gap-4 wide:grid-cols-4">
          <StatTile
            label="Active brands"
            value={catalogue.brands}
            href="/platform/catalogue"
          />
          <StatTile label="Active products" value={catalogue.products} />
          <StatTile label="Active shades" value={catalogue.shades} />
        </div>
      </section>
    </>
  );
}
