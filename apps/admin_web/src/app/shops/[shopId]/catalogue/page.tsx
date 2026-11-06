import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { ActionButtonForm } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { SegmentedLinks } from '@/components/ui/segmented-links';
import { PageHeader } from '@/components/ui/page-header';
import { StateMessage } from '@/components/ui/state-message';
import { listShopProducts } from '@/lib/api/shop-catalogue';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { countLabel } from '@/lib/format';
import { formatRupees } from '@/lib/money';
import { setPackAvailableAction } from './actions';
import {
  CatalogueTabs,
  catalogueBase,
  ProductBadges,
  productSubtitle,
} from './catalogue-parts';

export const metadata: Metadata = { title: 'Catalogue' };

export default function CataloguePage(
  props: PageProps<'/shops/[shopId]/catalogue'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading your catalogue…" />}>
      <Catalogue {...props} />
    </Suspense>
  );
}

const text = (value: string | string[] | undefined) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

async function Catalogue({
  params,
  searchParams,
}: PageProps<'/shops/[shopId]/catalogue'>) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  const search = await searchParams;
  const q = text(search.q)?.slice(0, 60);
  const status = search.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';
  const cursor = text(search.cursor);
  const page = await listShopProducts(token, shopId, {
    q,
    status,
    cursor,
    limit: 20,
  });
  const canEdit = shop.myRole === 'MASTER';
  const base = catalogueBase(shopId);
  const link = (next: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, status, ...next })) {
      if (value && !(key === 'status' && value === 'ACTIVE')) {
        query.set(key, value);
      }
    }
    const qs = query.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catalogue"
        description="The products you sell, with a price and availability for each pack size."
        actions={
          canEdit ? (
            <>
              <ButtonLink href={`${base}/add`}>
                Add from brand catalogue
              </ButtonLink>
              <ButtonLink href={`${base}/new`} variant="secondary">
                Add your own product
              </ButtonLink>
            </>
          ) : undefined
        }
      />
      <CatalogueTabs shopId={shopId} />

      <div className="flex flex-col gap-4 medium:flex-row medium:items-end medium:justify-between">
        <form
          method="get"
          action={base}
          role="search"
          className="flex w-full flex-col gap-3 medium:max-w-content medium:flex-row medium:items-end"
        >
          <div className="w-full medium:max-w-narrow">
            <Field
              label="Search products"
              name="q"
              type="search"
              maxLength={60}
              defaultValue={q}
              placeholder="Product or brand name"
              leadingIcon="search"
            />
          </div>
          {status === 'ARCHIVED' ? (
            <input type="hidden" name="status" value="ARCHIVED" />
          ) : null}
          <Button type="submit" variant="secondary" className="shrink-0">
            Search
          </Button>
        </form>
        <SegmentedLinks
          label="Product status"
          segments={(['ACTIVE', 'ARCHIVED'] as const).map((value) => ({
            href: link({ status: value, cursor: undefined }),
            label: value === 'ACTIVE' ? 'Selling' : 'Archived',
            current: status === value,
          }))}
        />
      </div>

      {page.items.length === 0 ? (
        <StateMessage
          icon={q ? 'search' : 'tag'}
          title={
            q
              ? 'No products match your search'
              : status === 'ARCHIVED'
                ? 'No archived products'
                : 'No products yet'
          }
          description={
            q
              ? 'Try another product or brand name.'
              : status === 'ARCHIVED'
                ? undefined
                : 'Add products from the brand catalogue, or add your own. Your shop needs at least 10 products before it can be reviewed.'
          }
          action={
            canEdit && !q && status === 'ACTIVE' ? (
              <>
                <ButtonLink href={`${base}/add`}>
                  Add from brand catalogue
                </ButtonLink>
                <ButtonLink href={`${base}/new`} variant="secondary">
                  Add your own product
                </ButtonLink>
              </>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {page.items.map((product) => (
            <Card
              as="li"
              key={product.id}
              className="flex flex-col gap-4 p-5 medium:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`${base}/products/${product.id}`}
                    className="group inline-flex w-fit items-center gap-2 rounded-nav-item text-heading3 font-semibold text-text-primary hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-primary"
                  >
                    {product.name}
                    <Icon
                      name="arrowRight"
                      className="size-4 text-brand-primary transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                  <p className="text-body text-text-secondary">
                    {productSubtitle(product)} ·{' '}
                    {countLabel(product.packs.length, 'pack size')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ProductBadges product={product} />
                </div>
              </div>
              <ul className="flex flex-col divide-y divide-border-default rounded-panel border border-panel-border">
                {product.packs.map((pack) => (
                  <li
                    key={pack.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 medium:grid-cols-[6rem_12rem_minmax(0,1fr)_auto]"
                  >
                    <span className="text-body-large font-semibold text-text-primary">
                      {pack.label}
                    </span>
                    <span className="text-right text-body-large text-text-primary tabular-nums medium:text-left">
                      {formatRupees(pack.pricePaise)}
                      {pack.mrpPaise === null ? null : (
                        <span className="ml-2 text-body text-text-secondary">
                          MRP {formatRupees(pack.mrpPaise)}
                        </span>
                      )}
                    </span>
                    <span>
                      {pack.available ? (
                        <Badge tone="success">Available</Badge>
                      ) : (
                        <Badge tone="warning">Unavailable</Badge>
                      )}
                    </span>
                    <span className="justify-self-end">
                      {canEdit && product.status === 'ACTIVE' ? (
                        <ActionButtonForm
                          action={setPackAvailableAction.bind(
                            null,
                            shopId,
                            product.id,
                            pack.id,
                            !pack.available,
                          )}
                          label={
                            pack.available
                              ? 'Mark unavailable'
                              : 'Mark available'
                          }
                          pendingLabel="Saving…"
                          variant="tertiary"
                          accessibleLabel={`Mark ${product.name} ${pack.label} ${
                            pack.available ? 'unavailable' : 'available'
                          }`}
                        />
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </ul>
      )}

      {page.nextCursor ? (
        <div>
          <ButtonLink
            href={link({ cursor: page.nextCursor })}
            variant="secondary"
          >
            Next page
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
