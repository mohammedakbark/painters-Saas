import '../api/api_client.dart';
import '../shops/shop_access_repository.dart';

/// Limits of a shop's own categories, the same as the API's (CAT-007).
abstract final class CategoryLimits {
  static const minName = 2;
  static const maxName = 60;
  static const maxOwn = 50;
}

/// A product category: the platform's or one of the shop's own (D-048).
class ShopCategory {
  const ShopCategory({
    required this.id,
    required this.name,
    required this.active,
    required this.own,
    required this.productCount,
  });

  factory ShopCategory.fromJson(Map<String, Object?> json) => ShopCategory(
    id: json['id']! as String,
    name: json['name']! as String,
    active: json['active']! as bool,
    own: json['own']! as bool,
    productCount: (json['productCount']! as num).toInt(),
  );

  final String id;
  final String name;

  /// Archived own categories are hidden when adding products.
  final bool active;

  /// The shop's own; platform categories can't be changed by a shop.
  final bool own;

  /// The shop's products in this category.
  final int productCount;
}

/// The shop's categories (CAT-007 API). Reading needs `catalogue.view`,
/// changing `catalogue.manage`; the API checks both.
abstract interface class CategoriesRepository {
  /// Active platform categories, then all of the shop's own.
  Future<List<ShopCategory>> list(String shopId);

  /// 409 `category_name_taken` (on `name`) or `shop_category_limit`.
  Future<ShopCategory> create(String shopId, String name);

  /// Renames ([name]) or archives and restores ([active]) an own category.
  Future<ShopCategory> update(
    String shopId,
    String categoryId, {
    String? name,
    bool? active,
  });
}

class ApiCategoriesRepository implements CategoriesRepository {
  const ApiCategoriesRepository(this._api);

  final ApiClient _api;

  String _path(String shopId, [String rest = '']) =>
      '/v1/shops/${Uri.encodeComponent(shopId)}/catalogue/categories$rest';

  @override
  Future<List<ShopCategory>> list(String shopId) => _guard(() async {
    final list = await _api.getJson(_path(shopId));
    return [
      for (final item in list['items']! as List<Object?>)
        ShopCategory.fromJson(item! as Map<String, Object?>),
    ];
  });

  @override
  Future<ShopCategory> create(String shopId, String name) => _guard(
    () async => ShopCategory.fromJson(
      await _api.postJson(_path(shopId), {'name': name}),
    ),
  );

  @override
  Future<ShopCategory> update(
    String shopId,
    String categoryId, {
    String? name,
    bool? active,
  }) => _guard(
    () async => ShopCategory.fromJson(
      await _api.patchJson(
        _path(shopId, '/${Uri.encodeComponent(categoryId)}'),
        {'name': ?name, 'active': ?active},
      ),
    ),
  );

  Future<T> _guard<T>(Future<T> Function() call) async {
    try {
      return await call();
    } on ApiException catch (error) {
      if (error.code == 'shop_not_found') throw const ShopNotFound();
      rethrow;
    }
  }
}
