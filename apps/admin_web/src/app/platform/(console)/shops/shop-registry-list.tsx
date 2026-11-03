import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { StateMessage } from '@/components/ui/state-message';
import type { ShopRegistryPage } from '@/lib/api/platform-shops';
import { formatDate } from '@/lib/format';
import { formatIndianMobile } from '@/lib/phone';
import { shopStatusLabel } from '@/lib/shops/labels';

const LINK =
  'font-semibold text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary';

/**
 * Registered shops: a table from the `medium` breakpoint, cards below it.
 * Pagination is link-based (cursor in the URL), so it works without JavaScript.
 */
export function ShopRegistryList({
  page,
  isFirstPage,
}: {
  page: ShopRegistryPage;
  isFirstPage: boolean;
}) {
  if (page.items.length === 0 && isFirstPage) {
    return (
      <StateMessage
        title="No shops have registered yet"
        description="Shops appear here as soon as their owners register on the portal."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3 medium:hidden">
        {page.items.map((shop) => {
          const status = shopStatusLabel(shop.status);
          return (
            <li
              key={shop.id}
              className="flex flex-col gap-2 rounded-large border border-border-default bg-surface-default px-5 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/platform/shops/${shop.id}`}
                  className={`text-title ${LINK}`}
                >
                  {shop.name}
                </Link>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
              <p className="text-body text-text-secondary">
                {ownerText(shop.master)} · Registered{' '}
                {formatDate(shop.createdAt)}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-large border border-border-default bg-surface-default medium:block">
        <table className="w-full text-left text-body">
          <caption className="sr-only">Registered shops, newest first</caption>
          <thead className="border-b border-border-default text-caption tracking-wide text-text-secondary uppercase">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">
                Shop
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Owner
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Mobile
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Registered
              </th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((shop) => {
              const status = shopStatusLabel(shop.status);
              return (
                <tr
                  key={shop.id}
                  className="border-b border-border-default last:border-b-0"
                >
                  <td className="px-5 py-3">
                    <Link href={`/platform/shops/${shop.id}`} className={LINK}>
                      {shop.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {shop.master?.name ?? 'Unknown'}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {shop.master?.phone
                      ? formatIndianMobile(shop.master.phone)
                      : '—'}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {formatDate(shop.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {page.items.length === 0 ? (
        <p className="text-body-large text-text-secondary">No more shops.</p>
      ) : null}

      {!isFirstPage || page.nextCursor ? (
        <nav aria-label="Pagination" className="flex flex-wrap gap-3">
          {!isFirstPage ? (
            <ButtonLink href="/platform/shops" variant="secondary">
              First page
            </ButtonLink>
          ) : null}
          {page.nextCursor ? (
            <ButtonLink
              href={`/platform/shops?cursor=${encodeURIComponent(page.nextCursor)}`}
              variant="secondary"
            >
              Next page
            </ButtonLink>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

function ownerText(
  master: ShopRegistryPage['items'][number]['master'],
): string {
  if (!master) {
    return 'Owner unknown';
  }
  const phone = master.phone ? formatIndianMobile(master.phone) : null;
  return [master.name ?? 'Unnamed owner', phone].filter(Boolean).join(', ');
}
