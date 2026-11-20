import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shops/shop_models.dart';
import '../../shops/shop_providers.dart';

/// The Find shops list: search text, the loaded pages and their state.
class FindShopsState {
  const FindShopsState({
    this.query = '',
    this.items = const [],
    this.total = 0,
    this.page = 0,
    this.loading = true,
    this.loadingMore = false,
    this.failed = false,
  });

  final String query;
  final List<PublicShop> items;
  final int total;
  final int page;

  /// The first page is loading (the list is replaced).
  final bool loading;
  final bool loadingMore;
  final bool failed;

  bool get hasMore => items.length < total;

  FindShopsState copyWith({
    String? query,
    List<PublicShop>? items,
    int? total,
    int? page,
    bool? loading,
    bool? loadingMore,
    bool? failed,
  }) => FindShopsState(
    query: query ?? this.query,
    items: items ?? this.items,
    total: total ?? this.total,
    page: page ?? this.page,
    loading: loading ?? this.loading,
    loadingMore: loadingMore ?? this.loadingMore,
    failed: failed ?? this.failed,
  );
}

/// Loads Live shops sorted from [shopsNearProvider] (D-038), reloading when
/// the search or the position changes, and appends pages on Load more.
class FindShopsController extends Notifier<FindShopsState> {
  /// Ignores answers to requests that a newer search replaced.
  int _generation = 0;

  @override
  FindShopsState build() {
    ref.listen(shopsNearProvider, (_, _) => _reload());
    Future.microtask(_reload);
    return const FindShopsState();
  }

  void search(String query) {
    if (query == state.query) return;
    state = state.copyWith(query: query);
    _reload();
  }

  Future<void> retry() => _reload();

  Future<void> _reload() async {
    final generation = ++_generation;
    state = state.copyWith(loading: true, failed: false);
    try {
      final page = await ref
          .read(shopsRepositoryProvider)
          .find(near: ref.read(shopsNearProvider), query: state.query);
      if (generation != _generation) return;
      state = state.copyWith(
        items: page.items,
        total: page.total,
        page: page.page,
        loading: false,
      );
    } on Object {
      if (generation != _generation) return;
      state = state.copyWith(loading: false, failed: true, items: const []);
    }
  }

  Future<void> loadMore() async {
    if (state.loading || state.loadingMore || !state.hasMore) return;
    final generation = _generation;
    state = state.copyWith(loadingMore: true);
    try {
      final page = await ref
          .read(shopsRepositoryProvider)
          .find(
            near: ref.read(shopsNearProvider),
            query: state.query,
            page: state.page + 1,
          );
      if (generation != _generation) return;
      final known = {for (final shop in state.items) shop.id};
      state = state.copyWith(
        items: [
          ...state.items,
          ...page.items.where((shop) => !known.contains(shop.id)),
        ],
        total: page.total,
        page: page.page,
        loadingMore: false,
      );
    } on Object {
      if (generation != _generation) return;
      state = state.copyWith(loadingMore: false);
      rethrow;
    }
  }

  /// Keeps a row's "In My Shops" in step after the shop page changed it.
  void markInMyShops(String shopId, bool inMyShops) {
    state = state.copyWith(
      items: [
        for (final shop in state.items)
          shop.id == shopId ? shop.copyWith(inMyShops: inMyShops) : shop,
      ],
    );
  }
}

final findShopsProvider =
    NotifierProvider.autoDispose<FindShopsController, FindShopsState>(
      FindShopsController.new,
    );
