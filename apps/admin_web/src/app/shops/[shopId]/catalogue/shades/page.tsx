import type { Metadata } from 'next';
import { cache, Suspense } from 'react';
import { ShadeSwatch } from '@/components/catalogue/shade-swatch';
import {
  ActionButtonForm,
  OwnShadeForm,
} from '@/components/shop-catalogue/shop-catalogue-forms';
import { cardClasses, Panel } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { SectionLoading } from '@/components/ui/section-loading';
import { SelectField } from '@/components/ui/select-field';
import { StateMessage } from '@/components/ui/state-message';
import { UrlForm, UrlFormSubmit } from '@/components/ui/url-form';
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
import { catalogueBase } from '../catalogue-parts';

export const metadata: Metadata = { title: 'Shades' };

type Props = PageProps<'/shops/[shopId]/catalogue/shades'>;

const text = (value: string | string[] | undefined) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const card = cardClasses('flex flex-col gap-4 p-6');

/** The brand list, fetched once per request for both sections that use it. */
const loadBrands = cache(async () =>
  listCatalogueBrands(await requireShopSession()),
);

/**
 * The page title, intro and section headings render at once (static shell,
 * PERF-001); each section loads its own data behind its own Suspense, so a
 * new search reloads only the brand shades and an action refreshes the
 * lists without a page-wide skeleton.
 */
export default function ShadesPage({ params, searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shades"
        description="Mark the brand shades you use most, and add shade codes of your own."
      />
      <p className="text-body text-text-secondary">
        Colours on screen are indicative only. Customers and staff should always
        go by the shade code and the printed shade card.
      </p>

      <section aria-labelledby="favourites-heading" className={card}>
        <h2 id="favourites-heading" className="text-heading3 font-semibold">
          Favourite shades
        </h2>
        <Suspense fallback={<SectionLoading label="Loading favourites…" />}>
          <Favourites params={params} />
        </Suspense>
      </section>

      <section aria-labelledby="brand-shades-heading" className={card}>
        <h2 id="brand-shades-heading" className="text-heading3 font-semibold">
          Brand shades
        </h2>
        <Suspense fallback={<SectionLoading label="Loading brand shades…" />}>
          <BrandShades params={params} searchParams={searchParams} />
        </Suspense>
      </section>

      <section aria-labelledby="own-shades-heading" className={card}>
        <h2 id="own-shades-heading" className="text-heading3 font-semibold">
          Your own shades
        </h2>
        <p className="text-body text-text-secondary">
          Codes you mix or use in the shop that are not on a brand shade card.
        </p>
        <Suspense fallback={<SectionLoading label="Loading your shades…" />}>
          <OwnShades params={params} />
        </Suspense>
      </section>
    </div>
  );
}

async function Favourites({ params }: Pick<Props, 'params'>) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const favourites = await listFavouriteShades(
    await requireShopSession(),
    shopId,
  );
  const canEdit = shop.myRole === 'MASTER';

  if (favourites.items.length === 0) {
    return (
      <p className="text-body text-text-secondary">
        No favourites yet. Find a brand&apos;s shades below and add the ones you
        use most.
      </p>
    );
  }
  return (
    <>
      <p className="text-body text-text-secondary">
        {favourites.items.length}
        {favourites.nextCursor ? '+' : ''}{' '}
        {favourites.items.length === 1 ? 'favourite' : 'favourites'}
      </p>
      <ul className="grid gap-3 medium:grid-cols-2">
        {favourites.items.map((favourite) => (
          <Panel
            as="li"
            key={favourite.shade.id}
            className="flex items-center justify-between gap-3 p-3"
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
          </Panel>
        ))}
      </ul>
    </>
  );
}

async function BrandShades({ params, searchParams }: Props) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const search = await searchParams;
  const brands = await loadBrands();
  const requested = text(search.brandId);
  const brand = brands.find((b) => b.id === requested) ?? brands.at(0);
  if (!brand) {
    return (
      <StateMessage
        title="The brand catalogue is empty"
        description="The platform team has not added brands yet."
      />
    );
  }
  const q = text(search.q)?.slice(0, 60);
  const results = await browseBrandShades(await requireShopSession(), shopId, {
    brandId: brand.id,
    q,
  });
  const canEdit = shop.myRole === 'MASTER';

  return (
    <>
      <UrlForm
        action={`${catalogueBase(shopId)}/shades`}
        role="search"
        className="flex flex-col gap-3 medium:flex-row medium:items-end"
      >
        <div className="w-full medium:max-w-form">
          <SelectField
            key={brand.id}
            label="Brand"
            name="brandId"
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
            defaultValue={brand.id}
          />
        </div>
        <div className="w-full medium:max-w-form">
          <Field
            key={q ?? ''}
            label="Code or name (optional)"
            name="q"
            type="search"
            maxLength={60}
            defaultValue={q}
          />
        </div>
        <UrlFormSubmit
          variant="secondary"
          className="shrink-0"
          pendingLabel="Finding…"
        >
          Find shades
        </UrlFormSubmit>
      </UrlForm>
      {results.items.length === 0 ? (
        <p className="text-body text-text-secondary">
          No {brand.name} shades match.
        </p>
      ) : (
        <ul className="grid gap-3 medium:grid-cols-2">
          {results.items.map(({ shade, favourite }) => (
            <Panel
              as="li"
              key={shade.id}
              className="flex items-center justify-between gap-3 p-3"
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
                  label={favourite ? 'Remove favourite' : 'Add to favourites'}
                  pendingLabel="Saving…"
                  accessibleLabel={
                    favourite
                      ? `Remove ${shade.code} from favourites`
                      : `Add ${shade.code} to favourites`
                  }
                />
              ) : favourite ? (
                <span className="text-body text-text-secondary">Favourite</span>
              ) : null}
            </Panel>
          ))}
        </ul>
      )}
      {results.nextCursor ? (
        <p className="text-body text-text-secondary">
          Showing the first {results.items.length} shades. Search by code or
          name to find others.
        </p>
      ) : null}
    </>
  );
}

async function OwnShades({ params }: Pick<Props, 'params'>) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const [brands, own] = await Promise.all([
    loadBrands(),
    listOwnShades(await requireShopSession(), shopId),
  ]);
  const canEdit = shop.myRole === 'MASTER';

  return (
    <>
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
            <Panel
              as="li"
              key={shade.id}
              className="flex items-center justify-between gap-3 p-3"
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
            </Panel>
          ))}
        </ul>
      )}
    </>
  );
}
