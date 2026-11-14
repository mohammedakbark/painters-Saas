import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../providers.dart';
import 'order_models.dart';
import 'shop_orders_repository.dart';

/// The loaded part of one orders tab.
class OrderListState {
  const OrderListState({
    required this.items,
    required this.total,
    required this.counts,
    required this.page,
    this.loadingMore = false,
    this.loadMoreFailed = false,
  });

  final List<OrderRow> items;

  /// Orders in this tab with the search and filters applied.
  final int total;
  final Map<OrderTab, int> counts;

  /// The last page loaded.
  final int page;
  final bool loadingMore;
  final bool loadMoreFailed;

  bool get hasMore => items.length < total;

  OrderListState copyWith({bool? loadingMore, bool? loadMoreFailed}) =>
      OrderListState(
        items: items,
        total: total,
        counts: counts,
        page: page,
        loadingMore: loadingMore ?? this.loadingMore,
        loadMoreFailed: loadMoreFailed ?? this.loadMoreFailed,
      );
}

typedef OrderListKey = ({String shopId, OrderListFilter filter});

/// Orders placed after everything in [before] that [after] now shows.
int newOrdersIn(List<OrderRow> before, List<OrderRow> after) {
  if (before.isEmpty) return after.length;
  final newest = before
      .map((order) => order.placedAt)
      .reduce((a, b) => a.isAfter(b) ? a : b);
  return after.where((order) => order.placedAt.isAfter(newest)).length;
}

/// One tab of the shop's orders with its search and filters: the first page,
/// then more on request.
class OrderListController extends AsyncNotifier<OrderListState> {
  OrderListController(this.key);

  final OrderListKey key;

  Future<OrderListPage> _fetch(int page) => ref
      .read(shopOrdersRepositoryProvider)
      .list(key.shopId, key.filter, page: page);

  @override
  Future<OrderListState> build() async {
    final first = await _fetch(1);
    return OrderListState(
      items: first.items,
      total: first.total,
      counts: first.counts,
      page: 1,
    );
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
      final known = {for (final order in current.items) order.id};
      state = AsyncData(
        OrderListState(
          items: [
            ...current.items,
            ...next.items.where((order) => !known.contains(order.id)),
          ],
          total: next.total,
          counts: next.counts,
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

  /// Reads the newest orders again while the list stays on screen (pull to
  /// refresh and the 30-second check). Returns how many orders are new; a
  /// failed check changes nothing and returns null.
  Future<int?> refresh() async {
    final current = state.value;
    if (current == null || current.loadingMore) return null;
    final OrderListPage first;
    try {
      first = await _fetch(1);
    } on Object {
      return null;
    }
    if (!ref.mounted) return null;
    final fresh = {for (final order in first.items) order.id};
    state = AsyncData(
      OrderListState(
        // Later pages stay as loaded; the first page is replaced.
        items: [
          ...first.items,
          ...current.items
              .skip(orderPageSize)
              .where((order) => !fresh.contains(order.id)),
        ],
        total: first.total,
        counts: first.counts,
        page: current.page,
      ),
    );
    return newOrdersIn(current.items, first.items);
  }
}

final orderListProvider = AsyncNotifierProvider.autoDispose
    .family<OrderListController, OrderListState, OrderListKey>(
      OrderListController.new,
      retry: noRetry,
    );

/// Order figures for the shop home.
final orderSummaryProvider = FutureProvider.autoDispose
    .family<OrderSummary, String>(
      (ref, shopId) => ref.watch(shopOrdersRepositoryProvider).summary(shopId),
      retry: noRetry,
    );

/// The shop's ready messages. A failure gives none: the sheets still offer
/// "Write my own".
final orderMessagesProvider = FutureProvider.autoDispose
    .family<List<String>, String>((ref, shopId) async {
      try {
        return await ref
            .watch(shopOrdersRepositoryProvider)
            .orderMessages(shopId);
      } on Object {
        return const [];
      }
    }, retry: noRetry);

typedef OrderKey = ({String shopId, String orderId});

/// One order. Every action replaces it with the order the API returns, so
/// the screen always shows the saved state, never a guess.
class OrderController extends AsyncNotifier<OrderDetail> {
  OrderController(this.key);

  final OrderKey key;

  @override
  Future<OrderDetail> build() =>
      ref.read(shopOrdersRepositoryProvider).fetch(key.shopId, key.orderId);

  /// Runs [action]; errors are rethrown for the screen to explain. When the
  /// order changed somewhere else meanwhile (409), it is read again first.
  Future<OrderDetail> apply(
    Future<OrderDetail> Function(
      ShopOrdersRepository repository,
      String shopId,
      String orderId,
    )
    action,
  ) async {
    final repository = ref.read(shopOrdersRepositoryProvider);
    try {
      final updated = await action(repository, key.shopId, key.orderId);
      if (ref.mounted) {
        state = AsyncData(updated);
        ordersChanged(ref, key.shopId);
      }
      return updated;
    } on ApiException catch (error) {
      if (error.status == 409 && ref.mounted) {
        try {
          final latest = await repository.fetch(key.shopId, key.orderId);
          if (ref.mounted) {
            state = AsyncData(latest);
            ordersChanged(ref, key.shopId);
          }
        } on Object {
          // Keep what is on screen; the original error is shown.
        }
      }
      rethrow;
    }
  }
}

final orderProvider = AsyncNotifierProvider.autoDispose
    .family<OrderController, OrderDetail, OrderKey>(
      OrderController.new,
      retry: noRetry,
    );

/// After an order changed: the lists and the home figures read again in the
/// background. What is on screen stays until the new data arrives.
void ordersChanged(Ref ref, String shopId) {
  ref
    ..invalidate(orderListProvider)
    ..invalidate(orderSummaryProvider(shopId));
}

/// [ordersChanged] for widgets.
void ordersChangedFromWidget(WidgetRef ref, String shopId) {
  ref
    ..invalidate(orderListProvider)
    ..invalidate(orderSummaryProvider(shopId));
}
