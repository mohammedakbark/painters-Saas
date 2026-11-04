import '../api/api_client.dart';
import '../shops/shop_access_repository.dart';
import 'catalogue_models.dart';
import 'product_photo_picker.dart';

/// The product or pack is not in this shop's catalogue (or no longer exists).
class ShopProductNotFound implements Exception {
  const ShopProductNotFound();
}

/// The caller is a member but not allowed to change the catalogue.
class CatalogueForbidden implements Exception {
  const CatalogueForbidden();
}

/// A change to one pack. Fields left null are not sent; [clearMrp] sends an
/// explicit `"mrpPaise": null` to remove the MRP.
class PackChange {
  const PackChange({
    this.pricePaise,
    this.mrpPaise,
    this.clearMrp = false,
    this.available,
  }) : assert(!(clearMrp && mrpPaise != null), 'set or clear the MRP');

  final int? pricePaise;
  final int? mrpPaise;
  final bool clearMrp;
  final bool? available;

  Map<String, Object?> toJson() => {
    'pricePaise': ?pricePaise,
    if (clearMrp) 'mrpPaise': null else 'mrpPaise': ?mrpPaise,
    'available': ?available,
  };
}

/// Price, optional MRP and availability of a pack being added.
class PackPrice {
  const PackPrice({
    required this.pricePaise,
    required this.mrpPaise,
    required this.available,
  });

  final int pricePaise;
  final int? mrpPaise;
  final bool available;

  Map<String, Object?> toJson() => {
    'pricePaise': pricePaise,
    'mrpPaise': mrpPaise,
    'available': available,
  };
}

/// A pack size to add: a brand catalogue pack ([cataloguePackId]) for
/// catalogue products, or a [quantity] and [unit] for own products.
class NewPack {
  const NewPack.catalogue({
    required String this.cataloguePackId,
    required this.price,
  }) : quantity = null,
       unit = null;

  const NewPack.own({
    required double this.quantity,
    required PackUnit this.unit,
    required this.price,
  }) : cataloguePackId = null;

  final String? cataloguePackId;
  final double? quantity;
  final PackUnit? unit;
  final PackPrice price;

  Map<String, Object?> toJson() => {
    'cataloguePackId': ?cataloguePackId,
    'quantity': ?quantity,
    'unit': ?unit?.apiValue,
    ...price.toJson(),
  };
}

/// Reads and changes the shop's catalogue (CAT-002). The API checks
/// membership, role and that every id belongs to this shop; the app never
/// decides access itself.
abstract interface class ShopCatalogueRepository {
  /// Newest first. Throws [ShopNotFound] for shops the user cannot access.
  Future<Paged<ShopProduct>> listProducts(
    String shopId, {
    required bool archived,
    String? query,
    String? cursor,
  });

  /// Throws [ShopNotFound] or [ShopProductNotFound].
  Future<ShopProduct> fetchProduct(String shopId, String productId);

  /// Archives or restores a product.
  Future<ShopProduct> setArchived(
    String shopId,
    String productId, {
    required bool archived,
  });

  Future<ShopProduct> updatePack(
    String shopId,
    String productId,
    String packId,
    PackChange change,
  );

  Future<ShopProduct> addPack(String shopId, String productId, NewPack pack);

  /// The API refuses to remove the last pack size (`last_pack`).
  Future<ShopProduct> removePack(
    String shopId,
    String productId,
    String packId,
  );

  /// Active brands of the platform's brand catalogue, by name.
  Future<List<CatalogueBrand>> listBrands();

  /// A brand's products, each with the shop's listing id if it sells it.
  Future<Paged<BrandProductItem>> browseBrand(
    String shopId,
    String brandId, {
    String? query,
    String? cursor,
  });

  /// One active brand catalogue product. Throws [ShopProductNotFound] when
  /// the platform removed it.
  Future<CatalogueProduct> fetchCatalogueProduct(String catalogueProductId);

  /// Lists a brand catalogue product with prices for the chosen packs.
  Future<ShopProduct> addFromCatalogue(
    String shopId,
    String catalogueProductId,
    Map<String, PackPrice> pricesByCataloguePackId,
  );

  /// Replaces the shop's own photo of the product.
  Future<ShopProduct> replaceImage(
    String shopId,
    String productId,
    PickedPhoto photo,
  );
}

/// Pages of brands read for the brand dropdown: 50 per page (the API's
/// maximum), at most 10 pages, like the web portal.
const _brandPageSize = 50;
const _brandPages = 10;

/// Products per page in the shop's list.
const shopProductPageSize = 25;

class ApiShopCatalogueRepository implements ShopCatalogueRepository {
  const ApiShopCatalogueRepository(this._api);

  final ApiClient _api;

  String _path(String shopId, [String rest = '']) =>
      '/v1/shops/${Uri.encodeComponent(shopId)}/catalogue$rest';

  String _product(String shopId, String productId, [String rest = '']) =>
      _path(shopId, '/products/${Uri.encodeComponent(productId)}$rest');

  Future<ShopProduct> _productCall(
    Future<Map<String, Object?>> Function() call,
  ) => _guard(() async => ShopProduct.fromJson(await call()));

  @override
  Future<Paged<ShopProduct>> listProducts(
    String shopId, {
    required bool archived,
    String? query,
    String? cursor,
  }) => _guard(
    () async => Paged.fromJson(
      await _api.getJson(
        _path(shopId, '/products'),
        query: {
          'status': archived ? 'ARCHIVED' : 'ACTIVE',
          'limit': '$shopProductPageSize',
          if (query != null && query.isNotEmpty) 'q': query,
          'cursor': ?cursor,
        },
      ),
      ShopProduct.fromJson,
    ),
  );

  @override
  Future<ShopProduct> fetchProduct(String shopId, String productId) =>
      _productCall(() => _api.getJson(_product(shopId, productId)));

  @override
  Future<ShopProduct> setArchived(
    String shopId,
    String productId, {
    required bool archived,
  }) => _productCall(
    () => _api.patchJson(_product(shopId, productId), {
      'status': archived ? 'ARCHIVED' : 'ACTIVE',
    }),
  );

  @override
  Future<ShopProduct> updatePack(
    String shopId,
    String productId,
    String packId,
    PackChange change,
  ) => _productCall(
    () => _api.patchJson(
      _product(shopId, productId, '/packs/${Uri.encodeComponent(packId)}'),
      change.toJson(),
    ),
  );

  @override
  Future<ShopProduct> addPack(String shopId, String productId, NewPack pack) =>
      _productCall(
        () =>
            _api.postJson(_product(shopId, productId, '/packs'), pack.toJson()),
      );

  @override
  Future<ShopProduct> removePack(
    String shopId,
    String productId,
    String packId,
  ) => _productCall(
    () => _api.deleteJson(
      _product(shopId, productId, '/packs/${Uri.encodeComponent(packId)}'),
    ),
  );

  @override
  Future<List<CatalogueBrand>> listBrands() => _guard(() async {
    final brands = <CatalogueBrand>[];
    String? cursor;
    for (var page = 0; page < _brandPages; page++) {
      final result = Paged.fromJson(
        await _api.getJson(
          '/v1/catalogue/brands',
          query: {'limit': '$_brandPageSize', 'cursor': ?cursor},
        ),
        CatalogueBrand.fromJson,
      );
      brands.addAll(result.items);
      cursor = result.nextCursor;
      if (cursor == null) break;
    }
    return brands;
  });

  @override
  Future<Paged<BrandProductItem>> browseBrand(
    String shopId,
    String brandId, {
    String? query,
    String? cursor,
  }) => _guard(
    () async => Paged.fromJson(
      await _api.getJson(
        _path(shopId, '/brand-products'),
        query: {
          'brandId': brandId,
          'limit': '$shopProductPageSize',
          if (query != null && query.isNotEmpty) 'q': query,
          'cursor': ?cursor,
        },
      ),
      BrandProductItem.fromJson,
    ),
  );

  @override
  Future<CatalogueProduct> fetchCatalogueProduct(
    String catalogueProductId,
  ) => _guard(() async {
    try {
      return CatalogueProduct.fromJson(
        await _api.getJson(
          '/v1/catalogue/products/${Uri.encodeComponent(catalogueProductId)}',
        ),
      );
    } on ApiException catch (error) {
      if (error.status == 404) throw const ShopProductNotFound();
      rethrow;
    }
  });

  @override
  Future<ShopProduct> addFromCatalogue(
    String shopId,
    String catalogueProductId,
    Map<String, PackPrice> pricesByCataloguePackId,
  ) => _productCall(
    () => _api.postJson(_path(shopId, '/products'), {
      'source': 'catalogue',
      'catalogueProductId': catalogueProductId,
      'packs': [
        for (final MapEntry(key: packId, value: price)
            in pricesByCataloguePackId.entries)
          {'cataloguePackId': packId, ...price.toJson()},
      ],
    }),
  );

  @override
  Future<ShopProduct> replaceImage(
    String shopId,
    String productId,
    PickedPhoto photo,
  ) => _productCall(
    () => _api.putMultipart(
      _product(shopId, productId, '/image'),
      field: 'image',
      bytes: photo.bytes,
      filename: photo.filename,
      contentType: photo.contentType,
    ),
  );

  Future<T> _guard<T>(Future<T> Function() call) async {
    try {
      return await call();
    } on ApiException catch (error) {
      if (error.code == 'shop_not_found') {
        throw const ShopNotFound();
      }
      if (error.code == 'shop_product_not_found' ||
          error.code == 'shop_pack_not_found') {
        throw const ShopProductNotFound();
      }
      if (error.status == 403) {
        throw const CatalogueForbidden();
      }
      rethrow;
    }
  }
}
