import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../catalogue/catalogue_models.dart';
import '../../catalogue/catalogue_providers.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../shops/sign_out_button.dart';
import 'catalogue_messages.dart';
import 'catalogue_parts.dart';

/// The shop's products (SHP-005): Active or Archived, with search. Owners can
/// add products from the brand catalogue.
class ProductListScreen extends ConsumerStatefulWidget {
  const ProductListScreen({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends ConsumerState<ProductListScreen> {
  final _search = TextEditingController();
  bool _archived = false;
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  ProductListKey get _key =>
      (shopId: widget.shopId, archived: _archived, query: _query);

  @override
  Widget build(BuildContext context) {
    final isOwner =
        ref.watch(shopProvider(widget.shopId)).value?.myRole == 'MASTER';
    final products = ref.watch(productListProvider(_key));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: const [SignOutButton()],
      ),
      body: SafeArea(
        child: products.when(
          skipLoadingOnRefresh: false,
          loading: () => _withHeader(
            isOwner,
            const LoadingView(message: 'Loading your products…'),
          ),
          error: (error, _) => error is ShopNotFound
              ? const CatalogueShopNotFound()
              : _withHeader(
                  isOwner,
                  ErrorView(
                    title: CatalogueMessages.listFailed,
                    onRetry: () => ref.invalidate(productListProvider(_key)),
                  ),
                ),
          data: (page) => page.items.isEmpty
              ? _withHeader(
                  isOwner,
                  _EmptyState(
                    archived: _archived,
                    query: _query,
                    isOwner: isOwner,
                    shopId: widget.shopId,
                  ),
                )
              : _ProductList(
                  header: _Header(
                    isOwner: isOwner,
                    shopId: widget.shopId,
                    archived: _archived,
                    search: _search,
                    onArchived: (archived) =>
                        setState(() => _archived = archived),
                    onSearch: (query) => setState(() => _query = query),
                  ),
                  page: page,
                  shopId: widget.shopId,
                  onLoadMore: () =>
                      ref.read(productListProvider(_key).notifier).loadMore(),
                ),
        ),
      ),
    );
  }

  /// The tabs and search stay visible while loading, empty or failing.
  Widget _withHeader(bool isOwner, Widget body) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.screenPadding,
          AppSpacing.screenPadding,
          AppSpacing.screenPadding,
          0,
        ),
        child: _Header(
          isOwner: isOwner,
          shopId: widget.shopId,
          archived: _archived,
          search: _search,
          onArchived: (archived) => setState(() => _archived = archived),
          onSearch: (query) => setState(() => _query = query),
        ),
      ),
      Expanded(child: body),
    ],
  );
}

class _Header extends StatelessWidget {
  const _Header({
    required this.isOwner,
    required this.shopId,
    required this.archived,
    required this.search,
    required this.onArchived,
    required this.onSearch,
  });

  final bool isOwner;
  final String shopId;
  final bool archived;
  final TextEditingController search;
  final ValueChanged<bool> onArchived;
  final ValueChanged<String> onSearch;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (isOwner) ...[
          AppButton(
            label: 'Add from brand catalogue',
            icon: Icons.add,
            expand: true,
            onPressed: () => context.go('/shops/$shopId/catalogue/add'),
          ),
          const SizedBox(height: AppSpacing.s16),
        ],
        AppSegmentedControl<bool>(
          value: archived,
          options: const [
            AppOption(false, 'Selling'),
            AppOption(true, 'Archived'),
          ],
          onChanged: onArchived,
        ),
        const SizedBox(height: AppSpacing.s16),
        AppSearchField(
          label: 'Search products',
          hint: 'Product or brand name',
          controller: search,
          onSubmitted: onSearch,
        ),
        const SizedBox(height: AppSpacing.s16),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.archived,
    required this.query,
    required this.isOwner,
    required this.shopId,
  });

  final bool archived;
  final String query;
  final bool isOwner;
  final String shopId;

  @override
  Widget build(BuildContext context) {
    if (query.isNotEmpty) {
      return MessageView(
        icon: Icons.search_off,
        title: CatalogueMessages.noMatch(query),
        message: CatalogueMessages.noMatchMessage,
      );
    }
    if (archived) {
      return const MessageView(
        icon: Icons.inventory_2_outlined,
        title: CatalogueMessages.noArchived,
        message: CatalogueMessages.noArchivedMessage,
      );
    }
    return MessageView(
      icon: Icons.inventory_2_outlined,
      title: CatalogueMessages.noProducts,
      message: isOwner
          ? CatalogueMessages.noProductsOwner
          : CatalogueMessages.noProductsMember,
    );
  }
}

class _ProductList extends StatelessWidget {
  const _ProductList({
    required this.header,
    required this.page,
    required this.shopId,
    required this.onLoadMore,
  });

  final Widget header;
  final PagedState<ShopProduct> page;
  final String shopId;
  final VoidCallback onLoadMore;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        header,
        for (final product in page.items) ...[
          _ProductCard(
            product: product,
            onTap: () =>
                context.go('/shops/$shopId/catalogue/products/${product.id}'),
          ),
          const SizedBox(height: AppSpacing.s12),
        ],
        if (page.loadMoreFailed) ...[
          AppInlineMessage(
            tone: AppTone.error,
            message: CatalogueMessages.loadMoreFailed,
            action: Align(
              alignment: Alignment.centerLeft,
              child: AppButton(
                label: 'Try again',
                variant: AppButtonVariant.tertiary,
                onPressed: onLoadMore,
              ),
            ),
          ),
        ] else if (page.hasMore)
          AppButton(
            label: 'Load more',
            loadingLabel: 'Loading…',
            variant: AppButtonVariant.secondary,
            loading: page.loadingMore,
            onPressed: onLoadMore,
          ),
      ],
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product, required this.onTap});

  final ShopProduct product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final image = product.image;
    return AppCard(
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox.square(
            dimension: AppSpacing.s64,
            child: image == null
                ? const ProductPhotoPlaceholder(compact: true)
                : AppNetworkImage(
                    url: image.thumbUrl,
                    semanticLabel: 'Photo of ${product.name}',
                    rounded: true,
                  ),
          ),
          const SizedBox(width: AppSpacing.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name, style: textTheme.titleMedium),
                const SizedBox(height: AppSpacing.s4),
                Text(
                  productByline(product),
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                if (!product.catalogueActive) ...[
                  const SizedBox(height: AppSpacing.s8),
                  const AppBadge(
                    label: CatalogueMessages.removedFromCatalogue,
                    tone: AppTone.warning,
                  ),
                ],
                const SizedBox(height: AppSpacing.s8),
                for (final pack in product.packs)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.s4),
                    child: PackPriceLine(pack: pack),
                  ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.textSecondary),
        ],
      ),
    );
  }
}
