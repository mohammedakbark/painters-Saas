import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../storefront/storefront_models.dart';

/// "₹500", or "From ₹500" when the product has more than one pack size.
String productPriceLabel(StorefrontProduct product) {
  final price = formatRupees(product.fromPricePaise);
  return product.packs.length > 1 ? 'From $price' : price;
}

/// A product tile in the storefront grid (CUS-003): picture, name, brand,
/// price and, when nothing can be bought, "Not available". Opens the product.
class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, required this.onTap});

  final StorefrontProduct product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final thumb = product.thumbUrl;
    final brand = product.brand;
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.s8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: thumb == null
                ? AppCard(
                    tone: AppCardTone.subtle,
                    padding: EdgeInsets.zero,
                    child: Center(
                      child: Icon(
                        Icons.format_paint_outlined,
                        size: AppSpacing.s40,
                        color: AppColors.brandPrimary,
                      ),
                    ),
                  )
                : AppNetworkImage(
                    url: thumb,
                    semanticLabel: product.name,
                    fit: BoxFit.contain,
                    rounded: true,
                  ),
          ),
          const SizedBox(height: AppSpacing.s8),
          Text(
            product.name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          if (brand != null)
            Text(
              brand,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          const Spacer(),
          const SizedBox(height: AppSpacing.s8),
          Text(
            productPriceLabel(product),
            style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          if (!product.available) ...[
            const SizedBox(height: AppSpacing.s4),
            const Align(
              alignment: AlignmentDirectional.centerStart,
              child: AppBadge(label: 'Not available', tone: AppTone.warning),
            ),
          ],
        ],
      ),
    );
  }
}
