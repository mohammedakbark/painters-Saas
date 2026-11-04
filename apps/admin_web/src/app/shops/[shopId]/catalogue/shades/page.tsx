import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ShadeSwatch } from '@/components/catalogue/shade-swatch';
import { PageLoading } from '@/components/layout/page-loading';
import {
  ActionButtonForm,
  OwnShadeForm,
} from '@/components/shop-catalogue/shop-catalogue-forms';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { SelectField } from '@/components/ui/select-field';
import { StateMessage } from '@/components/ui/state-message';
import {
  browseBrandShades,
  listCatalogueBrands,
  listFavouriteShades,
  listOwnShades,
} from '@/lib/api/shop-catalogue';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import {
  createOwnShadeAction,
  removeOwnShadeAction,
  setFavouriteShadeAction,
} from '../actions';
import { CatalogueTabs, catalogueBase } from '../catalogue-parts';

export const metadata: Metadata = { title: 'Shades · Catalogue' };

export default function ShadesPage(
  props: PageProps<'/shops/[shopId]/catalogue/shades'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading your shades…" />}>
      <Shades {...props} />
    </Suspense>
  );
}

const text = (value: string | string[] | undefined) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const card =
  'flex flex-col gap-4 rounded-large border border-border-default bg-surface-default p-6';

async function Shades({
  params,
  searchParams,
}: PageProps<'/shops/[shopId]/catalogue/shades'>) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  const search = await searchParams;
  const canEdit = shop.myRole === 'MASTER';
  const [brands, favourites, own] = await Promise.all([
    listCatalogueBrands(token),
    listFavouriteShades(token, shopId),
    listOwnShades(token, shopId),
  ]);
  const requested = text(search.brandId);
  const brand = brands.find((b) => b.id === requested) ?? brands.at(0);
  const q = text(search.q)?.slice(0, 60);
  const results = brand
    ? await browseBrandShades(token, shopId, { brandId: brand.id, q })
    : null;
  const base = `${catalogueBase(shopId)}/shades`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catalogue"
        description="Mark the brand shades you use most, and add shade codes of your own."
      />
      <CatalogueTabs shopId={shopId} />
      <p className="text-body text-text-secondary">
        Colours on screen are indicative only. Customers and staff should always
        go by the shade code and the printed shade card.
      </p>

      <section aria-labelledby="favourites-heading" className={card}>
        <h2 id="favourites-heading" className="text-heading3 font-semibold">
          Favourite shades ({favourites.items.length}
          {favourites.nextCursor ? '+' : ''})
        </h2>
        {favourites.items.length === 0 ? (
          <p className="text-body text-text-secondary">
            No favourites yet. Find a brand&apos;s shades below and add the ones
            you use most.
          </p>
        ) : (
          <ul className="grid gap-3 medium:grid-cols-2">
            {favourites.items.map((favourite) => (
              <li
                key={favourite.shade.id}
                className="flex items-center justify-between gap-3 rounded-medium border border-border-default p-3"
              >
                <div className="flex flex-col gap-1">
                  <ShadeSwatch shade={favourite.shade} />
                  <span className="text-caption text-text-secondary">
                    {favourite.brand.name}
                  </span>
                </div>
                {canEdit ? (
                  <ActionButtonForm
                    action={setFavouriteShadeAction.bind(
                      null,
                      shopId,
                      favourite.shade.id,
                      false,
                    )}
                    label="Remove"
                    pendingLabel="Removing…"
                    accessibleLabel={`Remove ${favourite.shade.code} from favourites`}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="brand-shades-heading" className={card}>
        <h2 id="brand-shades-heading" className="text-heading3 font-semibold">
          Brand shades
        </h2>
        {brand && results ? (
          <>
            <form
              method="get"
              action={base}
              role="search"
              className="flex flex-col gap-3 medium:flex-row medium:items-end"
            >
              <div className="w-full medium:max-w-form">
                <SelectField
                  label="Brand"
                  name="brandId"
                  options={brands.map((b) => ({ value: b.id, label: b.name }))}
                  defaultValue={brand.id}
                />
              </div>
              <div className="w-full medium:max-w-form">
                <Field
                  label="Code or name (optional)"
                  name="q"
                  type="search"
                  maxLength={60}
                  defaultValue={q}
                />
              </div>
              <Button type="submit" variant="secondary" className="shrink-0">
                Find shades
              </Button>
            </form>
            {results.items.length === 0 ? (
              <p className="text-body text-text-secondary">
                No {brand.name} shades match.
              </p>
            ) : (
              <ul className="grid gap-3 medium:grid-cols-2">
                {results.items.map(({ shade, favourite }) => (
                  <li
                    key={shade.id}
                    className="flex items-center justify-between gap-3 rounded-medium border border-border-default p-3"
                  >
                    <ShadeSwatch shade={shade} />
                    {canEdit ? (
                      <ActionButtonForm
                        action={setFavouriteShadeAction.bind(
                          null,
                          shopId,
                          shade.id,
                          !favourite,
                        )}
                        label={
                          favourite ? 'Remove favourite' : 'Add to favourites'
                        }
                        pendingLabel="Saving…"
                        accessibleLabel={
                          favourite
                            ? `Remove ${shade.code} from favourites`
                            : `Add ${shade.code} to favourites`
                        }
                      />
                    ) : favourite ? (
                      <span className="text-body text-text-secondary">
                        Favourite
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {results.nextCursor ? (
              <p className="text-body text-text-secondary">
                Showing the first {results.items.length} shades. Search by code
                or name to find others.
              </p>
            ) : null}
          </>
        ) : (
          <StateMessage
            title="The brand catalogue is empty"
            description="The platform team has not added brands yet."
          />
        )}
      </section>

      <section aria-labelledby="own-shades-heading" className={card}>
        <h2 id="own-shades-heading" className="text-heading3 font-semibold">
          Your own shades
        </h2>
        <p className="text-body text-text-secondary">
          Codes you mix or use in the shop that are not on a brand shade card.
        </p>
        {canEdit ? (
          <OwnShadeForm
            action={createOwnShadeAction.bind(null, shopId)}
            brands={brands}
          />
        ) : null}
        {own.items.length === 0 ? (
          <p className="text-body text-text-secondary">
            No shades of your own yet.
          </p>
        ) : (
          <ul className="grid gap-3 medium:grid-cols-2">
            {own.items.map((shade) => (
              <li
                key={shade.id}
                className="flex items-center justify-between gap-3 rounded-medium border border-border-default p-3"
              >
                <div className="flex flex-col gap-1">
                  <ShadeSwatch shade={shade} />
                  {shade.brand ? (
                    <span className="text-caption text-text-secondary">
                      {shade.brand.name}
                    </span>
                  ) : null}
                </div>
                {canEdit ? (
                  <ActionButtonForm
                    action={removeOwnShadeAction.bind(null, shopId, shade.id)}
                    label="Remove"
                    pendingLabel="Removing…"
                    accessibleLabel={`Remove shade ${shade.code}`}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
