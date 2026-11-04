import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import 'catalogue_models.dart';
import 'shop_catalogue_repository.dart';

/// A loaded list with its next page.
class PagedState<T> {
  const PagedState({
    required this.items,
    required this.nextCursor,
    this.loadingMore = false,
    this.loadMoreFailed = false,
  });

  final List<T> items;
  final String? nextCursor;
  final bool loadingMore;
  final bool loadMoreFailed;

  bool get hasMore => nextCursor != null;

  PagedState<T> copyWith({bool? loadingMore, bool? loadMoreFailed}) =>
      PagedState(
        items: items,
        nextCursor: nextCursor,
        loadingMore: loadingMore ?? this.loadingMore,
        loadMoreFailed: loadMoreFailed ?? this.loadMoreFailed,
      );
}

/// Loads the first page, then more pages on request ("Load more").
abstract class PagedController<T> extends AsyncNotifier<PagedState<T>> {
  Future<Paged<T>> fetch(String? cursor);

  @override
  Future<PagedState<T>> build() async {
    final page = await fetch(null);
    return PagedState(items: page.items, nextCursor: page.nextCursor);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;
    state = AsyncData(
      current.copyWith(loadingMore: true, loadMoreFailed: false),
    );
    try {
      final page = await fetch(current.nextCursor);
      if (!ref.mounted) return;
      state = AsyncData(
        PagedState(
          items: [...current.items, ...page.items],
          nextCursor: page.nextCursor,
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

typedef ProductListKey = ({String shopId, bool archived, String query});

/// The shop's products for one tab (Active/Archived) and search.
class ProductListController extends PagedController<ShopProduct> {
  ProductListController(this.key);

  final ProductListKey key;

  @override
  Future<Paged<ShopProduct>> fetch(String? cursor) => ref
      .read(shopCatalogueRepositoryProvider)
      .listProducts(
        key.shopId,
        archived: key.archived,
        query: key.query,
        cursor: cursor,
      );
}

final productListProvider = AsyncNotifierProvider.autoDispose
    .family<ProductListController, PagedState<ShopProduct>, ProductListKey>(
      ProductListController.new,
      retry: noRetry,
    );

typedef BrandProductsKey = ({String shopId, String brandId, String query});

/// One brand's catalogue products, marked when the shop already sells them.
class BrandProductsController extends PagedController<BrandProductItem> {
  BrandProductsController(this.key);

  final BrandProductsKey key;

  @override
  Future<Paged<BrandProductItem>> fetch(String? cursor) => ref
      .read(shopCatalogueRepositoryProvider)
      .browseBrand(key.shopId, key.brandId, query: key.query, cursor: cursor);
}

final brandProductsProvider = AsyncNotifierProvider.autoDispose
    .family<
      BrandProductsController,
      PagedState<BrandProductItem>,
      BrandProductsKey
    >(BrandProductsController.new, retry: noRetry);

/// The platform's active brands, for the brand dropdown.
final catalogueBrandsProvider =
    FutureProvider.autoDispose<List<CatalogueBrand>>(
      (ref) => ref.watch(shopCatalogueRepositoryProvider).listBrands(),
      retry: noRetry,
    );

/// A brand catalogue product, for choosing its pack sizes and prices.
final catalogueProductProvider = FutureProvider.autoDispose
    .family<CatalogueProduct, String>(
      (ref, id) =>
          ref.watch(shopCatalogueRepositoryProvider).fetchCatalogueProduct(id),
      retry: noRetry,
    );

typedef ProductKey = ({String shopId, String productId});

/// One product. Every change replaces it with the product the API returns,
/// so the screen always shows the saved state, never a guess.
class ProductController extends AsyncNotifier<ShopProduct> {
  ProductController(this.key);

  final ProductKey key;

  @override
  Future<ShopProduct> build() => ref
      .read(shopCatalogueRepositoryProvider)
      .fetchProduct(key.shopId, key.productId);

  /// Runs [change]; errors are rethrown for the screen to explain.
  Future<ShopProduct> apply(
    Future<ShopProduct> Function(
      ShopCatalogueRepository repository,
      String shopId,
      String productId,
    )
    change,
  ) async {
    final updated = await change(
      ref.read(shopCatalogueRepositoryProvider),
      key.shopId,
      key.productId,
    );
    if (ref.mounted) {
      state = AsyncData(updated);
      catalogueChanged(ref, key.shopId);
    }
    return updated;
  }
}

final productProvider = AsyncNotifierProvider.autoDispose
    .family<ProductController, ShopProduct, ProductKey>(
      ProductController.new,
      retry: noRetry,
    );

/// After a catalogue change: reload the product lists and the review
/// checklist (the Products item counts active products, CAT-002).
void catalogueChanged(Ref ref, String shopId) {
  ref
    ..invalidate(productListProvider)
    ..invalidate(brandProductsProvider)
    ..invalidate(shopReviewProvider(shopId));
}

/// [catalogueChanged] for widgets.
void catalogueChangedFromWidget(WidgetRef ref, String shopId) {
  ref
    ..invalidate(productListProvider)
    ..invalidate(brandProductsProvider)
    ..invalidate(shopReviewProvider(shopId));
}
