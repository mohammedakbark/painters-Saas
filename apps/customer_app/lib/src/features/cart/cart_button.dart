import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../cart/cart_providers.dart';
import '../../routing/paths.dart';

/// The cart icon with the number of items, in the top bar (CUS-004).
class CartButton extends ConsumerWidget {
  const CartButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => AppIconButton(
    key: const Key('cart-button'),
    icon: Icons.shopping_cart_outlined,
    tooltip: 'Cart',
    count: ref.watch(cartCountProvider),
    onPressed: () => context.push(cartPath),
  );
}
