import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../api/api_client.dart';
import '../../storefront/storefront_models.dart';
import '../../storefront/storefront_providers.dart';

/// One product of a shop (CUS-003): picture, brand, name, category, the
/// pack sizes with this shop's price and availability, and the description.
/// Browse only: ordering comes with the cart.
class ProductScreen extends ConsumerWidget {
  const ProductScreen({
    super.key,
    required this.shopId,
    required this.productId,
  });

  final String shopId;
  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = (shopId, productId);
    return switch (ref.watch(storefrontProductProvider(key))) {
      AsyncData(:final value) => AppScaffold(
        title: value.name,
        body: _ProductDetails(product: value),
      ),
      AsyncError(:final error) => AppScaffold(
        title: 'Product',
        body: error is ApiException && error.status == 404
            ? const MessageView(
                icon: Icons.format_paint_outlined,
                title: 'This product is not available',
                message: 'The shop may have removed it.',
              )
            : ErrorView(
                title: "We couldn't load this product",
                onRetry: () => ref.invalidate(storefrontProductProvider(key)),
              ),
      ),
      _ => const AppScaffold(title: 'Product', body: LoadingView()),
    };
  }
}

class _ProductDetails extends StatefulWidget {
  const _ProductDetails({required this.product});

  final StorefrontProduct product;

  @override
  State<_ProductDetails> createState() => _ProductDetailsState();
}

class _ProductDetailsState extends State<_ProductDetails> {
  /// The first available pack, or the first pack.
  late String _packId = (widget.product.packs.firstWhere(
    (pack) => pack.available,
    orElse: () => widget.product.packs.first,
  )).id;

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final textTheme = Theme.of(context).textTheme;
    final pack = product.packs.firstWhere((p) => p.id == _packId);
    final image = product.imageUrl;
    final brand = product.brand;
    final description = product.description;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        AspectRatio(
          aspectRatio: 4 / 3,
          child: image == null
              ? AppCard(
                  tone: AppCardTone.subtle,
                  padding: EdgeInsets.zero,
                  child: Center(
                    child: Icon(
                      Icons.format_paint_outlined,
                      size: AppSpacing.s64,
                      color: AppColors.brandPrimary,
                    ),
                  ),
                )
              : AppNetworkImage(
                  url: image,
                  semanticLabel: product.name,
                  fit: BoxFit.contain,
                  rounded: true,
                ),
        ),
        const SizedBox(height: AppSpacing.s16),
        if (brand != null)
          Text(
            brand,
            style: textTheme.labelLarge?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        Semantics(
          header: true,
          child: Text(
            product.name,
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.s4),
        Text(
          product.categoryName,
          style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.s16),
        if (product.packs.length > 1) ...[
          AppChoiceChips<String>(
            key: const Key('pack-sizes'),
            label: 'Pack size',
            value: _packId,
            options: [
              for (final p in product.packs) AppChipOption(p.id, p.label),
            ],
            onChanged: (id) => setState(() => _packId = id),
          ),
          const SizedBox(height: AppSpacing.s16),
        ],
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: Semantics(
                label: '${pack.label}, ${formatRupees(pack.pricePaise)}',
                excludeSemantics: true,
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: formatRupees(pack.pricePaise),
                        style: textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      TextSpan(
                        text: '  ${pack.label}',
                        style: textTheme.bodyLarge?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            AppBadge(
              label: pack.available ? 'Available' : 'Not available',
              tone: pack.available ? AppTone.success : AppTone.warning,
            ),
          ],
        ),
        if (product.supportsShades) ...[
          const SizedBox(height: AppSpacing.s16),
          const AppInlineMessage(
            message:
                'Available in shades. You choose the shade when you order.',
          ),
        ],
        if (description != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppSection(title: 'About this product', lines: [description]),
        ],
        if (product.packs.length > 1) ...[
          const SizedBox(height: AppSpacing.s16),
          AppSection(
            title: 'All pack sizes',
            lines: [
              for (final p in product.packs)
                '${p.label}: ${formatRupees(p.pricePaise)}'
                    '${p.available ? '' : ' (not available)'}',
            ],
          ),
        ],
      ],
    );
  }
}
