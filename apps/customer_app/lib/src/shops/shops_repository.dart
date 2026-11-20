import '../api/api_client.dart';
import 'shop_models.dart';

/// Find shops and My Shops (CUS-002 API). Every method throws
/// `ApiException`.
abstract class ShopsRepository {
  Future<FindShopsPage> find({
    required ShopsNear near,
    String? query,
    int page = 1,
  });

  Future<List<ShopDistrict>> districts();

  Future<PublicShop> get(String shopId, {ShopsNear near = const NearNothing()});

  Future<List<PublicShop>> myShops({ShopsNear near = const NearNothing()});

  /// Instant, no approval (D-037). Returns the shop with `inMyShops`.
  Future<PublicShop> add(String shopId);

  Future<void> remove(String shopId);
}

class ApiShopsRepository implements ShopsRepository {
  const ApiShopsRepository(this._api);

  static const pageSize = 20;

  final ApiClient _api;

  static Map<String, String> _nearQuery(ShopsNear near) => switch (near) {
    NearPosition(:final latitude, :final longitude) => {
      // About 100 m: plenty for "nearest first", less precise to send.
      'lat': latitude.toStringAsFixed(3),
      'lng': longitude.toStringAsFixed(3),
    },
    NearDistrict(:final district) => {'district': district},
    NearNothing() => const {},
  };

  static String _id(String shopId) => Uri.encodeComponent(shopId);

  @override
  Future<FindShopsPage> find({
    required ShopsNear near,
    String? query,
    int page = 1,
  }) async => FindShopsPage.fromJson(
    await _api.getJson(
      '/v1/discover/shops',
      query: {
        ..._nearQuery(near),
        if (query != null && query.isNotEmpty) 'q': query,
        'page': '$page',
        'pageSize': '$pageSize',
      },
    ),
  );

  @override
  Future<List<ShopDistrict>> districts() async {
    final json = await _api.getJson('/v1/discover/shops/districts');
    return [
      for (final item in json['items']! as List<Object?>)
        ShopDistrict.fromJson(item! as Map<String, Object?>),
    ];
  }

  @override
  Future<PublicShop> get(
    String shopId, {
    ShopsNear near = const NearNothing(),
  }) async => PublicShop.fromJson(
    await _api.getJson(
      '/v1/discover/shops/${_id(shopId)}',
      query: near is NearPosition ? _nearQuery(near) : null,
    ),
  );

  @override
  Future<List<PublicShop>> myShops({
    ShopsNear near = const NearNothing(),
  }) async {
    final json = await _api.getJson(
      '/v1/me/shops',
      query: near is NearPosition ? _nearQuery(near) : null,
    );
    return [
      for (final item in json['items']! as List<Object?>)
        PublicShop.fromJson(item! as Map<String, Object?>),
    ];
  }

  @override
  Future<PublicShop> add(String shopId) async => PublicShop.fromJson(
    await _api.putJson('/v1/me/shops/${_id(shopId)}', {}),
  );

  @override
  Future<void> remove(String shopId) =>
      _api.delete('/v1/me/shops/${_id(shopId)}');
}
