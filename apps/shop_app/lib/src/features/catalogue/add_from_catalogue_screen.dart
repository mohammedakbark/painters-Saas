import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../catalogue/catalogue_models.dart';
import '../../catalogue/catalogue_providers.dart';
import '../../shops/shop_access_repository.dart';
import '../shops/sign_out_button.dart';
import 'catalogue_messages.dart';
import 'catalogue_parts.dart';

/// Add a product from the platform's brand catalogue (SHP-005): choose a
/// brand, find the product, then choose pack sizes and prices.
class AddFromCatalogueScreen extends ConsumerStatefulWidget {
  const AddFromCatalogueScreen({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<AddFromCatalogueScreen> createState() =>
      _AddFromCatalogueScreenState();
}

class _AddFromCatalogueScreenState
    extends ConsumerState<AddFromCatalogueScreen> {
  final _search = TextEditingController();
  String? _brandId;
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final brands = ref.watch(catalogueBrandsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Brand catalogue'),
        actions: const [SignOutButton()],
      ),
      body: SafeArea(
        child: brands.when(
          loading: () =>
              const LoadingView(message: 'Loading the brand catalogue…'),
          error: (error, _) => ErrorView(
            title: "We couldn't load the brand catalogue",
            onRetry: () => ref.invalidate(catalogueBrandsProvider),
          ),
          data: (brands) {
            if (brands.isEmpty) {
              return const MessageView(
                icon: Icons.inventory_2_outlined,
                title: CatalogueMessages.noBrands,
                message: CatalogueMessages.noBrandsMessage,
              );
            }
            final brand = brands.firstWhere(
              (b) => b.id == _brandId,
              orElse: () => brands.first,
            );
            return _BrandProducts(
              shopId: widget.shopId,
              brand: brand,
              query: _query,
              header: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Choose a product, then the pack sizes you sell and '
                    'your prices.',
                    style: Theme.of(context).textTheme.bodyLarge
                        ?.copyWith(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: AppSpacing.s16),
                  AppDropdown<String>(
                    label: 'Brand',
                    value: brand.id,
                    options: [for (final b in brands) AppOption(b.id, b.name)],
                    onChanged: (id) => setState(() {
                      _brandId = id;
                      _query = '';
                      _search.clear();
                    }),
                  ),
                  const SizedBox(height: AppSpacing.s16),
                  AppSearchField(
                    label: 'Product name',
                    controller: _search,
                    onSubmitted: (query) => setState(() => _query = query),
                  ),
                  const SizedBox(height: AppSpacing.s16),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _BrandProducts extends ConsumerWidget {
  const _BrandProducts({
    required this.shopId,
    required this.brand,
    required this.query,
    required this.header,
  });

  final String shopId;
  final CatalogueBrand brand;
  final String query;
  final Widget header;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = (shopId: shopId, brandId: brand.id, query: query);
    final products = ref.watch(brandProductsProvider(key));
    Widget body(Widget child) => ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [header, child],
    );
    return products.when(
      skipLoadingOnRefresh: false,
      loading: () => body(
        const Padding(
          padding: EdgeInsets.all(AppSpacing.s24),
          child: Center(child: AppSpinner()),
        ),
      ),
      error: (error, _) => error is ShopNotFound
          ? const CatalogueShopNotFound()
          : body(
              AppInlineMessage(
                tone: AppTone.error,
                message: catalogueErrorMessage(error),
                action: Align(
                  alignment: Alignment.centerLeft,
                  child: AppButton(
                    label: 'Try again',
                    variant: AppButtonVariant.tertiary,
                    onPressed: () => ref.invalidate(brandProductsProvider(key)),
                  ),
                ),
              ),
            ),
      data: (page) {
        if (page.items.isEmpty) {
          return body(
            MessageView(
              icon: Icons.search_off,
              title: query.isEmpty
                  ? CatalogueMessages.noBrandProducts(brand.name)
                  : CatalogueMessages.noMatch(query),
              message: CatalogueMessages.noBrandProductsMessage,
            ),
          );
        }
        return ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            header,
            for (final item in page.items) ...[
              _CatalogueProductCard(shopId: shopId, item: item),
              const SizedBox(height: AppSpacing.s12),
            ],
            if (page.loadMoreFailed)
              AppInlineMessage(
                tone: AppTone.error,
                message: CatalogueMessages.loadMoreFailed,
                action: Align(
                  alignment: Alignment.centerLeft,
                  child: AppButton(
                    label: 'Try again',
                    variant: AppButtonVariant.tertiary,
                    onPressed: () => ref
                        .read(brandProductsProvider(key).notifier)
                        .loadMore(),
                  ),
                ),
              )
            else if (page.hasMore)
              AppButton(
                label: 'Load more',
                loadingLabel: 'Loading…',
                variant: AppButtonVariant.secondary,
                loading: page.loadingMore,
                onPressed: () =>
                    ref.read(brandProductsProvider(key).notifier).loadMore(),
              ),
          ],
        );
      },
    );
  }
}

class _CatalogueProductCard extends StatelessWidget {
  const _CatalogueProductCard({required this.shopId, required this.item});

  final String shopId;
  final BrandProductItem item;

  @override
  Widget build(BuildContext context) {
    final product = item.product;
    final listedId = item.listedProductId;
    final textTheme = Theme.of(context).textTheme;
    final image = product.image;
    return AppCard(
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
                  product.categoryName,
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.s4),
                Text(
                  product.packs.map((pack) => pack.label).join(' · '),
                  style: textTheme.bodyMedium,
                ),
                const SizedBox(height: AppSpacing.s12),
                if (listedId != null) ...[
                  const AppBadge(
                    label: 'In your products',
                    tone: AppTone.success,
                  ),
                  const SizedBox(height: AppSpacing.s8),
                  AppButton(
                    label: 'Open',
                    variant: AppButtonVariant.secondary,
                    onPressed: () => context.go(
                      '/shops/$shopId/catalogue/products/$listedId',
                    ),
                  ),
                ] else
                  AppButton(
                    label: 'Add',
                    icon: Icons.add,
                    onPressed: () => context.go(
                      '/shops/$shopId/catalogue/add/${product.id}',
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
