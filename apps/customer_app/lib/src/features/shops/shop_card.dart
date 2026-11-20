import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../shops/shop_models.dart';

/// "2.4 km" or "850 m".
String formatDistance(double km) =>
    km < 1 ? '${(km * 1000).round()} m' : '${km.toStringAsFixed(1)} km';

/// A Live shop in a list: photo, name, place, distance, delivery and
/// whether it is in My Shops. The whole card opens the shop.
class ShopCard extends StatelessWidget {
  const ShopCard({
    super.key,
    required this.shop,
    required this.onTap,
    this.active = false,
  });

  final PublicShop shop;
  final VoidCallback onTap;

  /// The shop the person is shopping from.
  final bool active;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final distance = shop.distanceKm;
    final thumb = shop.thumbUrl;
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.s12),
      child: Row(
        children: [
          SizedBox.square(
            dimension: 72,
            child: thumb == null
                ? const _PhotoPlaceholder()
                : AppNetworkImage(
                    url: thumb,
                    semanticLabel: 'Photo of ${shop.name}',
                    rounded: true,
                  ),
          ),
          const SizedBox(width: AppSpacing.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  shop.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (shop.address.place.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.s4),
                  Text(
                    distance == null
                        ? shop.address.place
                        : '${shop.address.place} · ${formatDistance(distance)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.s8),
                Wrap(
                  spacing: AppSpacing.s8,
                  runSpacing: AppSpacing.s4,
                  children: [
                    if (active)
                      const AppBadge(
                        label: 'Shopping here',
                        tone: AppTone.success,
                      ),
                    AppBadge(
                      label: shop.delivery.enabled ? 'Delivers' : 'Pickup only',
                      tone: shop.delivery.enabled
                          ? AppTone.info
                          : AppTone.neutral,
                    ),
                    if (shop.inMyShops && !active)
                      const AppBadge(label: 'In My Shops', tone: AppTone.info),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.s4),
          Icon(Icons.chevron_right, color: AppColors.textSecondary),
        ],
      ),
    );
  }
}

class _PhotoPlaceholder extends StatelessWidget {
  const _PhotoPlaceholder();

  @override
  Widget build(BuildContext context) => AppCard(
    tone: AppCardTone.subtle,
    padding: EdgeInsets.zero,
    child: Center(
      child: Icon(Icons.storefront_outlined, color: AppColors.brandPrimary),
    ),
  );
}
