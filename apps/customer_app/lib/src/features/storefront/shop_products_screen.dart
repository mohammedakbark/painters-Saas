import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../shops/shop_providers.dart';
import 'storefront_view.dart';

/// Any Live shop's products, opened from its shop page without adding it or
/// shopping there (D-037).
class ShopProductsScreen extends ConsumerWidget {
  const ShopProductsScreen({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = ref.watch(shopProvider(shopId)).value?.name;
    return AppScaffold(
      title: 'Products',
      subtitle: name,
      body: StorefrontView(shopId: shopId),
    );
  }
}
