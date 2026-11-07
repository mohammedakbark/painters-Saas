import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { NavLinks } from '@/components/layout/nav-links';
import { Badge } from '@/components/ui/badge';

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
      orientation="tabs"
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
      className="group inline-flex min-h-11 w-fit items-center gap-2 rounded-nav-item text-body font-semibold text-brand-primary hover:text-brand-primary-strong focus-visible:outline-2 focus-visible:outline-brand-primary"
    >
      <Icon
        name="arrowLeft"
        className="size-4 transition-transform group-hover:-translate-x-0.5"
      />
      All brands
    </Link>
  );
}

export { ShadeSwatch } from '@/components/catalogue/shade-swatch';
export { orNotFound } from '@/lib/api/or-not-found';
