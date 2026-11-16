import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../orders/order_models.dart';
import '../providers.dart';
import 'customer_models.dart';
import 'shop_customers_repository.dart';

/// The loaded part of the Customers tab for one search and type.
class CustomerListState {
  const CustomerListState({
    required this.items,
    required this.total,
    required this.page,
    this.loadingMore = false,
    this.loadMoreFailed = false,
  });

  final List<CustomerListItem> items;
  final int total;

  /// The last page loaded.
  final int page;
  final bool loadingMore;
  final bool loadMoreFailed;

  bool get hasMore => items.length < total;

  CustomerListState copyWith({bool? loadingMore, bool? loadMoreFailed}) =>
      CustomerListState(
        items: items,
        total: total,
        page: page,
        loadingMore: loadingMore ?? this.loadingMore,
        loadMoreFailed: loadMoreFailed ?? this.loadMoreFailed,
      );
}

typedef CustomerListKey = ({String shopId, CustomerListFilter filter});

/// The first page of customers, then more on request.
class CustomerListController extends AsyncNotifier<CustomerListState> {
  CustomerListController(this.key);

  final CustomerListKey key;

  Future<CustomerListPage> _fetch(int page) => ref
      .read(shopCustomersRepositoryProvider)
      .list(key.shopId, key.filter, page: page);

  @override
  Future<CustomerListState> build() async {
    final first = await _fetch(1);
    return CustomerListState(items: first.items, total: first.total, page: 1);
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
      final known = {for (final item in current.items) item.customer.id};
      state = AsyncData(
        CustomerListState(
          items: [
            ...current.items,
            ...next.items.where((item) => !known.contains(item.customer.id)),
          ],
          total: next.total,
          page: next.page,
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

final customerListProvider = AsyncNotifierProvider.autoDispose
    .family<CustomerListController, CustomerListState, CustomerListKey>(
      CustomerListController.new,
      retry: noRetry,
    );

typedef CustomerKey = ({String shopId, String customerId});

/// One customer with their sites. Saves replace it with what the API returns.
final customerProvider = FutureProvider.autoDispose
    .family<CustomerDetail, CustomerKey>(
      (ref, key) => ref
          .watch(shopCustomersRepositoryProvider)
          .fetch(key.shopId, key.customerId),
      retry: noRetry,
    );

/// The customer's newest orders, shown on their page.
final customerOrdersProvider = FutureProvider.autoDispose
    .family<List<OrderRow>, CustomerKey>(
      (ref, key) => ref
          .watch(shopOrdersRepositoryProvider)
          .latestForCustomer(key.shopId, key.customerId),
      retry: noRetry,
    );
