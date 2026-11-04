import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../catalogue/catalogue_models.dart';
import 'catalogue_messages.dart';

/// "Brand · Category", or just the category for an own product without a
/// brand.
String productByline(ShopProduct product) =>
    [?product.brandName, product.categoryName].join(' · ');

/// Money in tabular figures, so prices line up.
const _tabular = [FontFeature.tabularFigures()];

/// One pack's size, price, MRP and availability, as words.
class PackPriceLine extends StatelessWidget {
  const PackPriceLine({super.key, required this.pack});

  final ShopPack pack;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final mrp = pack.mrpPaise;
    return Wrap(
      spacing: AppSpacing.s8,
      runSpacing: AppSpacing.s4,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(
          packSummary(pack, formatRupees),
          style: textTheme.bodyLarge?.copyWith(fontFeatures: _tabular),
        ),
        if (mrp != null)
          Text(
            'MRP ${formatRupees(mrp)}',
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
              fontFeatures: _tabular,
            ),
          ),
        if (!pack.available)
          const AppBadge(label: 'Unavailable', tone: AppTone.warning),
      ],
    );
  }
}

/// A grey box with an image icon where a product has no photo.
class ProductPhotoPlaceholder extends StatelessWidget {
  const ProductPhotoPlaceholder({super.key, this.compact = false});

  /// A thumbnail without text.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    const icon = Icon(
      Icons.image_outlined,
      color: AppColors.textSecondary,
      semanticLabel: 'No photo',
    );
    // A thumbnail is its own small card; the large version fills a card.
    if (compact) {
      return const AppCard(
        tone: AppCardTone.subtle,
        padding: EdgeInsets.zero,
        child: Center(child: icon),
      );
    }
    return ColoredBox(
      color: AppColors.surfaceSubtle,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ExcludeSemantics(child: icon),
            const SizedBox(height: AppSpacing.s8),
            Text(
              CatalogueMessages.noPhoto,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

/// The shop isn't one of the user's shops (the API answered 404).
class CatalogueShopNotFound extends StatelessWidget {
  const CatalogueShopNotFound({super.key});

  @override
  Widget build(BuildContext context) => MessageView(
    icon: Icons.search_off,
    title: 'Shop not found',
    message:
        "This shop doesn't exist, or your account doesn't have access to it.",
    action: AppButton(
      label: 'Go to your shops',
      variant: AppButtonVariant.secondary,
      onPressed: () => context.go('/shops'),
    ),
  );
}

/// The product isn't in this shop's catalogue.
class CatalogueProductNotFound extends StatelessWidget {
  const CatalogueProductNotFound({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context) => MessageView(
    icon: Icons.search_off,
    title: CatalogueMessages.productNotFound,
    message: CatalogueMessages.productNotFoundMessage,
    action: AppButton(
      label: 'Go to your products',
      variant: AppButtonVariant.secondary,
      onPressed: () => context.go('/shops/$shopId/catalogue'),
    ),
  );
}
