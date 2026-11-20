import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../providers.dart';
import 'checkout.dart';

/// The order steps (D-053) with the words the app shows.
enum OrderStatus {
  newOrder('NEW', 'New'),
  packing('PACKING', 'Packing'),
  readyForPickup('READY_FOR_PICKUP', 'Ready for pickup'),
  outForDelivery('OUT_FOR_DELIVERY', 'Out for delivery'),
  completed('COMPLETED', 'Completed'),
  cancelled('CANCELLED', 'Cancelled');

  const OrderStatus(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static OrderStatus fromApi(String value) => OrderStatus.values.firstWhere(
    (status) => status.apiValue == value,
    orElse: () => OrderStatus.newOrder,
  );
}

enum OrderItemStatus {
  ok('OK'),
  notAvailable('NOT_AVAILABLE'),
  substituted('SUBSTITUTED'),
  substituteOffered('SUBSTITUTE_OFFERED'),
  substituteDeclined('SUBSTITUTE_DECLINED');

  const OrderItemStatus(this.apiValue);

  final String apiValue;

  static OrderItemStatus fromApi(String value) => OrderItemStatus.values
      .firstWhere((s) => s.apiValue == value, orElse: () => OrderItemStatus.ok);
}

/// One order in My Orders.
class MyOrderSummary {
  const MyOrderSummary({
    required this.id,
    required this.number,
    required this.shopId,
    required this.shopName,
    required this.placedAt,
    required this.status,
    required this.fulfilment,
    required this.siteLabel,
    required this.itemCount,
    required this.totalPaise,
    required this.needsAnswer,
  });

  factory MyOrderSummary.fromJson(Map<String, Object?> json) {
    final shop = json['shop']! as Map<String, Object?>;
    return MyOrderSummary(
      id: json['id']! as String,
      number: json['number']! as int,
      shopId: shop['id']! as String,
      shopName: shop['name']! as String,
      placedAt: DateTime.parse(json['placedAt']! as String),
      status: OrderStatus.fromApi(json['status']! as String),
      fulfilment: Fulfilment.fromApi(json['fulfilment']! as String),
      siteLabel: json['siteLabel'] as String?,
      itemCount: json['itemCount']! as int,
      totalPaise: json['totalPaise']! as int,
      needsAnswer: json['needsAnswer'] == true,
    );
  }

  final String id;
  final int number;
  final String shopId;
  final String shopName;
  final DateTime placedAt;
  final OrderStatus status;
  final Fulfilment fulfilment;
  final String? siteLabel;
  final int itemCount;
  final int totalPaise;

  /// A substitute waits for the person's answer.
  final bool needsAnswer;
}

class MyOrderItem {
  const MyOrderItem({
    required this.id,
    required this.productName,
    required this.brandName,
    required this.packLabel,
    required this.shadeCode,
    required this.shadeName,
    required this.unitPricePaise,
    required this.quantity,
    required this.returnedQuantity,
    required this.status,
    required this.shopNote,
    required this.substituteForId,
  });

  factory MyOrderItem.fromJson(Map<String, Object?> json) => MyOrderItem(
    id: json['id']! as String,
    productName: json['productName']! as String,
    brandName: json['brandName'] as String?,
    packLabel: json['packLabel']! as String,
    shadeCode: json['shadeCode'] as String?,
    shadeName: json['shadeName'] as String?,
    unitPricePaise: json['unitPricePaise']! as int,
    quantity: json['quantity']! as int,
    returnedQuantity: json['returnedQuantity'] as int? ?? 0,
    status: OrderItemStatus.fromApi(json['status']! as String),
    shopNote: json['shopNote'] as String?,
    substituteForId: json['substituteForId'] as String?,
  );

  final String id;
  final String productName;
  final String? brandName;
  final String packLabel;
  final String? shadeCode;
  final String? shadeName;
  final int unitPricePaise;
  final int quantity;
  final int returnedQuantity;
  final OrderItemStatus status;

  /// The shop's message for a not-available item.
  final String? shopNote;
  final String? substituteForId;

  int get linePaise => unitPricePaise * (quantity - returnedQuantity);
}

/// One order with its items, totals and steps.
class MyOrder {
  const MyOrder({
    required this.id,
    required this.number,
    required this.shopId,
    required this.shopName,
    required this.status,
    required this.fulfilment,
    required this.siteLabel,
    required this.deliveryAddress,
    required this.items,
    required this.itemsPaise,
    required this.deliveryPaise,
    required this.totalPaise,
    required this.paid,
    required this.paymentMethod,
    required this.cancelledByShop,
    required this.cancelReason,
    required this.placedAt,
    required this.canCancel,
  });

  factory MyOrder.fromJson(Map<String, Object?> json) {
    final shop = json['shop']! as Map<String, Object?>;
    final totals = json['totals']! as Map<String, Object?>;
    final payment = json['payment']! as Map<String, Object?>;
    final cancelled = json['cancelled'] as Map<String, Object?>?;
    return MyOrder(
      id: json['id']! as String,
      number: json['number']! as int,
      shopId: shop['id']! as String,
      shopName: shop['name']! as String,
      status: OrderStatus.fromApi(json['status']! as String),
      fulfilment: Fulfilment.fromApi(json['fulfilment']! as String),
      siteLabel: json['siteLabel'] as String?,
      deliveryAddress: json['deliveryAddress'] as String?,
      items: [
        for (final item in json['items']! as List<Object?>)
          MyOrderItem.fromJson(item! as Map<String, Object?>),
      ],
      itemsPaise: totals['itemsPaise']! as int,
      deliveryPaise: totals['deliveryPaise']! as int,
      totalPaise: totals['totalPaise']! as int,
      paid: payment['status'] == 'PAID',
      paymentMethod: payment['method'] as String?,
      cancelledByShop: cancelled?['by'] == 'SHOP',
      cancelReason: cancelled?['reason'] as String?,
      placedAt: DateTime.parse(json['placedAt']! as String),
      canCancel: json['canCancel'] == true,
    );
  }

  final String id;
  final int number;
  final String shopId;
  final String shopName;
  final OrderStatus status;
  final Fulfilment fulfilment;
  final String? siteLabel;
  final String? deliveryAddress;
  final List<MyOrderItem> items;
  final int itemsPaise;
  final int deliveryPaise;
  final int totalPaise;
  final bool paid;

  /// CASH, UPI or BANK_TRANSFER once paid.
  final String? paymentMethod;
  final bool cancelledByShop;
  final String? cancelReason;
  final DateTime placedAt;
  final bool canCancel;

  /// Suggestions waiting for an answer, each with the line it replaces.
  List<({MyOrderItem offer, MyOrderItem? original})> get openSubstitutes => [
    if (status != OrderStatus.cancelled)
      for (final item in items)
        if (item.status == OrderItemStatus.substituteOffered)
          (
            offer: item,
            original: items
                .where((other) => other.id == item.substituteForId)
                .firstOrNull,
          ),
  ];
}

/// What checkout sends (CUS-006).
class PlaceOrderDraft {
  const PlaceOrderDraft({
    required this.shopId,
    required this.fulfilment,
    required this.lines,
    required this.expectedTotalPaise,
    required this.clientRequestId,
    this.siteId,
    this.deliveryLocationId,
  });

  final String shopId;
  final Fulfilment fulfilment;
  final List<
    ({String packId, int quantity, String? shadeCode, String? shadeName})
  >
  lines;
  final int expectedTotalPaise;
  final String clientRequestId;
  final String? siteId;
  final String? deliveryLocationId;

  Map<String, Object?> toJson() => {
    'shopId': shopId,
    'fulfilment': fulfilment.apiValue,
    'siteId': ?siteId,
    'deliveryLocationId': ?deliveryLocationId,
    'items': [
      for (final line in lines)
        {
          'shopProductPackId': line.packId,
          'quantity': line.quantity,
          'shadeCode': ?line.shadeCode,
          'shadeName': ?line.shadeName,
        },
    ],
    'expectedTotalPaise': expectedTotalPaise,
    'clientRequestId': clientRequestId,
  };
}

/// The person's orders (`/v1/me/orders`). Throws [ApiException].
abstract class MyOrdersRepository {
  Future<({String id, int number})> place(PlaceOrderDraft draft);

  Future<({List<MyOrderSummary> items, bool hasMore})> list({int page = 1});

  Future<MyOrder> get(String orderId);

  Future<MyOrder> cancel(String orderId);

  Future<MyOrder> answerSubstitute(
    String orderId,
    String itemId, {
    required bool accept,
  });
}

class ApiMyOrdersRepository implements MyOrdersRepository {
  const ApiMyOrdersRepository(this._api);

  static const _path = '/v1/me/orders';

  final ApiClient _api;

  static String _order(String orderId) =>
      '$_path/${Uri.encodeComponent(orderId)}';

  @override
  Future<({String id, int number})> place(PlaceOrderDraft draft) async {
    final json = await _api.postJson(_path, draft.toJson());
    return (id: json['id']! as String, number: json['number']! as int);
  }

  @override
  Future<({List<MyOrderSummary> items, bool hasMore})> list({
    int page = 1,
  }) async {
    final json = await _api.getJson(_path, query: {'page': '$page'});
    return (
      items: [
        for (final item in json['items']! as List<Object?>)
          MyOrderSummary.fromJson(item! as Map<String, Object?>),
      ],
      hasMore: json['hasMore'] == true,
    );
  }

  @override
  Future<MyOrder> get(String orderId) async =>
      MyOrder.fromJson(await _api.getJson(_order(orderId)));

  @override
  Future<MyOrder> cancel(String orderId) async => MyOrder.fromJson(
    await _api.postJson('${_order(orderId)}/cancel', const {}),
  );

  @override
  Future<MyOrder> answerSubstitute(
    String orderId,
    String itemId, {
    required bool accept,
  }) async => MyOrder.fromJson(
    await _api.postJson(
      '${_order(orderId)}/items/${Uri.encodeComponent(itemId)}/substitute',
      {'accept': accept},
    ),
  );
}

/// Overridden in `main()` and in tests.
final myOrdersRepositoryProvider = Provider<MyOrdersRepository>(
  (ref) => throw UnimplementedError('myOrdersRepositoryProvider is overridden'),
);

/// My Orders: pages of 20, newest first, with Load more.
class MyOrdersState {
  const MyOrdersState({
    this.items = const [],
    this.page = 0,
    this.hasMore = false,
    this.loadingMore = false,
  });

  final List<MyOrderSummary> items;
  final int page;
  final bool hasMore;
  final bool loadingMore;
}

final myOrdersProvider =
    AsyncNotifierProvider.autoDispose<MyOrdersNotifier, MyOrdersState>(
      MyOrdersNotifier.new,
      retry: noRetry,
    );

class MyOrdersNotifier extends AsyncNotifier<MyOrdersState> {
  MyOrdersRepository get _repository => ref.read(myOrdersRepositoryProvider);

  @override
  Future<MyOrdersState> build() async {
    final first = await _repository.list();
    return MyOrdersState(items: first.items, page: 1, hasMore: first.hasMore);
  }

  /// Throws [ApiException]; the list stays as it was.
  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;
    state = AsyncData(
      MyOrdersState(
        items: current.items,
        page: current.page,
        hasMore: current.hasMore,
        loadingMore: true,
      ),
    );
    try {
      final next = await _repository.list(page: current.page + 1);
      state = AsyncData(
        MyOrdersState(
          items: [...current.items, ...next.items],
          page: current.page + 1,
          hasMore: next.hasMore,
        ),
      );
    } on Object {
      state = AsyncData(current);
      rethrow;
    }
  }
}

/// One order; cancelling and answering a substitute update it in place.
final myOrderProvider = AsyncNotifierProvider.autoDispose
    .family<MyOrderNotifier, MyOrder, String>(
      MyOrderNotifier.new,
      retry: noRetry,
    );

class MyOrderNotifier extends AsyncNotifier<MyOrder> {
  MyOrderNotifier(this.orderId);

  final String orderId;

  MyOrdersRepository get _repository => ref.read(myOrdersRepositoryProvider);

  @override
  Future<MyOrder> build() => _repository.get(orderId);

  /// Throws [ApiException].
  Future<void> cancel() async {
    state = AsyncData(await _repository.cancel(orderId));
    ref.invalidate(myOrdersProvider);
  }

  /// Throws [ApiException].
  Future<void> answer(String itemId, {required bool accept}) async {
    state = AsyncData(
      await _repository.answerSubstitute(orderId, itemId, accept: accept),
    );
    ref.invalidate(myOrdersProvider);
  }
}
