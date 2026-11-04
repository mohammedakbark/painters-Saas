// The shop catalogue (CAT-002) as the Shop App reads it. Mirrors
// `ShopProductSchema` in apps/api/src/shop-catalogue/shop-catalogue.schemas.ts
// and the brand catalogue read API (apps/api/src/catalogue/catalogue.schemas.ts).
// Money is integer paise.

/// Pack-size units, with the label shown next to the quantity.
enum PackUnit {
  litre('LITRE', 'L'),
  millilitre('MILLILITRE', 'ml'),
  kilogram('KILOGRAM', 'kg'),
  gram('GRAM', 'g'),
  piece('PIECE', 'pc');

  const PackUnit(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static PackUnit fromApi(String value) =>
      PackUnit.values.firstWhere((unit) => unit.apiValue == value);
}

/// The API's largest pack quantity.
const double maxPackQuantity = 1000000;

/// The API's largest number of pack sizes per product.
const int maxPacksPerProduct = 12;

/// Pre-sized WebP images from public storage.
class ProductImage {
  const ProductImage({required this.url, required this.thumbUrl});

  factory ProductImage.fromJson(Map<String, Object?> json) => ProductImage(
    url: json['url']! as String,
    thumbUrl: json['thumbUrl']! as String,
  );

  static ProductImage? maybe(Object? json) =>
      json is Map<String, Object?> ? ProductImage.fromJson(json) : null;

  final String url;
  final String thumbUrl;
}

/// A pack size in the brand catalogue (no price; shops set their own).
class CataloguePack {
  const CataloguePack({
    required this.id,
    required this.quantity,
    required this.unit,
    required this.label,
  });

  factory CataloguePack.fromJson(Map<String, Object?> json) => CataloguePack(
    id: json['id']! as String,
    quantity: (json['quantity']! as num).toDouble(),
    unit: PackUnit.fromApi(json['unit']! as String),
    label: json['label']! as String,
  );

  final String id;
  final double quantity;
  final PackUnit unit;

  /// For example "4 L".
  final String label;
}

/// A pack size the shop sells, with its price and availability (D-029).
class ShopPack {
  const ShopPack({
    required this.id,
    required this.cataloguePackId,
    required this.quantity,
    required this.unit,
    required this.label,
    required this.mrpPaise,
    required this.pricePaise,
    required this.available,
  });

  factory ShopPack.fromJson(Map<String, Object?> json) => ShopPack(
    id: json['id']! as String,
    cataloguePackId: json['cataloguePackId'] as String?,
    quantity: (json['quantity']! as num).toDouble(),
    unit: PackUnit.fromApi(json['unit']! as String),
    label: json['label']! as String,
    mrpPaise: (json['mrpPaise'] as num?)?.toInt(),
    pricePaise: (json['pricePaise']! as num).toInt(),
    available: json['available']! as bool,
  );

  final String id;
  final String? cataloguePackId;
  final double quantity;
  final PackUnit unit;
  final String label;
  final int? mrpPaise;
  final int pricePaise;
  final bool available;
}

/// Where a shop product comes from.
enum ProductSource { catalogue, own }

/// One product the shop sells.
class ShopProduct {
  const ShopProduct({
    required this.id,
    required this.source,
    required this.catalogueProductId,
    required this.name,
    required this.brandName,
    required this.categoryName,
    required this.description,
    required this.archived,
    required this.catalogueActive,
    required this.image,
    required this.imageFromCatalogue,
    required this.packs,
    required this.unlistedCataloguePacks,
  });

  factory ShopProduct.fromJson(Map<String, Object?> json) {
    final brand = json['brand'];
    final category = json['category']! as Map<String, Object?>;
    return ShopProduct(
      id: json['id']! as String,
      source: json['source'] == 'own'
          ? ProductSource.own
          : ProductSource.catalogue,
      catalogueProductId: json['catalogueProductId'] as String?,
      name: json['name']! as String,
      brandName: brand is Map<String, Object?>
          ? brand['name'] as String?
          : null,
      categoryName: category['name']! as String,
      description: json['description'] as String?,
      archived: json['status'] == 'ARCHIVED',
      catalogueActive: json['catalogueActive'] as bool? ?? true,
      image: ProductImage.maybe(json['image']),
      imageFromCatalogue: json['imageSource'] == 'catalogue',
      packs: [
        for (final pack in json['packs']! as List<Object?>)
          ShopPack.fromJson(pack! as Map<String, Object?>),
      ],
      unlistedCataloguePacks: [
        for (final pack in json['unlistedCataloguePacks']! as List<Object?>)
          CataloguePack.fromJson(pack! as Map<String, Object?>),
      ],
    );
  }

  final String id;
  final ProductSource source;
  final String? catalogueProductId;
  final String name;

  /// Null for an own product without a brand.
  final String? brandName;
  final String categoryName;
  final String? description;
  final bool archived;

  /// False when the platform archived the catalogue product, brand or category.
  final bool catalogueActive;
  final ProductImage? image;

  /// The photo is the brand catalogue's, not the shop's own.
  final bool imageFromCatalogue;
  final List<ShopPack> packs;

  /// Brand catalogue pack sizes the shop does not sell yet.
  final List<CataloguePack> unlistedCataloguePacks;
}

/// An active brand in the platform's brand catalogue.
class CatalogueBrand {
  const CatalogueBrand({
    required this.id,
    required this.name,
    required this.productCount,
  });

  factory CatalogueBrand.fromJson(Map<String, Object?> json) => CatalogueBrand(
    id: json['id']! as String,
    name: json['name']! as String,
    productCount: (json['productCount'] as num?)?.toInt() ?? 0,
  );

  final String id;
  final String name;
  final int productCount;
}

/// A brand catalogue product.
class CatalogueProduct {
  const CatalogueProduct({
    required this.id,
    required this.name,
    required this.brandName,
    required this.categoryName,
    required this.description,
    required this.image,
    required this.packs,
  });

  factory CatalogueProduct.fromJson(Map<String, Object?> json) =>
      CatalogueProduct(
        id: json['id']! as String,
        name: json['name']! as String,
        brandName: (json['brand']! as Map<String, Object?>)['name']! as String,
        categoryName:
            (json['category']! as Map<String, Object?>)['name']! as String,
        description: json['description'] as String?,
        image: ProductImage.maybe(json['image']),
        packs: [
          for (final pack in json['packs']! as List<Object?>)
            CataloguePack.fromJson(pack! as Map<String, Object?>),
        ],
      );

  final String id;
  final String name;
  final String brandName;
  final String categoryName;
  final String? description;
  final ProductImage? image;
  final List<CataloguePack> packs;
}

/// A brand catalogue product, with the shop's listing of it if any.
class BrandProductItem {
  const BrandProductItem({
    required this.product,
    required this.listedProductId,
  });

  factory BrandProductItem.fromJson(Map<String, Object?> json) =>
      BrandProductItem(
        product: CatalogueProduct.fromJson(
          json['product']! as Map<String, Object?>,
        ),
        listedProductId: json['listedProductId'] as String?,
      );

  final CatalogueProduct product;
  final String? listedProductId;
}

/// One page of a cursor-paginated list.
class Paged<T> {
  const Paged({required this.items, required this.nextCursor});

  factory Paged.fromJson(
    Map<String, Object?> json,
    T Function(Map<String, Object?> item) parse,
  ) => Paged(
    items: [
      for (final item in json['items']! as List<Object?>)
        parse(item! as Map<String, Object?>),
    ],
    nextCursor: json['nextCursor'] as String?,
  );

  final List<T> items;

  /// Null on the last page.
  final String? nextCursor;
}
