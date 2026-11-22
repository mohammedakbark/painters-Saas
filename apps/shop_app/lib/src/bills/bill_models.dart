import '../customers/customer_models.dart';
import '../orders/order_models.dart';

/// What a bill entry did (BIL-001, D-062).
enum BillEntryKind {
  charge('CHARGE', 'Order'),
  adjustment('ADJUSTMENT', 'Return'),
  payment('PAYMENT', 'Payment'),
  refund('REFUND', 'Refund');

  const BillEntryKind(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static BillEntryKind fromApi(Object? value) => BillEntryKind.values
      .firstWhere((kind) => kind.apiValue == value, orElse: () => charge);
}

/// The Bills list's balance filter.
enum BillStatus {
  owing('owing', 'Owes you'),
  shopOwes('shop_owes', 'You owe'),
  settled('settled', 'Settled');

  const BillStatus(this.apiValue, this.label);

  final String apiValue;
  final String label;
}

/// One line of a customer's running bill. [amountPaise] is signed: positive
/// adds to what the customer owes, negative takes from it.
class BillEntry {
  const BillEntry({
    required this.id,
    required this.kind,
    required this.amountPaise,
    required this.createdAt,
    required this.orderId,
    required this.orderNumber,
    required this.siteLabel,
    required this.method,
    required this.note,
  });

  factory BillEntry.fromJson(Map<String, Object?> json) {
    final order = json['order'] as Map<String, Object?>?;
    return BillEntry(
      id: json['id']! as String,
      kind: BillEntryKind.fromApi(json['kind']),
      amountPaise: json['amountPaise']! as int,
      createdAt: DateTime.parse(json['createdAt']! as String),
      orderId: order?['id'] as String?,
      orderNumber: order?['number'] as int?,
      siteLabel: order?['siteLabel'] as String?,
      method: PaymentMethod.maybeFromApi(json['method']),
      note: json['note'] as String?,
    );
  }

  final String id;
  final BillEntryKind kind;
  final int amountPaise;
  final DateTime createdAt;
  final String? orderId;
  final int? orderNumber;
  final String? siteLabel;
  final PaymentMethod? method;
  final String? note;
}

/// What one of a painter's sites was billed.
typedef SiteBilled = ({String label, int billedPaise, int orderCount});

/// A customer's running bill with the shop (`GET …/customers/{id}/bill`).
class Bill {
  const Bill({
    required this.balancePaise,
    required this.sites,
    required this.entries,
    required this.page,
    required this.hasMore,
  });

  factory Bill.fromJson(Map<String, Object?> json) {
    final entries = json['entries']! as Map<String, Object?>;
    return Bill(
      balancePaise: json['balancePaise']! as int,
      sites: [
        for (final item
            in (json['sites']! as List<Object?>).cast<Map<String, Object?>>())
          (
            label: item['label']! as String,
            billedPaise: item['billedPaise']! as int,
            orderCount: item['orderCount']! as int,
          ),
      ],
      entries: [
        for (final item in entries['items']! as List<Object?>)
          BillEntry.fromJson(item! as Map<String, Object?>),
      ],
      page: entries['page']! as int,
      hasMore: entries['hasMore'] == true,
    );
  }

  /// Positive: the customer owes the shop; negative: the shop owes them.
  final int balancePaise;
  final List<SiteBilled> sites;
  final List<BillEntry> entries;
  final int page;
  final bool hasMore;

  /// The same bill with [more] older entries after these.
  Bill withOlder(Bill more) => Bill(
    balancePaise: more.balancePaise,
    sites: more.sites,
    entries: [
      ...entries,
      ...more.entries.where((entry) => entries.every((e) => e.id != entry.id)),
    ],
    page: more.page,
    hasMore: more.hasMore,
  );
}

/// One customer on the Bills list.
class BillListItem {
  const BillListItem({
    required this.customerId,
    required this.name,
    required this.phone,
    required this.kind,
    required this.balancePaise,
    required this.lastEntryAt,
  });

  factory BillListItem.fromJson(Map<String, Object?> json) {
    final customer = json['customer']! as Map<String, Object?>;
    return BillListItem(
      customerId: customer['id']! as String,
      name: customer['name']! as String,
      phone: customer['phone']! as String,
      kind: CustomerKind.fromApi(customer['kind']! as String),
      balancePaise: json['balancePaise']! as int,
      lastEntryAt: DateTime.parse(json['lastEntryAt']! as String),
    );
  }

  final String customerId;
  final String name;
  final String phone;
  final CustomerKind kind;
  final int balancePaise;
  final DateTime lastEntryAt;
}

class BillListPage {
  const BillListPage({
    required this.items,
    required this.owingPaise,
    required this.shopOwesPaise,
    required this.total,
    required this.page,
  });

  factory BillListPage.fromJson(Map<String, Object?> json) {
    final totals = json['totals']! as Map<String, Object?>;
    return BillListPage(
      items: [
        for (final item in json['items']! as List<Object?>)
          BillListItem.fromJson(item! as Map<String, Object?>),
      ],
      owingPaise: totals['owingPaise']! as int,
      shopOwesPaise: totals['shopOwesPaise']! as int,
      total: json['total']! as int,
      page: json['page']! as int,
    );
  }

  final List<BillListItem> items;
  final int owingPaise;
  final int shopOwesPaise;
  final int total;
  final int page;
}
