import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../../shops/shop_models.dart';
import 'sign_out_button.dart';

/// Home of one shop. The API checks membership; non-members see "not found".
class ShopHomeScreen extends ConsumerWidget {
  const ShopHomeScreen({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shop = ref.watch(shopProvider(shopId));
    return Scaffold(
      appBar: AppBar(
        title: Text(shop.value?.name ?? 'Shop'),
        actions: const [SignOutButton()],
      ),
      body: SafeArea(
        child: shop.when(
          loading: () => const LoadingView(message: 'Loading your shop…'),
          error: (error, _) => error is ShopNotFound
              ? MessageView(
                  icon: Icons.search_off,
                  title: 'Shop not found',
                  message: "This shop doesn't exist, or your account doesn't have access to it.",
                  action: OutlinedButton(
                    onPressed: () => context.go('/shops'),
                    child: const Text('Go to your shops'),
                  ),
                )
              : ErrorView(
                  title: "We couldn't load this shop",
                  onRetry: () => ref.invalidate(shopProvider(shopId)),
                ),
          data: (shop) => _ShopOverview(shop: shop),
        ),
      ),
    );
  }
}

class _ShopOverview extends StatelessWidget {
  const _ShopOverview({required this.shop});

  final MyShop shop;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        Semantics(
          header: true,
          child: Text(shop.name, style: textTheme.headlineSmall),
        ),
        const SizedBox(height: AppSpacing.s4),
        Text(
          shopRoleLabel(shop.myRole),
          style: textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.s24),
        Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.s16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('Status', style: textTheme.titleMedium),
                    const SizedBox(width: AppSpacing.s12),
                    Chip(label: Text(shopStatusLabel(shop.status))),
                  ],
                ),
                const SizedBox(height: AppSpacing.s8),
                Text(
                  '${shopStatusDescription(shop.status)} Orders and products '
                  'will appear here as those features are released.',
                  style: textTheme.bodyLarge,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
