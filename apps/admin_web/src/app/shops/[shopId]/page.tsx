import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { requireShopAccess } from '@/lib/auth/shop-access';
import { shopRoleLabel, shopStatusLabel } from '@/lib/shops/labels';

export default async function ShopOverviewPage({
  params,
  searchParams,
}: PageProps<'/shops/[shopId]'>) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const justRegistered = (await searchParams).registered === '1';
  const status = shopStatusLabel(shop.status);

  return (
    <>
      {justRegistered ? (
        <Alert tone="success" title="Shop registered">
          {shop.name} is registered and you are its owner.
        </Alert>
      ) : null}
      <PageHeader title={shop.name} description={shopRoleLabel(shop.myRole)} />
      <section className="flex flex-col gap-3 rounded-large border border-border-default bg-surface-default p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-heading3 font-semibold">Status</h2>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="text-body-large text-text-secondary">
          {status.description} Before your shop can go live you will complete
          its profile (photo, address and support mobile), add at least 10
          products and submit it for review by the platform team. These steps
          will appear here as they become available.
        </p>
      </section>
    </>
  );
}
