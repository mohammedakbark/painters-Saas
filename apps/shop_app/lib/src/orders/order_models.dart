// Orders as the Shop App reads them (ORD-001 API). Mirrors `OrderListPage`,
// `OrderDetail` and `OrderSummary` in apps/api/src/orders/orders.schemas.ts.
// Money is integer paise.

/// The five steps of an order, plus cancelled (D-053).
enum OrderStatus {
  newOrder('NEW'),
  packing('PACKING'),
  readyForPickup('READY_FOR_PICKUP'),
  outForDelivery('OUT_FOR_DELIVERY'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  const OrderStatus(this.apiValue);

  final String apiValue;

  static OrderStatus fromApi(String value) =>
      OrderStatus.values.firstWhere((status) => status.apiValue == value);
}

enum Fulfilment {
  pickup('PICKUP'),
  delivery('DELIVERY');

  const Fulfilment(this.apiValue);

  final String apiValue;

  static Fulfilment fromApi(String value) =>
      value == 'DELIVERY' ? Fulfilment.delivery : Fulfilment.pickup;
}

enum PaymentMethod {
  cash('CASH'),
  upi('UPI'),
  bankTransfer('BANK_TRANSFER');

  const PaymentMethod(this.apiValue);

  final String apiValue;

  static PaymentMethod? maybeFromApi(Object? value) {
    for (final method in PaymentMethod.values) {
      if (method.apiValue == value) return method;
    }
    return null;
  }
}

enum OrderItemStatus {
  ok('OK'),
  notAvailable('NOT_AVAILABLE'),
  substituted('SUBSTITUTED'),
  substituteOffered('SUBSTITUTE_OFFERED'),
  substituteDeclined('SUBSTITUTE_DECLINED');

  const OrderItemStatus(this.apiValue);

  final String apiValue;

  static OrderItemStatus fromApi(String value) =>
      OrderItemStatus.values.firstWhere((status) => status.apiValue == value);
}

/// The tabs of the orders list; [apiValue] is the API's `status` filter.
enum OrderTab {
  open('open'),
  newOrders('NEW'),
  packing('PACKING'),
  ready('ready'),
  completed('COMPLETED'),
  cancelled('CANCELLED'),
  all('all');

  const OrderTab(this.apiValue);

  final String apiValue;

  static OrderTab fromApi(String? value) => OrderTab.values.firstWhere(
    (tab) => tab.apiValue == value,
    orElse: () => OrderTab.open,
  );
}

/// The shop's own record of the person who ordered (D-054).
class OrderCustomer {
  const OrderCustomer({
    required this.id,
    required this.name,
    required this.phone,
    required this.hasApp,
  });

  factory OrderCustomer.fromJson(Map<String, Object?> json) => OrderCustomer(
    id: json['id']! as String,
    name: json['name']! as String,
    phone: json['phone']! as String,
    hasApp: json['hasApp']! as bool,
  );

  final String id;
  final String name;

  /// E.164, for example +919876543210.
  final String phone;

  /// Whether the customer orders through the app.
  final bool hasApp;
}

int _int(Object? value) => (value! as num).toInt();

DateTime? _date(Object? value) =>
    value is String ? DateTime.parse(value) : null;

/// One order in the list.
class OrderRow {
  const OrderRow({
    required this.id,
    required this.number,
    required this.placedAt,
    required this.status,
    required this.fulfilment,
    required this.customer,
    required this.siteLabel,
    required this.recordedByShop,
    required this.itemCount,
    required this.notAvailableCount,
    required this.totalPaise,
    required this.paid,
  });

  factory OrderRow.fromJson(Map<String, Object?> json) => OrderRow(
    id: json['id']! as String,
    number: _int(json['number']),
    placedAt: DateTime.parse(json['placedAt']! as String),
    status: OrderStatus.fromApi(json['status']! as String),
    fulfilment: Fulfilment.fromApi(json['fulfilment']! as String),
    customer: OrderCustomer.fromJson(json['customer']! as Map<String, Object?>),
    siteLabel: json['siteLabel'] as String?,
    recordedByShop: json['source'] == 'SHOP',
    itemCount: _int(json['itemCount']),
    notAvailableCount: _int(json['notAvailableCount']),
    totalPaise: _int(json['totalPaise']),
    paid: json['paymentStatus'] == 'PAID',
  );

  final String id;
  final int number;
  final DateTime placedAt;
  final OrderStatus status;
  final Fulfilment fulfilment;
  final OrderCustomer customer;
  final String? siteLabel;
  final bool recordedByShop;
  final int itemCount;
  final int notAvailableCount;
  final int totalPaise;
  final bool paid;
}

/// One page of the orders list, with the count of each tab.
class OrderListPage {
  const OrderListPage({
    required this.items,
    required this.total,
    required this.page,
    required this.counts,
  });

  factory OrderListPage.fromJson(Map<String, Object?> json) {
    final counts = json['counts']! as Map<String, Object?>;
    return OrderListPage(
      items: [
        for (final item in json['items']! as List<Object?>)
          OrderRow.fromJson(item! as Map<String, Object?>),
      ],
      total: _int(json['total']),
      page: _int(json['page']),
      counts: {
        for (final tab in OrderTab.values)
          tab: tab == OrderTab.ready
              ? _int(counts['ready'])
              : _int(counts[tab.apiValue]),
      },
    );
  }

  final List<OrderRow> items;

  /// Orders in this tab with the search and filters applied.
  final int total;
  final int page;
  final Map<OrderTab, int> counts;
}

/// One line of an order: a snapshot of the product, pack and price.
class OrderItem {
  const OrderItem({
    required this.id,
    required this.productName,
    required this.brandName,
    required this.packLabel,
    required this.shadeCode,
    required this.shadeName,
    required this.unitPricePaise,
    required this.quantity,
    required this.returnedQuantity,
    required this.countedPaise,
    required this.status,
    required this.shopNote,
    required this.substituteForId,
  });

  factory OrderItem.fromJson(Map<String, Object?> json) => OrderItem(
    id: json['id']! as String,
    productName: json['productName']! as String,
    brandName: json['brandName'] as String?,
    packLabel: json['packLabel']! as String,
    shadeCode: json['shadeCode'] as String?,
    shadeName: json['shadeName'] as String?,
    unitPricePaise: _int(json['unitPricePaise']),
    quantity: _int(json['quantity']),
    returnedQuantity: _int(json['returnedQuantity']),
    countedPaise: _int(json['countedPaise']),
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

  /// What this line adds to the total (0 unless the line counts).
  final int countedPaise;
  final OrderItemStatus status;

  /// The shop's message to the customer about this line.
  final String? shopNote;

  /// Set on a substitute: the line it replaces.
  final String? substituteForId;

  /// Units that can still be returned.
  int get returnableQuantity => quantity - returnedQuantity;
}

/// Where a delivery order goes.
class OrderDelivery {
  const OrderDelivery({
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.distanceKm,
  });

  factory OrderDelivery.fromJson(Map<String, Object?> json) => OrderDelivery(
    address: json['address']! as String,
    latitude: (json['latitude'] as num?)?.toDouble(),
    longitude: (json['longitude'] as num?)?.toDouble(),
    distanceKm: (json['distanceKm'] as num?)?.toDouble(),
  );

  final String address;

  /// Null for a delivery the shop recorded without a map pin (ORD-004).
  final double? latitude;
  final double? longitude;
  final double? distanceKm;
}

/// One entry of the order's timeline.
class OrderEvent {
  const OrderEvent({
    required this.id,
    required this.type,
    required this.byCustomer,
    required this.data,
    required this.createdAt,
  });

  factory OrderEvent.fromJson(Map<String, Object?> json) => OrderEvent(
    id: json['id']! as String,
    type: json['type']! as String,
    byCustomer: json['actor'] == 'CUSTOMER',
    data: json['data'] as Map<String, Object?>? ?? const {},
    createdAt: DateTime.parse(json['createdAt']! as String),
  );

  final String id;
  final String type;
  final bool byCustomer;
  final Map<String, Object?> data;
  final DateTime createdAt;
}

/// One order with everything the shop needs to handle it.
class OrderDetail {
  const OrderDetail({
    required this.id,
    required this.number,
    required this.status,
    required this.fulfilment,
    required this.customer,
    required this.siteLabel,
    required this.recordedByShop,
    required this.delivery,
    required this.items,
    required this.itemsPaise,
    required this.deliveryChargePaise,
    required this.totalPaise,
    required this.paid,
    required this.paymentMethod,
    required this.paidAt,
    required this.cancelledByCustomer,
    required this.cancelReason,
    required this.placedAt,
    required this.nextSteps,
    required this.canEditItems,
    required this.canRecordPayment,
    required this.canReturnItems,
    required this.events,
  });

  factory OrderDetail.fromJson(Map<String, Object?> json) {
    final delivery = json['delivery'];
    final totals = json['totals']! as Map<String, Object?>;
    final payment = json['payment']! as Map<String, Object?>;
    final cancelled = json['cancelled'];
    return OrderDetail(
      id: json['id']! as String,
      number: _int(json['number']),
      status: OrderStatus.fromApi(json['status']! as String),
      fulfilment: Fulfilment.fromApi(json['fulfilment']! as String),
      customer: OrderCustomer.fromJson(
        json['customer']! as Map<String, Object?>,
      ),
      siteLabel: json['siteLabel'] as String?,
      recordedByShop: json['source'] == 'SHOP',
      delivery: delivery is Map<String, Object?>
          ? OrderDelivery.fromJson(delivery)
          : null,
      items: [
        for (final item in json['items']! as List<Object?>)
          OrderItem.fromJson(item! as Map<String, Object?>),
      ],
      itemsPaise: _int(totals['itemsPaise']),
      deliveryChargePaise: _int(totals['deliveryChargePaise']),
      totalPaise: _int(totals['totalPaise']),
      paid: payment['status'] == 'PAID',
      paymentMethod: PaymentMethod.maybeFromApi(payment['method']),
      paidAt: _date(payment['paidAt']),
      cancelledByCustomer: cancelled is Map<String, Object?>
          ? cancelled['by'] == 'CUSTOMER'
          : null,
      cancelReason: cancelled is Map<String, Object?>
          ? cancelled['reason'] as String?
          : null,
      placedAt: DateTime.parse(json['placedAt']! as String),
      nextSteps: [
        for (final step in json['nextSteps']! as List<Object?>)
          OrderStatus.fromApi(step! as String),
      ],
      canEditItems: json['canEditItems']! as bool,
      canRecordPayment: json['canRecordPayment']! as bool,
      canReturnItems: json['canReturnItems']! as bool,
      events: [
        for (final event in json['events']! as List<Object?>)
          OrderEvent.fromJson(event! as Map<String, Object?>),
      ],
    );
  }

  final String id;
  final int number;
  final OrderStatus status;
  final Fulfilment fulfilment;
  final OrderCustomer customer;
  final String? siteLabel;
  final bool recordedByShop;
  final OrderDelivery? delivery;
  final List<OrderItem> items;
  final int itemsPaise;
  final int deliveryChargePaise;
  final int totalPaise;
  final bool paid;
  final PaymentMethod? paymentMethod;
  final DateTime? paidAt;

  /// Null unless the order is cancelled.
  final bool? cancelledByCustomer;
  final String? cancelReason;
  final DateTime placedAt;

  /// Steps the shop can take now (the API decides).
  final List<OrderStatus> nextSteps;
  final bool canEditItems;
  final bool canRecordPayment;
  final bool canReturnItems;
  final List<OrderEvent> events;

  /// The step for the main button: never cancelling.
  OrderStatus? get nextStep {
    for (final step in nextSteps) {
      if (step != OrderStatus.cancelled) return step;
    }
    return null;
  }

  bool get canCancel => nextSteps.contains(OrderStatus.cancelled);
}

/// Order figures for the shop home (ORD-003).
class OrderSummary {
  const OrderSummary({
    required this.newOrders,
    required this.packing,
    required this.ready,
    required this.unpaidCount,
    required this.unpaidPaise,
    required this.todaySalesPaise,
  });

  factory OrderSummary.fromJson(Map<String, Object?> json) {
    final unpaid = json['unpaid']! as Map<String, Object?>;
    final today = json['today']! as Map<String, Object?>;
    return OrderSummary(
      newOrders: _int(json['new']),
      packing: _int(json['packing']),
      ready: _int(json['ready']),
      unpaidCount: _int(unpaid['count']),
      unpaidPaise: _int(unpaid['totalPaise']),
      todaySalesPaise: _int(today['salesPaise']),
    );
  }

  final int newOrders;
  final int packing;

  /// Ready for pickup plus out for delivery.
  final int ready;
  final int unpaidCount;
  final int unpaidPaise;

  /// Totals of orders completed today (Indian day).
  final int todaySalesPaise;
}

/// An available pack size of the shop, offered as a substitute.
class PackOption {
  const PackOption({
    required this.packId,
    required this.productName,
    required this.brandName,
    required this.packLabel,
    required this.pricePaise,
  });

  final String packId;
  final String productName;
  final String? brandName;
  final String packLabel;
  final int pricePaise;
}

/// The available pack sizes in one page of the product list
/// (`catalogue/product-rows`), skipping products the platform removed.
List<PackOption> packOptionsFromRows(Map<String, Object?> json) => [
  for (final row in json['items']! as List<Object?>)
    if (row case final Map<String, Object?> row
        when row['catalogueActive'] != false)
      for (final pack in row['packs']! as List<Object?>)
        if (pack case final Map<String, Object?> pack
            when pack['available'] == true)
          PackOption(
            packId: pack['id']! as String,
            productName: row['name']! as String,
            brandName: row['brandName'] as String?,
            packLabel: pack['label']! as String,
            pricePaise: _int(pack['pricePaise']),
          ),
];
