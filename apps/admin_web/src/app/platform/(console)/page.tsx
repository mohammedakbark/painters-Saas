import { PageHeader } from '@/components/ui/page-header';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';

export default async function PlatformOverviewPage() {
  const admin = await requirePlatformAdmin();

  return (
    <>
      <PageHeader
        title="Platform overview"
        description={admin.email ? `Signed in as ${admin.email}.` : undefined}
      />
      <section className="rounded-large border border-border-default bg-surface-default p-6">
        <h2 className="text-heading3 font-semibold">Platform tools</h2>
        <p className="mt-2 text-body-large text-text-secondary">
          Platform tools appear in the navigation as they are released.
        </p>
      </section>
    </>
  );
}
