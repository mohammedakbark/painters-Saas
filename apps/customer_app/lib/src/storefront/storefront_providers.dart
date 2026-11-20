import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import 'storefront_models.dart';

/// Overridden in `main()` and in tests.
final storefrontRepositoryProvider = Provider<StorefrontRepository>(
  (ref) =>
      throw UnimplementedError('storefrontRepositoryProvider is overridden'),
);

/// A shop's categories that have products.
final storefrontCategoriesProvider = FutureProvider.autoDispose
    .family<List<StorefrontCategory>, String>(
      (ref, shopId) =>
          ref.watch(storefrontRepositoryProvider).categories(shopId),
      retry: noRetry,
    );

/// One product of a shop: `(shopId, productId)`.
final storefrontProductProvider = FutureProvider.autoDispose
    .family<StorefrontProduct, (String, String)>(
      (ref, key) =>
          ref.watch(storefrontRepositoryProvider).product(key.$1, key.$2),
      retry: noRetry,
    );

/// The product list of one shop: search, category and loaded pages.
class StorefrontState {
  const StorefrontState({
    this.query = '',
    this.categoryId,
    this.items = const [],
    this.total = 0,
    this.page = 0,
    this.loading = true,
    this.loadingMore = false,
    this.failed = false,
  });

  final String query;

  /// Null: all categories.
  final String? categoryId;
  final List<StorefrontProduct> items;
  final int total;
  final int page;
  final bool loading;
  final bool loadingMore;
  final bool failed;

  bool get hasMore => items.length < total;

  StorefrontState copyWith({
    String? query,
    String? Function()? categoryId,
    List<StorefrontProduct>? items,
    int? total,
    int? page,
    bool? loading,
    bool? loadingMore,
    bool? failed,
  }) => StorefrontState(
    query: query ?? this.query,
    categoryId: categoryId == null ? this.categoryId : categoryId(),
    items: items ?? this.items,
    total: total ?? this.total,
    page: page ?? this.page,
    loading: loading ?? this.loading,
    loadingMore: loadingMore ?? this.loadingMore,
    failed: failed ?? this.failed,
  );
}

/// Loads a shop's products by name; a new search or category replaces the
/// list, Load more appends (D-044: only the list reloads).
class StorefrontController extends Notifier<StorefrontState> {
  StorefrontController(this.shopId);

  final String shopId;

  /// Ignores answers to requests that a newer one replaced.
  int _generation = 0;

  @override
  StorefrontState build() {
    Future.microtask(_reload);
    return const StorefrontState();
  }

  void search(String query) {
    if (query == state.query) return;
    state = state.copyWith(query: query);
    _reload();
  }

  void chooseCategory(String? categoryId) {
    if (categoryId == state.categoryId) return;
    state = state.copyWith(categoryId: () => categoryId);
    _reload();
  }

  Future<void> retry() => _reload();

  Future<void> _reload() async {
    final generation = ++_generation;
    state = state.copyWith(loading: true, failed: false);
    try {
      final page = await ref
          .read(storefrontRepositoryProvider)
          .products(shopId, query: state.query, categoryId: state.categoryId);
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

  /// Throws when the page cannot be loaded; the list stays as it was.
  Future<void> loadMore() async {
    if (state.loading || state.loadingMore || !state.hasMore) return;
    final generation = _generation;
    state = state.copyWith(loadingMore: true);
    try {
      final page = await ref
          .read(storefrontRepositoryProvider)
          .products(
            shopId,
            query: state.query,
            categoryId: state.categoryId,
            page: state.page + 1,
          );
      if (generation != _generation) return;
      final known = {for (final item in state.items) item.id};
      state = state.copyWith(
        items: [
          ...state.items,
          ...page.items.where((item) => !known.contains(item.id)),
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
}

final storefrontProvider = NotifierProvider.autoDispose
    .family<StorefrontController, StorefrontState, String>(
      StorefrontController.new,
    );
