import type { PackUnit } from '../generated/prisma/enums.js';
import type {
  ShopPackRowPage,
  ShopPackRowQuery,
  ShopProductResponse,
} from './shop-catalogue.schemas.js';

/**
 * The catalogue table (CAT-003): one row per pack, filtered, sorted and paged.
 *
 * Done in memory over one shop's products: a shop lists hundreds of packs,
 * and the brand, category and size come from either the shop's own fields or
 * the brand catalogue, which this mapping has already resolved. Revisit with
 * a database query if a shop passes about 5,000 packs.
 */

type Tab = ShopPackRowQuery['tab'];
type Row = ShopPackRowPage['items'][number];

const TAB_OF: Record<PackUnit, Exclude<Tab, 'ALL'>> = {
  LITRE: 'VOLUME',
  MILLILITRE: 'VOLUME',
  KILOGRAM: 'WEIGHT',
  GRAM: 'WEIGHT',
  PIECE: 'PIECE',
};

/** Millilitres, grams or pieces, so sizes sort naturally (500 ml < 1 L). */
function baseQuantity(quantity: number, unit: PackUnit): number {
  return unit === 'LITRE' || unit === 'KILOGRAM' ? quantity * 1000 : quantity;
}

export const sizeKey = (quantity: number, unit: PackUnit) =>
  `${quantity}:${unit}`;

/** A brand's filter key: the catalogue brand id, or its typed name. */
export const brandKey = (brand: ShopProductResponse['brand']) =>
  brand ? (brand.id ?? `name:${brand.name.trim().toLowerCase()}`) : null;

const byText = (a: string, b: string) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' });

export function packRows(
  products: readonly ShopProductResponse[],
  query: ShopPackRowQuery,
): ShopPackRowPage {
  const all = products.flatMap((product) =>
    product.packs.map((pack) => ({
      row: {
        packId: pack.id,
        productId: product.id,
        productName: product.name,
        source: product.source,
        productStatus: product.status,
        catalogueActive: product.catalogueActive,
        brandName: product.brand?.name ?? null,
        categoryName: product.category.name,
        sizeLabel: pack.label,
        quantity: pack.quantity,
        unit: pack.unit,
        pricePaise: pack.pricePaise,
        mrpPaise: pack.mrpPaise,
        available: pack.available,
      } satisfies Row,
      tab: TAB_OF[pack.unit],
      brand: brandKey(product.brand),
      categoryId: product.category.id,
      size: sizeKey(pack.quantity, pack.unit),
      base: baseQuantity(pack.quantity, pack.unit),
    })),
  );

  const tabCounts = { ALL: all.length, VOLUME: 0, WEIGHT: 0, PIECE: 0 };
  for (const entry of all) {
    tabCounts[entry.tab] += 1;
  }

  const inTab =
    query.tab === 'ALL' ? all : all.filter((entry) => entry.tab === query.tab);

  // Dropdown options: what exists in this tab, regardless of other filters.
  const brands = new Map<string, string>();
  const categories = new Map<string, string>();
  const sizes = new Map<string, { label: string; tab: string; base: number }>();
  for (const entry of inTab) {
    if (entry.brand && entry.row.brandName) {
      brands.set(entry.brand, entry.row.brandName);
    }
    categories.set(entry.categoryId, entry.row.categoryName);
    sizes.set(entry.size, {
      label: entry.row.sizeLabel,
      tab: entry.tab,
      base: entry.base,
    });
  }

  const q = query.q?.toLowerCase();
  const filtered = inTab.filter(
    (entry) =>
      (!q ||
        entry.row.productName.toLowerCase().includes(q) ||
        (entry.row.brandName?.toLowerCase().includes(q) ?? false)) &&
      (!query.brand || entry.brand === query.brand) &&
      (!query.categoryId || entry.categoryId === query.categoryId) &&
      (!query.size || entry.size === query.size) &&
      (!query.available ||
        entry.row.available === (query.available === 'true')),
  );

  const descending = query.sort.startsWith('-');
  const byPrice = query.sort.endsWith('price');
  filtered.sort((a, b) => {
    const primary = byPrice
      ? a.row.pricePaise - b.row.pricePaise
      : byText(a.row.productName, b.row.productName);
    const result =
      primary ||
      byText(a.tab, b.tab) ||
      a.base - b.base ||
      byText(a.row.packId, b.row.packId);
    return descending ? -result : result;
  });

  const start = (query.page - 1) * query.pageSize;
  return {
    items: filtered
      .slice(start, start + query.pageSize)
      .map((entry) => entry.row),
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
        .sort(([, a], [, b]) => byText(a.tab, b.tab) || a.base - b.base)
        .map(([value, size]) => ({ value, label: size.label })),
    },
  };
}
