import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/bills/bill_models.dart';
import 'package:shop_app/src/bills/shop_bills_repository.dart';
import 'package:shop_app/src/customers/customer_models.dart';
import 'package:shop_app/src/customers/shop_customers_repository.dart';

/// A bill with [balancePaise] and [entries] (BIL-001).
Bill testBill(
  int balancePaise, {
  List<BillEntry> entries = const [],
  List<SiteBilled> sites = const [],
  bool hasMore = false,
}) => Bill(
  balancePaise: balancePaise,
  sites: sites,
  entries: entries,
  page: 1,
  hasMore: hasMore,
);

BillEntry testCharge(String id, int paise, {int number = 1001}) => BillEntry(
  id: id,
  kind: BillEntryKind.charge,
  amountPaise: paise,
  createdAt: DateTime.utc(2026, 11, 20, 6),
  orderId: 'o1',
  orderNumber: number,
  siteLabel: null,
  method: null,
  note: null,
);

/// Bills in memory, as the API keeps them: a payment lowers the balance and
/// can't be more than is owed; a refund only when the shop owes.
class FakeShopBillsRepository implements ShopBillsRepository {
  FakeShopBillsRepository({Map<String, Bill>? bills, this.people = const {}})
    : bills = bills ?? {};

  final Map<String, Bill> bills;

  /// Name and type of each customer, for the Bills list.
  final Map<String, ({String name, CustomerKind kind})> people;

  /// What was recorded, in order.
  final List<({String customerId, BillMoney money, bool refund})> recorded = [];

  final List<BillListFilter> listed = [];

  @override
  Future<BillListPage> list(
    String shopId,
    BillListFilter filter, {
    int page = 1,
  }) async {
    listed.add(filter);
    final items = [
      for (final MapEntry(key: id, value: bill) in bills.entries)
        if (switch (filter.status) {
          BillStatus.owing => bill.balancePaise > 0,
          BillStatus.shopOwes => bill.balancePaise < 0,
          BillStatus.settled => bill.balancePaise == 0,
          null => true,
        })
          BillListItem(
            customerId: id,
            name: people[id]?.name ?? id,
            phone: '+919876543210',
            kind: people[id]?.kind ?? CustomerKind.customer,
            balancePaise: bill.balancePaise,
            lastEntryAt: DateTime.utc(2026, 11, 20, 6),
          ),
    ]..sort((a, b) => b.balancePaise.compareTo(a.balancePaise));
    final all = bills.values.map((bill) => bill.balancePaise);
    return BillListPage(
      items: items,
      owingPaise: all.where((b) => b > 0).fold(0, (a, b) => a + b),
      shopOwesPaise: all.where((b) => b < 0).fold(0, (a, b) => a - b),
      total: items.length,
      page: page,
    );
  }

  @override
  Future<Bill> fetch(String shopId, String customerId, {int page = 1}) async {
    final bill = bills[customerId] ?? testBill(0);
    return page == 1 ? bill : testBill(bill.balancePaise);
  }

  @override
  Future<Bill> record(
    String shopId,
    String customerId,
    BillMoney money, {
    required bool refund,
  }) async {
    final bill = bills[customerId];
    if (bill == null) throw const CustomerNotFound();
    final limit = refund ? -bill.balancePaise : bill.balancePaise;
    if (money.amountPaise > limit) {
      throw const ApiException(
        status: 409,
        code: 'payment_exceeds_balance',
        detail: 'Enter at most what is owed.',
        fieldErrors: {'amountPaise': 'Enter at most what is owed.'},
      );
    }
    recorded.add((customerId: customerId, money: money, refund: refund));
    final signed = refund ? money.amountPaise : -money.amountPaise;
    final updated = testBill(
      bill.balancePaise + signed,
      sites: bill.sites,
      entries: [
        BillEntry(
          id: 'e${recorded.length}',
          kind: refund ? BillEntryKind.refund : BillEntryKind.payment,
          amountPaise: signed,
          createdAt: DateTime.utc(2026, 11, 22, 6),
          orderId: null,
          orderNumber: null,
          siteLabel: null,
          method: money.method,
          note: money.note,
        ),
        ...bill.entries,
      ],
    );
    bills[customerId] = updated;
    return updated;
  }
}
