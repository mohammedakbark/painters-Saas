import type { PackUnit } from '../generated/prisma/enums.js';
import type {
  ShopProductResponse,
  ShopProductRowPage,
  ShopProductRowQuery,
} from './shop-catalogue.schemas.js';

/**
 * The product list (CAT-006): one row per product with its pack sizes as
 * chips, filtered, sorted and paged in memory over one shop's products (the
 * brand, category and size come from either the shop's own fields or the
 * brand catalogue, which the mapping has already resolved). Revisit with a
 * database query if a shop passes about 2,000 products.
 */

type Tab = ShopProductRowQuery['tab'];

const TAB_OF: Record<PackUnit, Exclude<Tab, 'ALL'>> = {
  LITRE: 'VOLUME',
  MILLILITRE: 'VOLUME',
  KILOGRAM: 'WEIGHT',
  GRAM: 'WEIGHT',
  PIECE: 'PIECE',
};

/** Millilitres, grams or pieces, so sizes sort naturally (500 ml < 1 L). */
const baseQuantity = (quantity: number, unit: PackUnit) =>
  unit === 'LITRE' || unit === 'KILOGRAM' ? quantity * 1000 : quantity;

export const sizeKey = (quantity: number, unit: PackUnit) =>
  `${quantity}:${unit}`;

/** A brand's filter key: the catalogue brand id, or its typed name. */
export const brandKey = (brand: ShopProductResponse['brand']) =>
  brand ? (brand.id ?? `name:${brand.name.trim().toLowerCase()}`) : null;

const byText = (a: string, b: string) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' });

export function productRows(
  products: readonly ShopProductResponse[],
  query: ShopProductRowQuery,
): ShopProductRowPage {
  const tabsOf = (product: ShopProductResponse) =>
    new Set(product.packs.map((pack) => TAB_OF[pack.unit]));

  const tabCounts = { ALL: products.length, VOLUME: 0, WEIGHT: 0, PIECE: 0 };
  for (const product of products) {
    for (const tab of tabsOf(product)) {
      tabCounts[tab] += 1;
    }
  }

  // Each product with only its packs in this tab, smallest first.
  const inTab = products
    .map((product) => ({
      product,
      packs: product.packs
        .filter(
          (pack) => query.tab === 'ALL' || TAB_OF[pack.unit] === query.tab,
        )
        .sort(
          (a, b) =>
            byText(TAB_OF[a.unit], TAB_OF[b.unit]) ||
            baseQuantity(a.quantity, a.unit) - baseQuantity(b.quantity, b.unit),
        ),
    }))
    .filter((entry) => entry.packs.length > 0);

  // Dropdown options: what exists in this tab, regardless of other filters.
  const brands = new Map<string, string>();
  const categories = new Map<string, string>();
  const sizes = new Map<string, { label: string; order: [string, number] }>();
  for (const { product, packs } of inTab) {
    const key = brandKey(product.brand);
    if (key && product.brand) {
      brands.set(key, product.brand.name);
    }
    categories.set(product.category.id, product.category.name);
    for (const pack of packs) {
      sizes.set(sizeKey(pack.quantity, pack.unit), {
        label: pack.label,
        order: [TAB_OF[pack.unit], baseQuantity(pack.quantity, pack.unit)],
      });
    }
  }

  const q = query.q?.toLowerCase();
  const filtered = inTab.filter(({ product, packs }) => {
    const available = packs.filter((pack) => pack.available).length;
    return (
      (!q ||
        product.name.toLowerCase().includes(q) ||
        (product.brand?.name.toLowerCase().includes(q) ?? false)) &&
      (!query.brand || brandKey(product.brand) === query.brand) &&
      (!query.categoryId || product.category.id === query.categoryId) &&
      (!query.size ||
        packs.some(
          (pack) => sizeKey(pack.quantity, pack.unit) === query.size,
        )) &&
      (query.show === 'all' ||
        (query.show === 'available' && available === packs.length) ||
        (query.show === 'partly' &&
          available > 0 &&
          available < packs.length) ||
        (query.show === 'none' && available === 0))
    );
  });

  const minPrice = (packs: readonly { pricePaise: number }[]) =>
    Math.min(...packs.map((pack) => pack.pricePaise));
  filtered.sort((a, b) => {
    const byName = byText(a.product.name, b.product.name);
    if (query.sort === 'name') {
      return byName;
    }
    const byPrice = minPrice(a.packs) - minPrice(b.packs);
    return (query.sort === 'price' ? byPrice : -byPrice) || byName;
  });

  const start = (query.page - 1) * query.pageSize;
  return {
    items: filtered
      .slice(start, start + query.pageSize)
      .map(({ product, packs }) => ({
        productId: product.id,
        name: product.name,
        source: product.source,
        productStatus: product.status,
        catalogueActive: product.catalogueActive,
        brandName: product.brand?.name ?? null,
        categoryName: product.category.name,
        thumbUrl: product.image?.thumbUrl ?? null,
        packs: packs.map((pack) => ({
          id: pack.id,
          label: pack.label,
          pricePaise: pack.pricePaise,
          mrpPaise: pack.mrpPaise,
          available: pack.available,
        })),
        availableCount: packs.filter((pack) => pack.available).length,
        packCount: packs.length,
        minPricePaise: minPrice(packs),
      })),
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
    tabCounts,
    options: {
      brands: [...brands]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => byText(a.label, b.label)),
      categories: [...categories]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => byText(a.label, b.label)),
      sizes: [...sizes]
        .sort(
          ([, a], [, b]) =>
            byText(a.order[0], b.order[0]) || a.order[1] - b.order[1],
        )
        .map(([value, size]) => ({ value, label: size.label })),
    },
  };
}
