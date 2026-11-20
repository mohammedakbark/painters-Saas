import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../providers.dart';
import '../../routing/paths.dart';
import '../../shops/shop_providers.dart';
import '../cart/cart_button.dart';
import '../storefront/storefront_view.dart';

/// Home: the storefront of the shop the person is shopping from (CUS-003),
/// or a way to choose a shop (CUS-002).
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
        const CartButton(),
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
    if (shop case AsyncError(:final error)
        when error is ApiException && error.status == 404) {
      // The shop is no longer Live: forget it and offer to choose again.
      Future.microtask(() => ref.read(activeShopIdProvider.notifier).clear());
    }
    return StorefrontView(
      key: ValueKey('storefront-$shopId'),
      shopId: shopId,
      header: Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.s12),
        child: switch (shop) {
          // The design (UI-104): a dark "Shopping from" banner; tapping it
          // changes the shop.
          AsyncData(:final value) => AppContextBanner(
            key: const Key('change-shop'),
            caption: 'Shopping from',
            title: value.name,
            actionLabel: 'Change',
            leading: value.thumbUrl == null
                ? null
                : AppNetworkImage(
                    url: value.thumbUrl!,
                    semanticLabel: value.name,
                    rounded: true,
                  ),
            onTap: () => context.push(findShopsPath),
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
          _ => const SizedBox(
            height: AppSpacing.s48,
            child: Center(child: AppSpinner.small()),
          ),
        },
      ),
    );
  }
}

String _firstName(String name) => name.trim().split(RegExp(r'\s+')).first;
