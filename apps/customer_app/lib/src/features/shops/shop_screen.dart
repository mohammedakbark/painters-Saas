import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../routing/paths.dart';
import '../../shops/shop_models.dart';
import '../../shops/shop_providers.dart';
import 'shop_card.dart';

/// Whether maps are drawn (false in widget tests).
final mapsEnabledProvider = Provider<bool>((ref) => true);

/// "Delivers within 8 km. ₹50 delivery, free above ₹5,000." or pickup only.
List<String> deliveryLines(ShopDelivery delivery) => [
  'Pickup at the shop',
  if (!delivery.enabled)
    'No delivery'
  else ...[
    delivery.radiusKm == null
        ? 'Delivers'
        : 'Delivers within ${delivery.radiusKm} km',
    switch (delivery.chargePaise) {
      null || 0 => 'Free delivery',
      final charge =>
        delivery.freeAbovePaise == null
            ? '${formatRupees(charge)} delivery charge'
            : '${formatRupees(charge)} delivery charge, free above '
                  '${formatRupees(delivery.freeAbovePaise!)}',
    },
  ],
];

/// A Live shop's page (CUS-002): photo, address and map, pickup and
/// delivery, Add to My Shops (instant, D-037) and Shop here. Never the
/// shop's phone (question 39).
class ShopScreen extends ConsumerStatefulWidget {
  const ShopScreen({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen> {
  bool _savingMyShops = false;

  Future<void> _toggleMyShops(PublicShop shop) async {
    setState(() => _savingMyShops = true);
    final adding = !shop.inMyShops;
    try {
      await ref.read(shopProvider(widget.shopId).notifier).setInMyShops(adding);
      if (!mounted) return;
      showAppSnackBar(
        context,
        adding ? 'Added to My Shops.' : 'Removed from My Shops.',
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      showAppSnackBar(
        context,
        error.detail ?? "We couldn't change My Shops. Try again.",
        tone: AppTone.error,
      );
    } finally {
      if (mounted) setState(() => _savingMyShops = false);
    }
  }

  Future<void> _shopHere(PublicShop shop) async {
    await ref.read(activeShopIdProvider.notifier).choose(shop.id);
    if (!mounted) return;
    showAppSnackBar(context, "You're shopping from ${shop.name}.");
    context.go(homePath);
  }

  @override
  Widget build(BuildContext context) {
    final shop = ref.watch(shopProvider(widget.shopId));
    final activeId = ref.watch(activeShopIdProvider).value;
    return switch (shop) {
      AsyncData(:final value) => AppScaffold(
        title: value.name,
        body: _Details(
          shop: value,
          mapsEnabled: ref.watch(mapsEnabledProvider),
        ),
        bottomBar: AppBottomActionBar(
          child: Row(
            children: [
              Expanded(
                child: AppButton(
                  key: const Key('toggle-my-shops'),
                  label: value.inMyShops ? 'Remove shop' : 'Add shop',
                  loadingLabel: 'Saving…',
                  icon: value.inMyShops
                      ? Icons.bookmark_remove_outlined
                      : Icons.bookmark_add_outlined,
                  loading: _savingMyShops,
                  variant: AppButtonVariant.secondary,
                  expand: true,
                  onPressed: () => _toggleMyShops(value),
                ),
              ),
              const SizedBox(width: AppSpacing.s12),
              Expanded(
                child: AppButton(
                  key: const Key('shop-here'),
                  label: value.id == activeId ? 'Shopping here' : 'Shop here',
                  icon: Icons.storefront,
                  expand: true,
                  onPressed: value.id == activeId
                      ? null
                      : () => _shopHere(value),
                ),
              ),
            ],
          ),
        ),
      ),
      AsyncError(:final error) => AppScaffold(
        title: 'Shop',
        body: error is ApiException && error.status == 404
            ? const MessageView(
                icon: Icons.storefront_outlined,
                title: 'This shop is not available',
                message: 'It may have stopped using SevenPalette.',
              )
            : ErrorView(
                title: "We couldn't load this shop",
                onRetry: () => ref.invalidate(shopProvider(widget.shopId)),
              ),
      ),
      _ => const AppScaffold(title: 'Shop', body: LoadingView()),
    };
  }
}

class _Details extends StatelessWidget {
  const _Details({required this.shop, required this.mapsEnabled});

  final PublicShop shop;
  final bool mapsEnabled;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final photo = shop.photoUrl;
    final distance = shop.distanceKm;
    final latitude = shop.latitude;
    final longitude = shop.longitude;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        if (photo != null)
          AspectRatio(
            aspectRatio: 16 / 9,
            child: AppNetworkImage(
              url: photo,
              semanticLabel: 'Photo of ${shop.name}',
              rounded: true,
            ),
          ),
        const SizedBox(height: AppSpacing.s16),
        Semantics(
          header: true,
          child: Text(
            shop.name,
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        if (shop.address.place.isNotEmpty || distance != null) ...[
          const SizedBox(height: AppSpacing.s4),
          Text(
            [
              if (shop.address.place.isNotEmpty) shop.address.place,
              if (distance != null) '${formatDistance(distance)} away',
            ].join(' · '),
            style: textTheme.bodyLarge?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
        if (shop.inMyShops) ...[
          const SizedBox(height: AppSpacing.s8),
          const Align(
            alignment: AlignmentDirectional.centerStart,
            child: AppBadge(label: 'In My Shops', tone: AppTone.info),
          ),
        ],
        const SizedBox(height: AppSpacing.s12),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: AppButton(
            key: const Key('browse-products'),
            label: 'See products',
            icon: Icons.format_paint_outlined,
            variant: AppButtonVariant.secondary,
            onPressed: () => context.push(shopProductsPath(shop.id)),
          ),
        ),
        const SizedBox(height: AppSpacing.s16),
        AppSection(
          title: 'Pickup and delivery',
          lines: deliveryLines(shop.delivery),
        ),
        const SizedBox(height: AppSpacing.s16),
        AppSection(
          title: 'Address',
          lines: shop.address.lines,
          child: latitude == null || longitude == null
              ? null
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: AppSpacing.s12),
                    ShopLocationMap(
                      latitude: latitude,
                      longitude: longitude,
                      shopName: shop.name,
                      mapsEnabled: mapsEnabled,
                    ),
                  ],
                ),
        ),
      ],
    );
  }
}
