import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../routing/paths.dart';
import '../../shops/shop_providers.dart';
import 'shop_card.dart';

/// My Shops (CUS-002): the person's own list, private from the shops
/// (owner, 2026-11-20). Most recently added first.
class MyShopsScreen extends ConsumerWidget {
  const MyShopsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shops = ref.watch(myShopsProvider);
    final activeId = ref.watch(activeShopIdProvider).value;
    return AppScaffold(
      title: 'My Shops',
      actions: [
        AppIconButton(
          icon: Icons.search,
          tooltip: 'Find shops',
          onPressed: () => context.push(findShopsPath),
        ),
      ],
      body: switch (shops) {
        AsyncData(:final value) when value.isEmpty => MessageView(
          icon: Icons.storefront_outlined,
          title: 'No shops added',
          message:
              'Add the shops you buy from, so you can go back to them quickly.',
          action: AppButton(
            label: 'Find shops',
            icon: Icons.search,
            onPressed: () => context.push(findShopsPath),
          ),
        ),
        AsyncData(:final value) => RefreshIndicator(
          onRefresh: () => ref.refresh(myShopsProvider.future),
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            itemCount: value.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.s12),
            itemBuilder: (context, index) {
              final shop = value[index];
              return ShopCard(
                key: ValueKey('my-shop-${shop.id}'),
                shop: shop,
                active: shop.id == activeId,
                onTap: () => context.push(shopPath(shop.id)),
              );
            },
          ),
        ),
        AsyncError() => ErrorView(
          title: "We couldn't load My Shops",
          onRetry: () => ref.invalidate(myShopsProvider),
        ),
        _ => const LoadingView(message: 'Loading My Shops…'),
      },
    );
  }
}
