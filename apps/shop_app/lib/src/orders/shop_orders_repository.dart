import '../api/api_client.dart';
import '../shops/shop_access_repository.dart';
import 'order_models.dart';

/// The order or item is not one of this shop's (or no longer exists).
class OrderNotFound implements Exception {
  const OrderNotFound();
}

/// The caller is a member but not allowed to do this (payments and returns
/// are for the owner, D-053).
class OrdersForbidden implements Exception {
  const OrdersForbidden();
}

/// Search and filters of the orders list.
typedef OrderListFilter = ({
  OrderTab tab,
  String query,
  Fulfilment? fulfilment,
  bool? paid,
});

/// A substitute the shop suggests for a line.
class SubstituteOffer {
  const SubstituteOffer({
    required this.packId,
    required this.quantity,
    this.shadeCode,
    this.message,
  });

  final String packId;
  final int quantity;
  final String? shadeCode;
  final String? message;

  Map<String, Object?> toJson() => {
    'shopProductPackId': packId,
    'quantity': quantity,
    'shadeCode': ?shadeCode,
    'message': ?message,
  };
}

/// Orders per page in the list (the API allows 10, 25 or 50).
const orderPageSize = 25;

/// Pack sizes offered per substitute search.
const _packSearchPageSize = 10;

/// Reads and handles the shop's orders (ORD-001 API). The API checks
/// membership, role and that every id belongs to this shop; the app never
/// decides access itself.
abstract interface class ShopOrdersRepository {
  /// Newest first. Throws [ShopNotFound] for shops the user cannot access.
  Future<OrderListPage> list(
    String shopId,
    OrderListFilter filter, {
    int page = 1,
  });

  Future<OrderSummary> summary(String shopId);

  /// Throws [ShopNotFound] or [OrderNotFound].
  Future<OrderDetail> fetch(String shopId, String orderId);

  /// Moves the order to [to]. Cancelling needs a [reason].
  Future<OrderDetail> changeStatus(
    String shopId,
    String orderId,
    OrderStatus to, {
    String? reason,
  });

  Future<OrderDetail> markNotAvailable(
    String shopId,
    String orderId,
    String itemId,
    String message,
  );

  Future<OrderDetail> offerSubstitute(
    String shopId,
    String orderId,
    String itemId,
    SubstituteOffer offer,
  );

  /// Owner only, once.
  Future<OrderDetail> recordPayment(
    String shopId,
    String orderId,
    PaymentMethod method,
  );

  /// Owner only.
  Future<OrderDetail> returnItem(
    String shopId,
    String orderId,
    String itemId, {
    required int quantity,
    required String reason,
  });

  /// The shop's ready messages for customers (Shop settings, SHP-008).
  Future<List<String>> orderMessages(String shopId);

  /// Available pack sizes whose product or brand matches [query].
  Future<List<PackOption>> searchPacks(String shopId, String query);
}

class ApiShopOrdersRepository implements ShopOrdersRepository {
  const ApiShopOrdersRepository(this._api);

  final ApiClient _api;

  String _shop(String shopId, String rest) =>
      '/v1/shops/${Uri.encodeComponent(shopId)}$rest';

  String _order(String shopId, String orderId, [String rest = '']) =>
      _shop(shopId, '/orders/${Uri.encodeComponent(orderId)}$rest');

  String _item(String shopId, String orderId, String itemId, String rest) =>
      _order(shopId, orderId, '/items/${Uri.encodeComponent(itemId)}$rest');

  Future<OrderDetail> _detail(Future<Map<String, Object?>> Function() call) =>
      _guard(() async => OrderDetail.fromJson(await call()));

  @override
  Future<OrderListPage> list(
    String shopId,
    OrderListFilter filter, {
    int page = 1,
  }) => _guard(
    () async => OrderListPage.fromJson(
      await _api.getJson(
        _shop(shopId, '/orders'),
        query: {
          'status': filter.tab.apiValue,
          'page': '$page',
          'pageSize': '$orderPageSize',
          if (filter.query.isNotEmpty) 'q': filter.query,
          'fulfilment': ?filter.fulfilment?.apiValue,
          if (filter.paid != null) 'payment': filter.paid! ? 'PAID' : 'UNPAID',
        },
      ),
    ),
  );

  @override
  Future<OrderSummary> summary(String shopId) => _guard(
    () async => OrderSummary.fromJson(
      await _api.getJson(_shop(shopId, '/orders/summary')),
    ),
  );

  @override
  Future<OrderDetail> fetch(String shopId, String orderId) =>
      _detail(() => _api.getJson(_order(shopId, orderId)));

  @override
  Future<OrderDetail> changeStatus(
    String shopId,
    String orderId,
    OrderStatus to, {
    String? reason,
  }) => _detail(
    () => _api.postJson(_order(shopId, orderId, '/status'), {
      'to': to.apiValue,
      'reason': ?reason,
    }),
  );

  @override
  Future<OrderDetail> markNotAvailable(
    String shopId,
    String orderId,
    String itemId,
    String message,
  ) => _detail(
    () => _api.postJson(_item(shopId, orderId, itemId, '/not-available'), {
      'message': message,
    }),
  );

  @override
  Future<OrderDetail> offerSubstitute(
    String shopId,
    String orderId,
    String itemId,
    SubstituteOffer offer,
  ) => _detail(
    () => _api.postJson(
      _item(shopId, orderId, itemId, '/substitute'),
      offer.toJson(),
    ),
  );

  @override
  Future<OrderDetail> recordPayment(
    String shopId,
    String orderId,
    PaymentMethod method,
  ) => _detail(
    () => _api.postJson(_order(shopId, orderId, '/payment'), {
      'method': method.apiValue,
    }),
  );

  @override
  Future<OrderDetail> returnItem(
    String shopId,
    String orderId,
    String itemId, {
    required int quantity,
    required String reason,
  }) => _detail(
    () => _api.postJson(_item(shopId, orderId, itemId, '/return'), {
      'quantity': quantity,
      'reason': reason,
    }),
  );

  @override
  Future<List<String>> orderMessages(String shopId) => _guard(() async {
    final settings = await _api.getJson(_shop(shopId, '/settings'));
    return [
      for (final message in settings['orderMessages']! as List<Object?>)
        message! as String,
    ];
  });

  @override
  Future<List<PackOption>> searchPacks(String shopId, String query) => _guard(
    () async => packOptionsFromRows(
      await _api.getJson(
        _shop(shopId, '/catalogue/product-rows'),
        query: {
          'tab': 'ALL',
          'status': 'ACTIVE',
          'q': query,
          'show': 'all',
          'sort': 'name',
          'page': '1',
          'pageSize': '$_packSearchPageSize',
        },
      ),
    ),
  );

  Future<T> _guard<T>(Future<T> Function() call) async {
    try {
      return await call();
    } on ApiException catch (error) {
      if (error.code == 'shop_not_found') throw const ShopNotFound();
      if (error.status == 404) throw const OrderNotFound();
      if (error.status == 403) throw const OrdersForbidden();
      rethrow;
    }
  }
}
