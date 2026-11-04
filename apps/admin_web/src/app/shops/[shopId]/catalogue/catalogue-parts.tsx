import Link from 'next/link';
import { NavLinks } from '@/components/layout/nav-links';
import { Badge } from '@/components/ui/badge';
import type { ShopPack, ShopProduct } from '@/lib/api/shop-catalogue';
import { formatRupees } from '@/lib/money';

/** Shared pieces of the shop catalogue pages (CAT-002). */

export const catalogueBase = (shopId: string) =>
  `/shops/${encodeURIComponent(shopId)}/catalogue`;

/** Products / Shades tabs. */
export function CatalogueTabs({ shopId }: { shopId: string }) {
  const base = catalogueBase(shopId);
  return (
    <NavLinks
      label="Catalogue sections"
      orientation="horizontal"
      items={[
        { href: base, label: 'Products', exact: true },
        { href: `${base}/shades`, label: 'Shades' },
      ]}
    />
  );
}

export function BackToProducts({ shopId }: { shopId: string }) {
  return (
    <Link
      href={catalogueBase(shopId)}
      className="text-body font-semibold text-brand-primary underline underline-offset-4"
    >
      All products
    </Link>
  );
}

/** Archived / removed-from-catalogue badges of a product. */
export function ProductBadges({ product }: { product: ShopProduct }) {
  return (
    <>
      {product.status === 'ARCHIVED' ? <Badge>Archived</Badge> : null}
      {product.catalogueActive ? null : (
        <Badge tone="warning">Removed from brand catalogue</Badge>
      )}
      {product.source === 'own' ? <Badge tone="info">Own product</Badge> : null}
    </>
  );
}

/** "₹1,450 (MRP ₹1,500)". */
export function packPriceText(pack: ShopPack): string {
  return pack.mrpPaise === null
    ? formatRupees(pack.pricePaise)
    : `${formatRupees(pack.pricePaise)} (MRP ${formatRupees(pack.mrpPaise)})`;
}

/** "Brand · Category" line of a product. */
export function productSubtitle(product: ShopProduct): string {
  return [product.brand?.name, product.category.name]
    .filter(Boolean)
    .join(' · ');
}
