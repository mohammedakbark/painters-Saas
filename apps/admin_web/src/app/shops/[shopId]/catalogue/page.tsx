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
import { PageHeader } from '@/components/ui/page-header';
import { StateMessage } from '@/components/ui/state-message';
import { listShopProducts } from '@/lib/api/shop-catalogue';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { cn } from '@/lib/cn';
import { countLabel } from '@/lib/format';
import { setPackAvailableAction } from './actions';
import {
  CatalogueTabs,
  catalogueBase,
  packPriceText,
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

      <form
        method="get"
        action={base}
        role="search"
        className="flex flex-col gap-3 medium:flex-row medium:items-end"
      >
        <div className="w-full medium:max-w-narrow">
          <Field
            label="Search products"
            name="q"
            type="search"
            maxLength={60}
            defaultValue={q}
            description="By product or brand name."
          />
        </div>
        {status === 'ARCHIVED' ? (
          <input type="hidden" name="status" value="ARCHIVED" />
        ) : null}
        <Button type="submit" variant="secondary" className="shrink-0">
          Search
        </Button>
      </form>

      <nav aria-label="Product status" className="flex gap-4">
        {(['ACTIVE', 'ARCHIVED'] as const).map((value) => (
          <Link
            key={value}
            href={link({ status: value, cursor: undefined })}
            aria-current={status === value ? 'page' : undefined}
            className={cn(
              'text-body font-semibold underline-offset-4',
              status === value
                ? 'text-text-primary underline'
                : 'text-brand-primary hover:underline',
            )}
          >
            {value === 'ACTIVE' ? 'Selling' : 'Archived'}
          </Link>
        ))}
      </nav>

      {page.items.length === 0 ? (
        <StateMessage
          title={
            q
              ? 'No products match your search'
              : status === 'ARCHIVED'
                ? 'No archived products'
                : 'No products yet'
          }
          description={
            q || status === 'ARCHIVED'
              ? undefined
              : 'Add products from the brand catalogue, or add your own. Your shop needs at least 10 products before it can be reviewed.'
          }
          action={
            canEdit && !q && status === 'ACTIVE' ? (
              <ButtonLink href={`${base}/add`}>
                Add from brand catalogue
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {page.items.map((product) => (
            <Card as="li" key={product.id} className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`${base}/products/${product.id}`}
                    className="text-heading3 font-semibold text-brand-primary underline-offset-4 hover:underline"
                  >
                    {product.name}
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
              <ul className="flex flex-col divide-y divide-border-default">
                {product.packs.map((pack) => (
                  <li
                    key={pack.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2"
                  >
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="text-body-large font-semibold">
                        {pack.label}
                      </span>
                      <span className="text-body-large tabular-nums">
                        {packPriceText(pack)}
                      </span>
                      {pack.available ? (
                        <Badge tone="success">Available</Badge>
                      ) : (
                        <Badge tone="warning">Unavailable</Badge>
                      )}
                    </span>
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
                          pack.available ? 'Mark unavailable' : 'Mark available'
                        }
                        pendingLabel="Saving…"
                        accessibleLabel={`Mark ${product.name} ${pack.label} ${
                          pack.available ? 'unavailable' : 'available'
                        }`}
                      />
                    ) : null}
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
