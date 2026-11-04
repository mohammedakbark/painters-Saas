import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  ActiveToggleForm,
  ShadeCreateForm,
} from '@/components/catalogue/shade-forms';
import { PageLoading } from '@/components/layout/page-loading';
import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';
import { getBrand, listShades } from '@/lib/api/platform-catalogue';
import { requirePlatformAdmin } from '@/lib/auth/platform-access';
import { createShadeAction, setShadeActiveAction } from '../../../actions';
import { ActiveBadge, orNotFound, ShadeSwatch } from '../../../catalogue-parts';
import { BrandHeader } from '../brand-header';

export const metadata: Metadata = { title: 'Shades · Catalogue' };

/** A brand's shade card (CAT-001). */
export default function BrandShadesPage(
  props: PageProps<'/platform/catalogue/brands/[brandId]/shades'>,
) {
  return (
    <Suspense fallback={<PageLoading label="Loading shades…" />}>
      <BrandShades {...props} />
    </Suspense>
  );
}

async function BrandShades({
  params,
  searchParams,
}: PageProps<'/platform/catalogue/brands/[brandId]/shades'>) {
  const { token } = await requirePlatformAdmin();
  const { brandId } = await params;
  const query = await searchParams;
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  const cursor = typeof query.cursor === 'string' ? query.cursor : undefined;
  const brand = await orNotFound(getBrand(token, brandId));
  const page = await listShades(token, brandId, { q: q || undefined, cursor });

  return (
    <div className="flex flex-col gap-6">
      <BrandHeader brand={brand} />
      <section className="rounded-large border border-border-default bg-surface-default p-6">
        <ShadeCreateForm action={createShadeAction.bind(null, brand.id)} />
      </section>

      <form
        method="get"
        role="search"
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="shade-search" className="text-body font-medium">
            Search by code or name
          </label>
          <input
            id="shade-search"
            name="q"
            defaultValue={q}
            maxLength={60}
            className="min-h-12 rounded-medium border border-border-strong bg-surface-default px-4 text-body-large focus-visible:outline-2 focus-visible:outline-brand-primary"
          />
        </div>
        <button
          type="submit"
          className="min-h-12 rounded-medium border border-border-strong bg-surface-default px-5 text-body-large font-semibold hover:bg-surface-subtle"
        >
          Search
        </button>
      </form>

      <p className="text-caption text-text-secondary">
        Colours on screen are indicative only. Customers and shops should always
        go by the shade code and the printed shade card.
      </p>

      {page.items.length === 0 ? (
        <StateMessage
          title={q ? 'No shades match' : 'No shades yet'}
          description={
            q
              ? `Nothing matches "${q}".`
              : 'Add shades above or import the shade card as CSV.'
          }
        />
      ) : (
        <ul className="grid gap-3 medium:grid-cols-2 desktop:grid-cols-3">
          {page.items.map((shade) => (
            <li
              key={shade.id}
              className="flex items-center justify-between gap-3 rounded-large border border-border-default bg-surface-default p-4"
            >
              <div className="flex flex-col gap-2">
                <ShadeSwatch shade={shade} />
                <ActiveBadge active={shade.active} />
              </div>
              <ActiveToggleForm
                action={setShadeActiveAction.bind(
                  null,
                  shade.id,
                  !shade.active,
                )}
                active={shade.active}
                label={`shade ${shade.code} ${shade.name}`}
              />
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor ? (
        <div>
          <ButtonLink
            variant="secondary"
            href={`/platform/catalogue/brands/${brand.id}/shades?${new URLSearchParams(
              {
                ...(q ? { q } : {}),
                cursor: page.nextCursor,
              },
            )}`}
          >
            Next shades
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
