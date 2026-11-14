import 'package:shop_app/src/orders/order_models.dart';
import 'package:shop_app/src/orders/shop_orders_repository.dart';
import 'package:shop_app/src/shops/shop_access_repository.dart';

// Order test data and a fake that follows the API's rules (SHP-007).

OrderItem testItem(
  String id,
  String name, {
  int quantity = 2,
  int unitPricePaise = 45000,
  OrderItemStatus status = OrderItemStatus.ok,
  String? shopNote,
  String? substituteForId,
  int returnedQuantity = 0,
}) => OrderItem(
  id: id,
  productName: name,
  brandName: 'Demo Paints',
  packLabel: '1 L',
  shadeCode: null,
  shadeName: null,
  unitPricePaise: unitPricePaise,
  quantity: quantity,
  returnedQuantity: returnedQuantity,
  countedPaise: status == OrderItemStatus.ok
      ? (quantity - returnedQuantity) * unitPricePaise
      : 0,
  status: status,
  shopNote: shopNote,
  substituteForId: substituteForId,
);

/// An order the fake can change.
class FakeOrder {
  FakeOrder(
    this.id,
    this.number, {
    this.status = OrderStatus.newOrder,
    this.fulfilment = Fulfilment.pickup,
    this.customerName = 'Anil Kumar',
    this.phone = '+919876543210',
    this.paymentMethod,
    this.recordedByShop = false,
    this.cancelReason,
    List<OrderItem>? items,
    DateTime? placedAt,
  }) : items = items ?? [testItem('$id-1', 'Silk Emulsion')],
       placedAt = placedAt ?? DateTime.utc(2026, 11, 10, 5, number % 60);

  final String id;
  final int number;
  OrderStatus status;
  final Fulfilment fulfilment;
  final String customerName;
  final String phone;
  PaymentMethod? paymentMethod;
  final bool recordedByShop;
  String? cancelReason;
  List<OrderItem> items;
  final DateTime placedAt;

  bool get paid => paymentMethod != null;

  int get itemsPaise =>
      items.fold(0, (total, item) => total + item.countedPaise);

  int get deliveryPaise => fulfilment == Fulfilment.delivery ? 5000 : 0;

  List<OrderStatus> get nextSteps => switch (status) {
    OrderStatus.newOrder => [OrderStatus.packing, OrderStatus.cancelled],
    OrderStatus.packing => [
      if (fulfilment == Fulfilment.pickup)
        OrderStatus.readyForPickup
      else
        OrderStatus.outForDelivery,
      OrderStatus.cancelled,
    ],
    OrderStatus.readyForPickup ||
    OrderStatus.outForDelivery => [OrderStatus.completed],
    _ => const [],
  };

  bool get _handedOrReady => const {
    OrderStatus.readyForPickup,
    OrderStatus.outForDelivery,
    OrderStatus.completed,
  }.contains(status);

  OrderCustomer get customer => OrderCustomer(
    id: 'c-$id',
    name: customerName,
    phone: phone,
    hasApp: !recordedByShop,
  );

  OrderRow toRow() => OrderRow(
    id: id,
    number: number,
    placedAt: placedAt,
    status: status,
    fulfilment: fulfilment,
    customer: customer,
    siteLabel: null,
    recordedByShop: recordedByShop,
    itemCount: items.length,
    notAvailableCount: items
        .where((item) => item.status == OrderItemStatus.notAvailable)
        .length,
    totalPaise: itemsPaise + deliveryPaise,
    paid: paid,
  );

  OrderDetail toDetail() => OrderDetail(
    id: id,
    number: number,
    status: status,
    fulfilment: fulfilment,
    customer: customer,
    siteLabel: null,
    recordedByShop: recordedByShop,
    delivery: fulfilment == Fulfilment.delivery
        ? const OrderDelivery(
            address: '14 Beach Road, Kochi',
            latitude: 9.97,
            longitude: 76.28,
            distanceKm: 3.4,
          )
        : null,
    items: List.of(items),
    itemsPaise: itemsPaise,
    deliveryChargePaise: deliveryPaise,
    totalPaise: itemsPaise + deliveryPaise,
    paid: paid,
    paymentMethod: paymentMethod,
    paidAt: paid ? DateTime.utc(2026, 11, 10, 7) : null,
    cancelledByCustomer: status == OrderStatus.cancelled ? false : null,
    cancelReason: cancelReason,
    placedAt: placedAt,
    nextSteps: nextSteps,
    canEditItems:
        status == OrderStatus.newOrder || status == OrderStatus.packing,
    canRecordPayment: !paid && _handedOrReady,
    canReturnItems: status == OrderStatus.completed,
    events: [
      OrderEvent(
        id: 'e-$id',
        type: recordedByShop ? 'recorded' : 'placed',
        byCustomer: !recordedByShop,
        data: const {},
        createdAt: placedAt,
      ),
    ],
  );
}

bool _inTab(OrderTab tab, OrderStatus status) => switch (tab) {
  OrderTab.all => true,
  OrderTab.open => const {
    OrderStatus.newOrder,
    OrderStatus.packing,
    OrderStatus.readyForPickup,
    OrderStatus.outForDelivery,
  }.contains(status),
  OrderTab.ready =>
    status == OrderStatus.readyForPickup ||
        status == OrderStatus.outForDelivery,
  OrderTab.newOrders => status == OrderStatus.newOrder,
  OrderTab.packing => status == OrderStatus.packing,
  OrderTab.completed => status == OrderStatus.completed,
  OrderTab.cancelled => status == OrderStatus.cancelled,
};

class FakeShopOrdersRepository implements ShopOrdersRepository {
  FakeShopOrdersRepository({
    Map<String, List<FakeOrder>>? orders,
    this.messages = const ['Out of stock today', 'Shop closed for the day'],
    this.packs = const [],
  }) : orders = orders ?? {};

  final Map<String, List<FakeOrder>> orders;
  List<String> messages;
  List<PackOption> packs;

  /// When set, the next call fails with it (once).
  Object? nextError;
  final List<OrderListFilter> listed = [];
  final List<String> packSearches = [];

  void _fail() {
    final error = nextError;
    if (error != null) {
      nextError = null;
      throw error;
    }
  }

  List<FakeOrder> _shop(String shopId) =>
      orders[shopId] ?? (throw const ShopNotFound());

  FakeOrder _find(String shopId, String orderId) => _shop(shopId).firstWhere(
    (order) => order.id == orderId,
    orElse: () => throw const OrderNotFound(),
  );

  @override
  Future<OrderListPage> list(
    String shopId,
    OrderListFilter filter, {
    int page = 1,
  }) async {
    _fail();
    listed.add(filter);
    final query = filter.query.toLowerCase();
    final matching =
        _shop(shopId)
            .where(
              (order) =>
                  (query.isEmpty ||
                      '#${order.number}'.contains(query) ||
                      order.customerName.toLowerCase().contains(query)) &&
                  (filter.fulfilment == null ||
                      order.fulfilment == filter.fulfilment) &&
                  (filter.paid == null || order.paid == filter.paid),
            )
            .toList()
          ..sort((a, b) => b.placedAt.compareTo(a.placedAt));
    final inTab = matching
        .where((order) => _inTab(filter.tab, order.status))
        .toList();
    final start = (page - 1) * orderPageSize;
    return OrderListPage(
      items: [
        for (final order in inTab.skip(start).take(orderPageSize))
          order.toRow(),
      ],
      total: inTab.length,
      page: page,
      counts: {
        for (final tab in OrderTab.values)
          tab: matching.where((order) => _inTab(tab, order.status)).length,
      },
    );
  }

  @override
  Future<OrderSummary> summary(String shopId) async {
    _fail();
    final all = _shop(shopId);
    int count(OrderTab tab) =>
        all.where((order) => _inTab(tab, order.status)).length;
    final unpaid = all.where(
      (order) => !order.paid && order.toDetail().canRecordPayment,
    );
    return OrderSummary(
      newOrders: count(OrderTab.newOrders),
      packing: count(OrderTab.packing),
      ready: count(OrderTab.ready),
      unpaidCount: unpaid.length,
      unpaidPaise: unpaid.fold(
        0,
        (total, order) => total + order.itemsPaise + order.deliveryPaise,
      ),
      todaySalesPaise: all
          .where((order) => order.status == OrderStatus.completed)
          .fold(0, (total, order) => total + order.itemsPaise),
    );
  }

  @override
  Future<OrderDetail> fetch(String shopId, String orderId) async {
    _fail();
    return _find(shopId, orderId).toDetail();
  }

  @override
  Future<OrderDetail> changeStatus(
    String shopId,
    String orderId,
    OrderStatus to, {
    String? reason,
  }) async {
    _fail();
    final order = _find(shopId, orderId)
      ..status = to
      ..cancelReason = reason;
    return order.toDetail();
  }

  OrderDetail _replaceItem(
    String shopId,
    String orderId,
    String itemId,
    OrderItem Function(OrderItem item) change, {
    OrderItem? add,
  }) {
    final order = _find(shopId, orderId);
    order.items = [
      for (final item in order.items) item.id == itemId ? change(item) : item,
      ?add,
    ];
    return order.toDetail();
  }

  @override
  Future<OrderDetail> markNotAvailable(
    String shopId,
    String orderId,
    String itemId,
    String message,
  ) async {
    _fail();
    return _replaceItem(
      shopId,
      orderId,
      itemId,
      (item) => testItem(
        item.id,
        item.productName,
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
        status: OrderItemStatus.notAvailable,
        shopNote: message,
      ),
    );
  }

  final List<SubstituteOffer> offers = [];

  @override
  Future<OrderDetail> offerSubstitute(
    String shopId,
    String orderId,
    String itemId,
    SubstituteOffer offer,
  ) async {
    _fail();
    offers.add(offer);
    final pack = packs.firstWhere((pack) => pack.packId == offer.packId);
    return _replaceItem(
      shopId,
      orderId,
      itemId,
      (item) => item,
      add: testItem(
        'sub-$itemId',
        pack.productName,
        quantity: offer.quantity,
        unitPricePaise: pack.pricePaise,
        status: OrderItemStatus.substituteOffered,
        shopNote: offer.message,
        substituteForId: itemId,
      ),
    );
  }

  @override
  Future<OrderDetail> recordPayment(
    String shopId,
    String orderId,
    PaymentMethod method,
  ) async {
    _fail();
    final order = _find(shopId, orderId)..paymentMethod = method;
    return order.toDetail();
  }

  @override
  Future<OrderDetail> returnItem(
    String shopId,
    String orderId,
    String itemId, {
    required int quantity,
    required String reason,
  }) async {
    _fail();
    return _replaceItem(
      shopId,
      orderId,
      itemId,
      (item) => testItem(
        item.id,
        item.productName,
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
        returnedQuantity: item.returnedQuantity + quantity,
      ),
    );
  }

  @override
  Future<List<String>> orderMessages(String shopId) async => messages;

  @override
  Future<List<PackOption>> searchPacks(String shopId, String query) async {
    _fail();
    packSearches.add(query);
    return [
      for (final pack in packs)
        if (pack.productName.toLowerCase().contains(query.toLowerCase())) pack,
    ];
  }
}
