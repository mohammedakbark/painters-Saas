import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NavLinks } from '@/components/layout/nav-links';
import { Badge } from '@/components/ui/badge';
import { ApiError } from '@/lib/api/problem';
import type { Shade } from '@/lib/api/platform-catalogue';

/** Shared pieces of the platform catalogue pages (CAT-001). */

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="success">Active</Badge>
  ) : (
    <Badge>Archived</Badge>
  );
}

/** Products / Shades / Import tabs of one brand. */
export function BrandTabs({ brandId }: { brandId: string }) {
  const base = `/platform/catalogue/brands/${brandId}`;
  return (
    <NavLinks
      label="Brand sections"
      orientation="horizontal"
      items={[
        { href: base, label: 'Products', exact: true },
        { href: `${base}/shades`, label: 'Shades' },
        { href: `${base}/import`, label: 'Import CSV' },
      ]}
    />
  );
}

export function BackToCatalogue() {
  return (
    <Link
      href="/platform/catalogue"
      className="text-body font-semibold text-brand-primary underline underline-offset-4"
    >
      All brands
    </Link>
  );
}

/**
 * A shade's indicative colour next to its code and name. The swatch is only a
 * hint: paint colours look different on screens (DESIGN_SYSTEM §9), so the
 * code and name are always shown as text.
 */
export function ShadeSwatch({
  shade,
}: {
  shade: Pick<Shade, 'code' | 'name' | 'previewHex'>;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="size-8 shrink-0 rounded-small border border-border-strong"
        // Catalogue data, not a design token (DESIGN_SYSTEM §2).
        style={
          shade.previewHex ? { backgroundColor: shade.previewHex } : undefined
        }
      />
      <span className="flex flex-col">
        <span className="text-body font-semibold text-text-primary">
          {shade.code}
        </span>
        <span className="text-body text-text-secondary">{shade.name}</span>
      </span>
    </div>
  );
}

/** 404 from the API → the not-found page; anything else is rethrown. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
