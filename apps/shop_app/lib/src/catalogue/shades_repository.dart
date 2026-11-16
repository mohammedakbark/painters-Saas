import '../api/api_client.dart';
import '../shops/shop_access_repository.dart';

/// Shades per page (an API page size).
const shadePageSize = 25;

/// A shade as the Shades screen shows it (SHP-014): a brand shade (with
/// whether it is a favourite) or one of the shop's own.
class ShadeItem {
  const ShadeItem({
    required this.id,
    required this.code,
    required this.name,
    required this.previewHex,
    this.brandName,
    this.favourite = false,
  });

  /// `{shade, favourite}` of `brand-shades`.
  factory ShadeItem.fromBrandRow(Map<String, Object?> json) => ShadeItem._shade(
    json['shade']! as Map<String, Object?>,
    favourite: json['favourite'] == true,
  );

  /// `{shade, brand}` of `favourite-shades`.
  factory ShadeItem.fromFavourite(Map<String, Object?> json) =>
      ShadeItem._shade(
        json['shade']! as Map<String, Object?>,
        favourite: true,
        brandName: (json['brand']! as Map<String, Object?>)['name']! as String,
      );

  /// A shade of the shop's own (`shades`).
  factory ShadeItem.fromOwn(Map<String, Object?> json) => ShadeItem(
    id: json['id']! as String,
    code: json['code']! as String,
    name: json['name']! as String,
    previewHex: json['previewHex'] as String?,
    brandName: switch (json['brand']) {
      final Map<String, Object?> brand => brand['name']! as String,
      _ => null,
    },
  );

  factory ShadeItem._shade(
    Map<String, Object?> shade, {
    required bool favourite,
    String? brandName,
  }) => ShadeItem(
    id: shade['id']! as String,
    code: shade['code']! as String,
    name: shade['name']! as String,
    previewHex: shade['previewHex'] as String?,
    brandName: brandName,
    favourite: favourite,
  );

  final String id;
  final String code;
  final String name;

  /// Indicative screen colour, `#RRGGBB`.
  final String? previewHex;
  final String? brandName;
  final bool favourite;

  ShadeItem withFavourite(bool favourite) => ShadeItem(
    id: id,
    code: code,
    name: name,
    previewHex: previewHex,
    brandName: brandName,
    favourite: favourite,
  );
}

/// One page of shades.
class ShadePage {
  const ShadePage({
    required this.items,
    required this.total,
    required this.page,
  });

  factory ShadePage.fromJson(
    Map<String, Object?> json,
    ShadeItem Function(Map<String, Object?> item) parse,
  ) => ShadePage(
    items: [
      for (final item in json['items']! as List<Object?>)
        parse(item! as Map<String, Object?>),
    ],
    total: (json['total']! as num).toInt(),
    page: (json['page']! as num).toInt(),
  );

  final List<ShadeItem> items;
  final int total;
  final int page;
}

/// A shade of the shop's own as typed in the Add shade sheet.
typedef NewShade = ({
  String code,
  String name,
  String? previewHex,
  String? brandId,
});

/// The shop's favourite brand shades and shades of its own (WEB-006 API).
/// Reading needs `catalogue.view`, changing `catalogue.manage`; the API
/// checks both.
abstract interface class ShadesRepository {
  Future<ShadePage> favourites(String shopId, {String query = '', int page});

  Future<ShadePage> brandShades(
    String shopId, {
    required String brandId,
    String query = '',
    int page,
  });

  Future<ShadePage> ownShades(String shopId, {String query = '', int page});

  /// Idempotent. 409 `favourite_limit` at the limit.
  Future<void> setFavourite(
    String shopId,
    String shadeId, {
    required bool favourite,
  });

  /// 409 `shop_shade_exists` (on `code`) or `shop_shade_limit`.
  Future<ShadeItem> addOwn(String shopId, NewShade shade);

  Future<void> removeOwn(String shopId, String shadeId);
}

class ApiShadesRepository implements ShadesRepository {
  const ApiShadesRepository(this._api);

  final ApiClient _api;

  String _path(String shopId, String rest) =>
      '/v1/shops/${Uri.encodeComponent(shopId)}/catalogue/$rest';

  Map<String, String> _query(String query, int page) => {
    if (query.isNotEmpty) 'q': query,
    'page': '$page',
    'pageSize': '$shadePageSize',
  };

  @override
  Future<ShadePage> favourites(
    String shopId, {
    String query = '',
    int page = 1,
  }) => _guard(
    () async => ShadePage.fromJson(
      await _api.getJson(
        _path(shopId, 'favourite-shades'),
        query: _query(query, page),
      ),
      ShadeItem.fromFavourite,
    ),
  );

  @override
  Future<ShadePage> brandShades(
    String shopId, {
    required String brandId,
    String query = '',
    int page = 1,
  }) => _guard(
    () async => ShadePage.fromJson(
      await _api.getJson(
        _path(shopId, 'brand-shades'),
        query: {'brandId': brandId, ..._query(query, page)},
      ),
      ShadeItem.fromBrandRow,
    ),
  );

  @override
  Future<ShadePage> ownShades(
    String shopId, {
    String query = '',
    int page = 1,
  }) => _guard(
    () async => ShadePage.fromJson(
      await _api.getJson(_path(shopId, 'shades'), query: _query(query, page)),
      ShadeItem.fromOwn,
    ),
  );

  @override
  Future<void> setFavourite(
    String shopId,
    String shadeId, {
    required bool favourite,
  }) => _guard(() async {
    final path = _path(
      shopId,
      'favourite-shades/${Uri.encodeComponent(shadeId)}',
    );
    if (favourite) {
      await _api.putJson(path, const {});
    } else {
      await _api.delete(path);
    }
  });

  @override
  Future<ShadeItem> addOwn(String shopId, NewShade shade) => _guard(
    () async => ShadeItem.fromOwn(
      await _api.postJson(_path(shopId, 'shades'), {
        'code': shade.code,
        'name': shade.name,
        'previewHex': shade.previewHex,
        'brandId': shade.brandId,
      }),
    ),
  );

  @override
  Future<void> removeOwn(String shopId, String shadeId) => _guard(
    () => _api.delete(_path(shopId, 'shades/${Uri.encodeComponent(shadeId)}')),
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
