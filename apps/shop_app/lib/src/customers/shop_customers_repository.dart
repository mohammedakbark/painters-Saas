import '../api/api_client.dart';
import '../shops/shop_access_repository.dart';
import 'customer_models.dart';

/// The customer is not in this shop's records.
class CustomerNotFound implements Exception {
  const CustomerNotFound();
}

/// Customers offered per search.
const _searchPageSize = 10;

/// Customers per page of the Customers tab (an API page size).
const customerPageSize = 25;

/// The Customers tab's search and type filter.
typedef CustomerListFilter = ({String query, CustomerKind? kind});

/// A site's fields as typed in the site form. The map pin is set on the web.
typedef SiteFields = ({String name, String? ownerName, String address});

/// The shop's own customers (ORD-004 API). The API checks membership and
/// that every id belongs to this shop.
abstract interface class ShopCustomersRepository {
  /// Customers whose name or mobile matches [query].
  Future<List<ShopCustomer>> search(String shopId, String query);

  /// A page of the Customers tab, newest first.
  Future<CustomerListPage> list(
    String shopId,
    CustomerListFilter filter, {
    int page = 1,
  });

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

  /// Changes the name, type or mobile. The mobile of a customer who uses
  /// the app comes from their account (409 on the `phone` field).
  Future<CustomerDetail> update(
    String shopId,
    String customerId, {
    String? name,
    String? phone,
    CustomerKind? kind,
  });

  /// Adds a site to a painter the shop recorded.
  Future<CustomerSite> createSite(
    String shopId,
    String customerId,
    SiteFields fields,
  );

  /// Edits a site ([fields]) or archives and restores it ([archived]).
  Future<CustomerSite> updateSite(
    String shopId,
    String customerId,
    String siteId, {
    SiteFields? fields,
    bool? archived,
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
  Future<CustomerListPage> list(
    String shopId,
    CustomerListFilter filter, {
    int page = 1,
  }) => _guard(
    () async => CustomerListPage.fromJson(
      await _api.getJson(
        _path(shopId),
        query: {
          if (filter.query.isNotEmpty) 'q': filter.query,
          'kind': ?filter.kind?.apiValue,
          'page': '$page',
          'pageSize': '$customerPageSize',
        },
      ),
    ),
  );

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

  @override
  Future<CustomerDetail> update(
    String shopId,
    String customerId, {
    String? name,
    String? phone,
    CustomerKind? kind,
  }) => _guard(
    () async => CustomerDetail.fromJson(
      await _api.patchJson(
        _path(shopId, '/${Uri.encodeComponent(customerId)}'),
        {'name': ?name, 'phone': ?phone, 'kind': ?kind?.apiValue},
      ),
    ),
  );

  @override
  Future<CustomerSite> createSite(
    String shopId,
    String customerId,
    SiteFields fields,
  ) => _guard(
    () async => CustomerSite.fromJson(
      await _api.postJson(
        _path(shopId, '/${Uri.encodeComponent(customerId)}/sites'),
        _siteJson(fields),
      ),
    ),
  );

  @override
  Future<CustomerSite> updateSite(
    String shopId,
    String customerId,
    String siteId, {
    SiteFields? fields,
    bool? archived,
  }) => _guard(
    () async => CustomerSite.fromJson(
      await _api.patchJson(
        _path(
          shopId,
          '/${Uri.encodeComponent(customerId)}/sites/'
          '${Uri.encodeComponent(siteId)}',
        ),
        {
          ...?(fields == null ? null : _siteJson(fields)),
          'archived': ?archived,
        },
      ),
    ),
  );

  /// The pin is left out, so a pin set on the web stays.
  static Map<String, Object?> _siteJson(SiteFields fields) => {
    'name': fields.name,
    'ownerName': fields.ownerName,
    'address': fields.address,
  };

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
