import { Badge } from '@/components/ui/badge';
import type { ShopProduct } from '@/lib/api/shop-catalogue';

/** Shared pieces of the shop catalogue pages (CAT-002). */

export const catalogueBase = (shopId: string) =>
  `/shops/${encodeURIComponent(shopId)}/catalogue`;

/** Back link of the catalogue sub-pages, for PageHeader `back`. */
export const backToProducts = (shopId: string) => ({
  href: catalogueBase(shopId),
  label: 'All products',
});

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

/** "Brand · Category" line of a product. */
export function productSubtitle(product: ShopProduct): string {
  return [product.brand?.name, product.category.name]
    .filter(Boolean)
    .join(' · ');
}
