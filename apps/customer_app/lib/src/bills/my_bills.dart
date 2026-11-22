import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../providers.dart';

/// What a bill entry did (BIL-001, D-062).
enum BillEntryKind {
  charge('CHARGE', 'Order'),
  adjustment('ADJUSTMENT', 'Return'),
  payment('PAYMENT', 'Payment'),
  refund('REFUND', 'Refund from the shop');

  const BillEntryKind(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static BillEntryKind fromApi(Object? value) => BillEntryKind.values
      .firstWhere((kind) => kind.apiValue == value, orElse: () => charge);
}

/// "Cash", "UPI" or "Bank transfer".
String paymentMethodLabel(String method) => switch (method) {
  'CASH' => 'Cash',
  'UPI' => 'UPI',
  'BANK_TRANSFER' => 'Bank transfer',
  _ => method,
};

/// The person's bill with one shop on "My bills" (BIL-003).
class MyBillSummary {
  const MyBillSummary({
    required this.shopId,
    required this.shopName,
    required this.balancePaise,
    required this.lastEntryAt,
  });

  factory MyBillSummary.fromJson(Map<String, Object?> json) {
    final shop = json['shop']! as Map<String, Object?>;
    return MyBillSummary(
      shopId: shop['id']! as String,
      shopName: shop['name']! as String,
      balancePaise: json['balancePaise']! as int,
      lastEntryAt: DateTime.parse(json['lastEntryAt']! as String),
    );
  }

  final String shopId;
  final String shopName;

  /// Positive: the person owes the shop; negative: the shop owes them.
  final int balancePaise;
  final DateTime lastEntryAt;
}

class MyBillEntry {
  const MyBillEntry({
    required this.id,
    required this.kind,
    required this.amountPaise,
    required this.createdAt,
    required this.orderId,
    required this.orderNumber,
    required this.siteLabel,
    required this.method,
  });

  factory MyBillEntry.fromJson(Map<String, Object?> json) {
    final order = json['order'] as Map<String, Object?>?;
    return MyBillEntry(
      id: json['id']! as String,
      kind: BillEntryKind.fromApi(json['kind']),
      amountPaise: json['amountPaise']! as int,
      createdAt: DateTime.parse(json['createdAt']! as String),
      orderId: order?['id'] as String?,
      orderNumber: order?['number'] as int?,
      siteLabel: order?['siteLabel'] as String?,
      method: json['method'] as String?,
    );
  }

  final String id;
  final BillEntryKind kind;

  /// Signed: positive adds to what the person owes.
  final int amountPaise;
  final DateTime createdAt;
  final String? orderId;
  final int? orderNumber;
  final String? siteLabel;
  final String? method;
}

typedef SiteBilled = ({String label, int billedPaise, int orderCount});

/// The person's bill with one shop (`GET /v1/me/bills/{shopId}`).
class MyBill {
  const MyBill({
    required this.shopId,
    required this.shopName,
    required this.balancePaise,
    required this.sites,
    required this.entries,
    required this.page,
    required this.hasMore,
  });

  factory MyBill.fromJson(Map<String, Object?> json) {
    final shop = json['shop']! as Map<String, Object?>;
    final entries = json['entries']! as Map<String, Object?>;
    return MyBill(
      shopId: shop['id']! as String,
      shopName: shop['name']! as String,
      balancePaise: json['balancePaise']! as int,
      sites: [
        for (final site
            in (json['sites']! as List<Object?>).cast<Map<String, Object?>>())
          (
            label: site['label']! as String,
            billedPaise: site['billedPaise']! as int,
            orderCount: site['orderCount']! as int,
          ),
      ],
      entries: [
        for (final item in entries['items']! as List<Object?>)
          MyBillEntry.fromJson(item! as Map<String, Object?>),
      ],
      page: entries['page']! as int,
      hasMore: entries['hasMore'] == true,
    );
  }

  final String shopId;
  final String shopName;
  final int balancePaise;
  final List<SiteBilled> sites;
  final List<MyBillEntry> entries;
  final int page;
  final bool hasMore;

  MyBill withOlder(MyBill more) => MyBill(
    shopId: shopId,
    shopName: shopName,
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

/// The person's own bills (BIL-003 API). Every method throws [ApiException]
/// (404 `bill_not_found` when there is no bill with that shop).
abstract class MyBillsRepository {
  Future<List<MyBillSummary>> list();

  Future<MyBill> fetch(String shopId, {int page = 1});
}

class ApiMyBillsRepository implements MyBillsRepository {
  const ApiMyBillsRepository(this._api);

  static const _path = '/v1/me/bills';

  final ApiClient _api;

  @override
  Future<List<MyBillSummary>> list() async {
    final json = await _api.getJson(_path);
    return [
      for (final item in json['items']! as List<Object?>)
        MyBillSummary.fromJson(item! as Map<String, Object?>),
    ];
  }

  @override
  Future<MyBill> fetch(String shopId, {int page = 1}) async => MyBill.fromJson(
    await _api.getJson(
      '$_path/${Uri.encodeComponent(shopId)}',
      query: {'page': '$page'},
    ),
  );
}

/// Overridden in `main()` and in tests.
final myBillsRepositoryProvider = Provider<MyBillsRepository>(
  (ref) => throw UnimplementedError('myBillsRepositoryProvider is overridden'),
);

/// The person's bill with each shop, most owed first.
final myBillsProvider = FutureProvider.autoDispose<List<MyBillSummary>>(
  (ref) => ref.watch(myBillsRepositoryProvider).list(),
  retry: noRetry,
);

/// One shop's bill, newest entries first, older ones on request.
class MyBillController extends AsyncNotifier<MyBill> {
  MyBillController(this.shopId);

  final String shopId;

  @override
  Future<MyBill> build() => ref.read(myBillsRepositoryProvider).fetch(shopId);

  /// Throws [ApiException]; the shown bill stays.
  Future<void> loadOlder() async {
    final current = state.value;
    if (current == null || !current.hasMore) return;
    final more = await ref
        .read(myBillsRepositoryProvider)
        .fetch(shopId, page: current.page + 1);
    if (ref.mounted) state = AsyncData(current.withOlder(more));
  }
}

final myBillProvider = AsyncNotifierProvider.autoDispose
    .family<MyBillController, MyBill, String>(
      MyBillController.new,
      retry: noRetry,
    );
