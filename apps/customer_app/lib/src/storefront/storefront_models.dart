import '../api/api_client.dart';

/// A pack size with the shop's price (CUS-003). No MRP (question 59).
class StorefrontPack {
  const StorefrontPack({
    required this.id,
    required this.label,
    required this.pricePaise,
    required this.available,
  });

  factory StorefrontPack.fromJson(Map<String, Object?> json) => StorefrontPack(
    id: json['id']! as String,
    label: json['label']! as String,
    pricePaise: json['pricePaise']! as int,
    available: json['available'] == true,
  );

  final String id;

  /// For example "4 L".
  final String label;
  final int pricePaise;

  /// Unavailable packs cannot be bought (D-029).
  final bool available;
}

/// A product in a Live shop's storefront.
class StorefrontProduct {
  const StorefrontProduct({
    required this.id,
    required this.name,
    required this.brand,
    required this.categoryName,
    required this.description,
    required this.supportsShades,
    required this.thumbUrl,
    required this.imageUrl,
    required this.packs,
    required this.available,
    required this.fromPricePaise,
  });

  factory StorefrontProduct.fromJson(Map<String, Object?> json) {
    final image = json['image'] as Map<String, Object?>?;
    final category = json['category']! as Map<String, Object?>;
    return StorefrontProduct(
      id: json['id']! as String,
      name: json['name']! as String,
      brand: json['brand'] as String?,
      categoryName: category['name']! as String,
      description: json['description'] as String?,
      supportsShades: json['supportsShades'] == true,
      thumbUrl: image?['thumbUrl'] as String?,
      imageUrl: image?['url'] as String?,
      packs: [
        for (final pack in json['packs']! as List<Object?>)
          StorefrontPack.fromJson(pack! as Map<String, Object?>),
      ],
      available: json['available'] == true,
      fromPricePaise: json['fromPricePaise']! as int,
    );
  }

  final String id;
  final String name;
  final String? brand;
  final String categoryName;
  final String? description;

  /// The customer picks a shade for it (chosen when ordering).
  final bool supportsShades;
  final String? thumbUrl;
  final String? imageUrl;

  /// Smallest first; unavailable ones included.
  final List<StorefrontPack> packs;

  /// At least one pack can be bought.
  final bool available;
  final int fromPricePaise;
}

class StorefrontCategory {
  const StorefrontCategory({
    required this.id,
    required this.name,
    required this.productCount,
  });

  factory StorefrontCategory.fromJson(Map<String, Object?> json) =>
      StorefrontCategory(
        id: json['id']! as String,
        name: json['name']! as String,
        productCount: json['productCount']! as int,
      );

  final String id;
  final String name;
  final int productCount;
}

class StorefrontPage {
  const StorefrontPage({
    required this.items,
    required this.total,
    required this.page,
  });

  factory StorefrontPage.fromJson(Map<String, Object?> json) => StorefrontPage(
    items: [
      for (final item in json['items']! as List<Object?>)
        StorefrontProduct.fromJson(item! as Map<String, Object?>),
    ],
    total: json['total']! as int,
    page: json['page']! as int,
  );

  final List<StorefrontProduct> items;
  final int total;
  final int page;
}

/// A Live shop's storefront (CUS-003 API). Every method throws
/// [ApiException].
abstract class StorefrontRepository {
  Future<List<StorefrontCategory>> categories(String shopId);

  Future<StorefrontPage> products(
    String shopId, {
    String? query,
    String? categoryId,
    int page = 1,
  });

  Future<StorefrontProduct> product(String shopId, String productId);
}

class ApiStorefrontRepository implements StorefrontRepository {
  const ApiStorefrontRepository(this._api);

  static const pageSize = 20;

  final ApiClient _api;

  static String _shop(String shopId) =>
      '/v1/discover/shops/${Uri.encodeComponent(shopId)}';

  @override
  Future<List<StorefrontCategory>> categories(String shopId) async {
    final json = await _api.getJson('${_shop(shopId)}/categories');
    return [
      for (final item in json['items']! as List<Object?>)
        StorefrontCategory.fromJson(item! as Map<String, Object?>),
    ];
  }

  @override
  Future<StorefrontPage> products(
    String shopId, {
    String? query,
    String? categoryId,
    int page = 1,
  }) async => StorefrontPage.fromJson(
    await _api.getJson(
      '${_shop(shopId)}/products',
      query: {
        if (query != null && query.isNotEmpty) 'q': query,
        'categoryId': ?categoryId,
        'page': '$page',
        'pageSize': '$pageSize',
      },
    ),
  );

  @override
  Future<StorefrontProduct> product(String shopId, String productId) async =>
      StorefrontProduct.fromJson(
        await _api.getJson(
          '${_shop(shopId)}/products/${Uri.encodeComponent(productId)}',
        ),
      );
}
