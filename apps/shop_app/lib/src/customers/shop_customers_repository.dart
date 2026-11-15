import '../api/api_client.dart';
import '../shops/shop_access_repository.dart';
import 'customer_models.dart';

/// The customer is not in this shop's records.
class CustomerNotFound implements Exception {
  const CustomerNotFound();
}

/// Customers offered per search.
const _searchPageSize = 10;

/// The shop's own customers (ORD-004 API). The API checks membership and
/// that every id belongs to this shop.
abstract interface class ShopCustomersRepository {
  /// Customers whose name or mobile matches [query].
  Future<List<ShopCustomer>> search(String shopId, String query);

  /// Throws [CustomerNotFound].
  Future<CustomerDetail> fetch(String shopId, String customerId);

  /// Records a customer. A mobile the shop already has answers 409 with the
  /// message on the `phone` field.
  Future<CustomerDetail> create(
    String shopId, {
    required String name,
    required String phone,
    required CustomerKind kind,
  });
}

class ApiShopCustomersRepository implements ShopCustomersRepository {
  const ApiShopCustomersRepository(this._api);

  final ApiClient _api;

  String _path(String shopId, [String rest = '']) =>
      '/v1/shops/${Uri.encodeComponent(shopId)}/customers$rest';

  @override
  Future<List<ShopCustomer>> search(String shopId, String query) =>
      _guard(() async {
        final page = await _api.getJson(
          _path(shopId),
          query: {'q': query, 'page': '1', 'pageSize': '$_searchPageSize'},
        );
        return [
          for (final item in page['items']! as List<Object?>)
            ShopCustomer.fromJson(item! as Map<String, Object?>),
        ];
      });

  @override
  Future<CustomerDetail> fetch(String shopId, String customerId) => _guard(
    () async => CustomerDetail.fromJson(
      await _api.getJson(_path(shopId, '/${Uri.encodeComponent(customerId)}')),
    ),
  );

  @override
  Future<CustomerDetail> create(
    String shopId, {
    required String name,
    required String phone,
    required CustomerKind kind,
  }) => _guard(
    () async => CustomerDetail.fromJson(
      await _api.postJson(_path(shopId), {
        'name': name,
        'phone': phone,
        'kind': kind.apiValue,
      }),
    ),
  );

  Future<T> _guard<T>(Future<T> Function() call) async {
    try {
      return await call();
    } on ApiException catch (error) {
      if (error.code == 'shop_not_found') throw const ShopNotFound();
      if (error.status == 404) throw const CustomerNotFound();
      rethrow;
    }
  }
}
