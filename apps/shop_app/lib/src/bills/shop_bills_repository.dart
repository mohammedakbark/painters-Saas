import '../api/api_client.dart';
import '../customers/shop_customers_repository.dart';
import '../orders/order_models.dart';
import '../orders/shop_orders_repository.dart';
import '../shops/shop_access_repository.dart';
import 'bill_models.dart';

/// Customers per page of the Bills list (an API page size).
const billPageSize = 25;

/// The Bills list's search and balance filter.
typedef BillListFilter = ({String query, BillStatus? status});

/// A payment the shop takes or money it pays back (BIL-001).
typedef BillMoney = ({
  int amountPaise,
  PaymentMethod method,
  String? note,
  String requestId,
});

/// Running bills (BIL-001 API, D-062). The API checks membership, the
/// payments or money-figures permission and that the customer is this
/// shop's. Throws [ShopNotFound], [CustomerNotFound], [OrdersForbidden] or
/// [ApiException] (409 with the message on `amountPaise` when the amount is
/// more than is owed).
abstract interface class ShopBillsRepository {
  Future<BillListPage> list(
    String shopId,
    BillListFilter filter, {
    int page = 1,
  });

  Future<Bill> fetch(String shopId, String customerId, {int page = 1});

  /// Records a payment ([refund] false) or a refund; returns the bill.
  Future<Bill> record(
    String shopId,
    String customerId,
    BillMoney money, {
    required bool refund,
  });
}

class ApiShopBillsRepository implements ShopBillsRepository {
  const ApiShopBillsRepository(this._api);

  final ApiClient _api;

  String _shop(String shopId) => '/v1/shops/${Uri.encodeComponent(shopId)}';
  String _bill(String shopId, String customerId) =>
      '${_shop(shopId)}/customers/${Uri.encodeComponent(customerId)}/bill';

  @override
  Future<BillListPage> list(
    String shopId,
    BillListFilter filter, {
    int page = 1,
  }) => _guard(
    () async => BillListPage.fromJson(
      await _api.getJson(
        '${_shop(shopId)}/bills',
        query: {
          if (filter.query.isNotEmpty) 'q': filter.query,
          'status': ?filter.status?.apiValue,
          'page': '$page',
          'pageSize': '$billPageSize',
        },
      ),
    ),
  );

  @override
  Future<Bill> fetch(String shopId, String customerId, {int page = 1}) =>
      _guard(
        () async => Bill.fromJson(
          await _api.getJson(
            _bill(shopId, customerId),
            query: {'page': '$page'},
          ),
        ),
      );

  @override
  Future<Bill> record(
    String shopId,
    String customerId,
    BillMoney money, {
    required bool refund,
  }) => _guard(
    () async => Bill.fromJson(
      await _api.postJson(
        '${_bill(shopId, customerId)}/${refund ? 'refunds' : 'payments'}',
        {
          'amountPaise': money.amountPaise,
          'method': money.method.apiValue,
          'note': money.note,
          'clientRequestId': money.requestId,
        },
      ),
    ),
  );

  Future<T> _guard<T>(Future<T> Function() call) async {
    try {
      return await call();
    } on ApiException catch (error) {
      if (error.code == 'shop_not_found') throw const ShopNotFound();
      if (error.status == 403) throw const OrdersForbidden();
      if (error.status == 404) throw const CustomerNotFound();
      rethrow;
    }
  }
}
