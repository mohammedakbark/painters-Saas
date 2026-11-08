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

export { ShadeSwatch } from '@/components/catalogue/shade-swatch';
export { orNotFound } from '@/lib/api/or-not-found';
