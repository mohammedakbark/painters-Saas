import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../routing/paths.dart';
import '../../storefront/storefront_models.dart';
import '../../storefront/storefront_providers.dart';
import 'product_card.dart';

/// A Live shop's products (CUS-003): search, category chips and a two-column
/// grid with Load more. Browse only; ordering comes with the cart. Used on
/// Home for the active shop and on a shop's Products screen.
class StorefrontView extends ConsumerStatefulWidget {
  const StorefrontView({super.key, required this.shopId, this.header});

  final String shopId;

  /// Shown above the search, for example the active shop on Home.
  final Widget? header;

  @override
  ConsumerState<StorefrontView> createState() => _StorefrontViewState();
}

class _StorefrontViewState extends ConsumerState<StorefrontView> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  StorefrontController get _controller =>
      ref.read(storefrontProvider(widget.shopId).notifier);

  Future<void> _loadMore() async {
    try {
      await _controller.loadMore();
    } on Object {
      if (mounted) {
        showAppSnackBar(
          context,
          "We couldn't load more products. Try again.",
          tone: AppTone.error,
        );
      }
    }
  }

  Future<void> _refresh() async {
    ref.invalidate(storefrontCategoriesProvider(widget.shopId));
    await _controller.retry();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(storefrontProvider(widget.shopId));
    final header = widget.header;
    const gutter = EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding);
    return RefreshIndicator(
      onRefresh: _refresh,
      child: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.s16)),
          if (header != null)
            SliverPadding(
              padding: gutter,
              sliver: SliverToBoxAdapter(child: header),
            ),
          SliverPadding(
            padding: gutter,
            sliver: SliverToBoxAdapter(
              child: AppSearchField(
                label: 'Search products or brands',
                controller: _search,
                onSubmitted: _controller.search,
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: _CategoryChips(
              shopId: widget.shopId,
              selected: state.categoryId,
              onChanged: _controller.chooseCategory,
            ),
          ),
          ..._results(state, gutter),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.s24)),
        ],
      ),
    );
  }

  List<Widget> _results(StorefrontState state, EdgeInsets gutter) {
    if (state.loading) {
      return const [
        SliverToBoxAdapter(child: LoadingView(message: 'Loading products…')),
      ];
    }
    if (state.failed) {
      return [
        SliverToBoxAdapter(
          child: ErrorView(
            title: "We couldn't load the products",
            onRetry: _controller.retry,
          ),
        ),
      ];
    }
    if (state.items.isEmpty) {
      final filtered = state.query.isNotEmpty || state.categoryId != null;
      return [
        SliverToBoxAdapter(
          child: MessageView(
            icon: Icons.format_paint_outlined,
            title: filtered ? 'No products found' : 'No products yet',
            message: filtered
                ? 'Try another search or category.'
                : "This shop hasn't listed any products yet.",
          ),
        ),
      ];
    }
    final rows = <List<StorefrontProduct>>[
      for (var i = 0; i < state.items.length; i += 2)
        state.items.sublist(i, (i + 2).clamp(0, state.items.length)),
    ];
    return [
      SliverPadding(
        padding: gutter,
        sliver: SliverList.separated(
          itemCount: rows.length,
          separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.s12),
          itemBuilder: (context, index) => IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final (i, product) in rows[index].indexed) ...[
                  if (i > 0) const SizedBox(width: AppSpacing.s12),
                  Expanded(
                    child: ProductCard(
                      key: ValueKey('product-${product.id}'),
                      product: product,
                      onTap: () =>
                          context.push(productPath(widget.shopId, product.id)),
                    ),
                  ),
                ],
                if (rows[index].length == 1) ...[
                  const SizedBox(width: AppSpacing.s12),
                  const Expanded(child: SizedBox.shrink()),
                ],
              ],
            ),
          ),
        ),
      ),
      if (state.hasMore)
        SliverPadding(
          padding: gutter.copyWith(top: AppSpacing.s16),
          sliver: SliverToBoxAdapter(
            child: AppButton(
              label: 'Load more',
              loadingLabel: 'Loading…',
              loading: state.loadingMore,
              variant: AppButtonVariant.secondary,
              expand: true,
              onPressed: _loadMore,
            ),
          ),
        ),
    ];
  }
}

/// All plus the shop's categories; hidden while there is only one or none.
class _CategoryChips extends ConsumerWidget {
  const _CategoryChips({
    required this.shopId,
    required this.selected,
    required this.onChanged,
  });

  final String shopId;
  final String? selected;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(storefrontCategoriesProvider(shopId)).value;
    if (categories == null || categories.length < 2) {
      return const SizedBox(height: AppSpacing.s16);
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.s12),
      child: AppChoiceChips<String?>(
        label: 'Category',
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenPadding,
        ),
        value: selected,
        options: [
          const AppChipOption(null, 'All'),
          for (final category in categories)
            AppChipOption(category.id, category.name),
        ],
        onChanged: onChanged,
      ),
    );
  }
}
