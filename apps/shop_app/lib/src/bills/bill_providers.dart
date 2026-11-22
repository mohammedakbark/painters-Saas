import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import 'bill_models.dart';
import 'shop_bills_repository.dart';

typedef BillKey = ({String shopId, String customerId});

/// A customer's running bill, newest entries first, with older entries on
/// request. A payment replaces it with what the API returns (D-044).
class BillController extends AsyncNotifier<Bill> {
  BillController(this.key);

  final BillKey key;

  ShopBillsRepository get _repository => ref.read(shopBillsRepositoryProvider);

  @override
  Future<Bill> build() => _repository.fetch(key.shopId, key.customerId);

  /// Throws like [ShopBillsRepository.fetch]; the shown bill stays.
  Future<void> loadOlder() async {
    final current = state.value;
    if (current == null || !current.hasMore) return;
    final more = await _repository.fetch(
      key.shopId,
      key.customerId,
      page: current.page + 1,
    );
    if (ref.mounted) state = AsyncData(current.withOlder(more));
  }

  /// Throws like [ShopBillsRepository.record].
  Future<void> record(BillMoney money, {required bool refund}) async {
    final bill = await _repository.record(
      key.shopId,
      key.customerId,
      money,
      refund: refund,
    );
    if (!ref.mounted) return;
    state = AsyncData(bill);
    // Balances on the Bills list and orders' Paid / Part paid changed.
    ref.invalidate(billListProvider);
  }
}

final billProvider = AsyncNotifierProvider.autoDispose
    .family<BillController, Bill, BillKey>(BillController.new, retry: noRetry);

/// The loaded part of the Bills list for one search and filter.
class BillListState {
  const BillListState({
    required this.first,
    required this.items,
    required this.page,
    this.loadingMore = false,
    this.loadMoreFailed = false,
  });

  /// The first page: its totals cover every customer.
  final BillListPage first;
  final List<BillListItem> items;
  final int page;
  final bool loadingMore;
  final bool loadMoreFailed;

  bool get hasMore => items.length < first.total;

  BillListState copyWith({
    List<BillListItem>? items,
    int? page,
    bool? loadingMore,
    bool? loadMoreFailed,
  }) => BillListState(
    first: first,
    items: items ?? this.items,
    page: page ?? this.page,
    loadingMore: loadingMore ?? this.loadingMore,
    loadMoreFailed: loadMoreFailed ?? this.loadMoreFailed,
  );
}

typedef BillListKey = ({String shopId, BillListFilter filter});

class BillListController extends AsyncNotifier<BillListState> {
  BillListController(this.key);

  final BillListKey key;

  Future<BillListPage> _fetch(int page) => ref
      .read(shopBillsRepositoryProvider)
      .list(key.shopId, key.filter, page: page);

  @override
  Future<BillListState> build() async {
    final first = await _fetch(1);
    return BillListState(first: first, items: first.items, page: 1);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;
    state = AsyncData(
      current.copyWith(loadingMore: true, loadMoreFailed: false),
    );
    try {
      final next = await _fetch(current.page + 1);
      if (!ref.mounted) return;
      final known = {for (final item in current.items) item.customerId};
      state = AsyncData(
        current.copyWith(
          items: [
            ...current.items,
            ...next.items.where((item) => !known.contains(item.customerId)),
          ],
          page: next.page,
          loadingMore: false,
        ),
      );
    } on Object {
      if (!ref.mounted) return;
      state = AsyncData(
        current.copyWith(loadingMore: false, loadMoreFailed: true),
      );
    }
  }
}

final billListProvider = AsyncNotifierProvider.autoDispose
    .family<BillListController, BillListState, BillListKey>(
      BillListController.new,
      retry: noRetry,
    );
