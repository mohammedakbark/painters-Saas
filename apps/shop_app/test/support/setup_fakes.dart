import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/catalogue/categories_repository.dart';
import 'package:shop_app/src/catalogue/shades_repository.dart';

// Shades and categories test data and fakes with the API's rules (SHP-014).

const _royalShades = [
  ShadeItem(id: 'b1', code: 'RP 101', name: 'Ivory', previewHex: '#F4EBD0'),
  ShadeItem(id: 'b2', code: 'RP 102', name: 'Sky', previewHex: '#9CC3E6'),
  ShadeItem(id: 'b3', code: 'RP 103', name: 'Moss', previewHex: null),
];

/// Brand shades by brand id; favourites by shade id; the shop's own shades.
class FakeShadesRepository implements ShadesRepository {
  FakeShadesRepository({
    Map<String, List<ShadeItem>>? shadesByBrand,
    Set<String>? favouriteIds,
    List<ShadeItem>? own,
  }) : shadesByBrand =
           shadesByBrand ??
           {
             'brand-1': [..._royalShades],
           },
       favouriteIds = favouriteIds ?? {},
       own = own ?? [];

  final Map<String, List<ShadeItem>> shadesByBrand;
  final Set<String> favouriteIds;
  final List<ShadeItem> own;

  /// Page size; small in tests to reach "Load more".
  int pageSize = shadePageSize;

  /// When set, the next call fails with it (once).
  Object? nextError;

  void _fail() {
    final error = nextError;
    if (error != null) {
      nextError = null;
      throw error;
    }
  }

  ShadePage _page(List<ShadeItem> all, String query, int page) {
    final q = query.toLowerCase();
    final matching = [
      for (final shade in all)
        if (q.isEmpty ||
            shade.code.toLowerCase().contains(q) ||
            shade.name.toLowerCase().contains(q))
          shade,
    ];
    return ShadePage(
      items: matching.skip((page - 1) * pageSize).take(pageSize).toList(),
      total: matching.length,
      page: page,
    );
  }

  @override
  Future<ShadePage> favourites(
    String shopId, {
    String query = '',
    int page = 1,
  }) async {
    _fail();
    return _page(
      [
        for (final shade in shadesByBrand.values.expand((shades) => shades))
          if (favouriteIds.contains(shade.id))
            ShadeItem(
              id: shade.id,
              code: shade.code,
              name: shade.name,
              previewHex: shade.previewHex,
              brandName: 'Royal Paints',
              favourite: true,
            ),
      ],
      query,
      page,
    );
  }

  @override
  Future<ShadePage> brandShades(
    String shopId, {
    required String brandId,
    String query = '',
    int page = 1,
  }) async {
    _fail();
    return _page(
      [
        for (final shade in shadesByBrand[brandId] ?? const <ShadeItem>[])
          shade.withFavourite(favouriteIds.contains(shade.id)),
      ],
      query,
      page,
    );
  }

  @override
  Future<ShadePage> ownShades(
    String shopId, {
    String query = '',
    int page = 1,
  }) async {
    _fail();
    return _page(own, query, page);
  }

  @override
  Future<void> setFavourite(
    String shopId,
    String shadeId, {
    required bool favourite,
  }) async {
    _fail();
    if (favourite) {
      favouriteIds.add(shadeId);
    } else {
      favouriteIds.remove(shadeId);
    }
  }

  @override
  Future<ShadeItem> addOwn(String shopId, NewShade shade) async {
    _fail();
    final code = shade.code.toUpperCase();
    if (own.any((each) => each.code == code)) {
      throw ApiException(
        status: 409,
        code: 'shop_shade_exists',
        detail: 'You already have a shade with the code $code.',
        fieldErrors: {'code': 'You already have a shade with the code $code.'},
      );
    }
    final added = ShadeItem(
      id: 'own-${own.length}',
      code: code,
      name: shade.name,
      previewHex: shade.previewHex,
      brandName: shade.brandId == null ? null : 'Royal Paints',
    );
    own.add(added);
    return added;
  }

  @override
  Future<void> removeOwn(String shopId, String shadeId) async {
    _fail();
    own.removeWhere((shade) => shade.id == shadeId);
  }
}

const platformCategories = [
  ShopCategory(
    id: 'cat-int',
    name: 'Interior emulsion',
    active: true,
    own: false,
    productCount: 4,
  ),
  ShopCategory(
    id: 'cat-ext',
    name: 'Exterior emulsion',
    active: true,
    own: false,
    productCount: 0,
  ),
];

/// Platform categories plus the shop's own, with the API's name rules.
class FakeCategoriesRepository implements CategoriesRepository {
  FakeCategoriesRepository({List<ShopCategory>? categories})
    : categories = categories ?? [...platformCategories];

  final List<ShopCategory> categories;

  /// When set, the next call fails with it (once).
  Object? nextError;

  void _fail() {
    final error = nextError;
    if (error != null) {
      nextError = null;
      throw error;
    }
  }

  void _checkName(String name, {String? except}) {
    if (categories.any(
      (category) =>
          category.id != except &&
          category.name.toLowerCase() == name.toLowerCase(),
    )) {
      throw ApiException(
        status: 409,
        code: 'category_name_taken',
        detail: 'There is already a category named "$name".',
        fieldErrors: {'name': 'There is already a category named "$name".'},
      );
    }
  }

  @override
  Future<List<ShopCategory>> list(String shopId) async {
    _fail();
    return [...categories];
  }

  @override
  Future<ShopCategory> create(String shopId, String name) async {
    _fail();
    _checkName(name);
    final created = ShopCategory(
      id: 'own-${categories.length}',
      name: name,
      active: true,
      own: true,
      productCount: 0,
    );
    categories.add(created);
    return created;
  }

  @override
  Future<ShopCategory> update(
    String shopId,
    String categoryId, {
    String? name,
    bool? active,
  }) async {
    _fail();
    final index = categories.indexWhere(
      (category) => category.id == categoryId && category.own,
    );
    if (index < 0) {
      throw const ApiException(status: 404, code: 'shop_category_not_found');
    }
    if (name != null) _checkName(name, except: categoryId);
    final old = categories[index];
    return categories[index] = ShopCategory(
      id: old.id,
      name: name ?? old.name,
      active: active ?? old.active,
      own: true,
      productCount: old.productCount,
    );
  }
}
