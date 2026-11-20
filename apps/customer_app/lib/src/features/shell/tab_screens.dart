import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../providers.dart';
import '../../routing/paths.dart';
import '../../shops/shop_providers.dart';
import '../shops/shop_card.dart';

/// Home: the shop the person is shopping from, or a way to choose one
/// (CUS-002). The shop's products come with the storefront (CUS-003).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = ref.watch(customerProfileProvider).value?.displayName;
    final activeId = ref.watch(activeShopIdProvider);
    return AppScaffold(
      title: name == null ? 'Home' : 'Hello, ${_firstName(name)}',
      subtitle: AppBrand.productName,
      actions: [
        AppIconButton(
          icon: Icons.search,
          tooltip: 'Find shops',
          onPressed: () => context.push(findShopsPath),
        ),
      ],
      body: switch (activeId) {
        AsyncData(value: final String id) => _ActiveShop(shopId: id),
        AsyncData() || AsyncError() => MessageView(
          icon: Icons.storefront_outlined,
          title: 'Choose a shop',
          message:
              'Find a paint shop near you, then tap Shop here to shop from it.',
          action: AppButton(
            key: const Key('home-find-shops'),
            label: 'Find shops',
            icon: Icons.search,
            onPressed: () => context.push(findShopsPath),
          ),
        ),
        _ => const LoadingView(),
      },
    );
  }
}

class _ActiveShop extends ConsumerWidget {
  const _ActiveShop({required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shop = ref.watch(shopProvider(shopId));
    final textTheme = Theme.of(context).textTheme;
    if (shop case AsyncError(:final error)
        when error is ApiException && error.status == 404) {
      // The shop is no longer Live: forget it and offer to choose again.
      Future.microtask(() => ref.read(activeShopIdProvider.notifier).clear());
    }
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        Text(
          'Shopping from',
          style: textTheme.labelLarge?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.s8),
        switch (shop) {
          AsyncData(:final value) => ShopCard(
            shop: value,
            active: true,
            onTap: () => context.push(shopPath(value.id)),
          ),
          AsyncError() => AppInlineMessage(
            message: "We couldn't load your shop.",
            tone: AppTone.error,
            action: AppButton(
              label: 'Try again',
              variant: AppButtonVariant.tertiary,
              onPressed: () => ref.invalidate(shopProvider(shopId)),
            ),
          ),
          _ => const LoadingView(),
        },
        const SizedBox(height: AppSpacing.s12),
        AppButton(
          key: const Key('change-shop'),
          label: 'Change shop',
          icon: Icons.swap_horiz,
          variant: AppButtonVariant.secondary,
          onPressed: () => context.push(findShopsPath),
        ),
        const SizedBox(height: AppSpacing.s24),
        Text(
          "This shop's products will be listed here.",
          textAlign: TextAlign.center,
          style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

/// Orders (CUS-001): empty until ordering comes to the Customer App.
class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) => const AppScaffold(
    title: 'Orders',
    body: MessageView(
      icon: Icons.receipt_long_outlined,
      title: 'No orders yet',
      message: 'Orders you place with a shop will appear here.',
    ),
  );
}

/// Sites, painters only (CUS-001): empty until the sites feature.
class SitesScreen extends StatelessWidget {
  const SitesScreen({super.key});

  @override
  Widget build(BuildContext context) => const AppScaffold(
    title: 'Sites',
    body: MessageView(
      icon: Icons.location_on_outlined,
      title: 'No sites yet',
      message: 'The sites you work on will appear here.',
    ),
  );
}

String _firstName(String name) => name.trim().split(RegExp(r'\s+')).first;
