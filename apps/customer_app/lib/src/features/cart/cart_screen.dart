import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../cart/cart_models.dart';
import '../../cart/cart_providers.dart';
import '../../routing/paths.dart';

/// The cart (CUS-004): one shop's items with size, shade, price and
/// quantity. Opening it checks today's prices and availability with the
/// shop. Checkout (pickup or delivery, placing the order) comes next.
class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  bool _checking = false;
  String? _notice;
  bool _checkFailed = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      // "Added to cart" is done once the cart is open.
      if (mounted) ScaffoldMessenger.of(context).hideCurrentSnackBar();
      return _check();
    });
  }

  Future<void> _check() async {
    if (ref.read(cartProvider).value == null) {
      // Wait for the stored cart on a cold start.
      await ref.read(cartProvider.future);
    }
    if (!mounted || ref.read(cartProvider).value == null) return;
    setState(() {
      _checking = true;
      _checkFailed = false;
    });
    try {
      final result = await ref.read(cartProvider.notifier).check();
      if (!mounted) return;
      setState(() {
        _notice = [
          if (result.pricesChanged > 0)
            result.pricesChanged == 1
                ? '1 price has changed since you added it.'
                : '${result.pricesChanged} prices have changed since you added them.',
          if (result.issues > 0)
            result.issues == 1
                ? '1 item cannot be ordered now.'
                : '${result.issues} items cannot be ordered now.',
        ].join(' ');
      });
    } on Object {
      if (mounted) setState(() => _checkFailed = true);
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final value = cart.value;
    return AppScaffold(
      title: 'Cart',
      subtitle: value?.shopName,
      body: switch (cart) {
        AsyncData(value: null) => MessageView(
          icon: Icons.shopping_cart_outlined,
          title: 'Your cart is empty',
          message: 'Add products from a shop to order them together.',
          action: AppButton(
            label: 'Browse products',
            icon: Icons.storefront_outlined,
            onPressed: () => context.go(homePath),
          ),
        ),
        AsyncData(value: final Cart cart) => _Lines(
          cart: cart,
          checking: _checking,
          notice: _notice,
          checkFailed: _checkFailed,
          onRetryCheck: _check,
        ),
        AsyncError() => ErrorView(
          title: "We couldn't open your cart",
          onRetry: () => ref.invalidate(cartProvider),
        ),
        _ => const LoadingView(),
      },
      bottomBar: value == null
          ? null
          : AppBottomActionBar(child: _Summary(cart: value)),
    );
  }
}

class _Lines extends ConsumerWidget {
  const _Lines({
    required this.cart,
    required this.checking,
    required this.notice,
    required this.checkFailed,
    required this.onRetryCheck,
  });

  final Cart cart;
  final bool checking;
  final String? notice;
  final bool checkFailed;
  final VoidCallback onRetryCheck;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notice = this.notice;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        if (checking)
          const Padding(
            padding: EdgeInsets.only(bottom: AppSpacing.s12),
            child: Row(
              children: [
                AppSpinner.small(),
                SizedBox(width: AppSpacing.s8),
                Text('Checking prices with the shop…'),
              ],
            ),
          ),
        if (checkFailed)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.s12),
            child: AppInlineMessage(
              message:
                  "We couldn't check today's prices. The shop confirms them "
                  'when you order.',
              tone: AppTone.warning,
              action: AppButton(
                label: 'Try again',
                variant: AppButtonVariant.tertiary,
                onPressed: onRetryCheck,
              ),
            ),
          ),
        if (notice != null && notice.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.s12),
            child: AppInlineMessage(message: notice, tone: AppTone.warning),
          ),
        for (final line in cart.lines) ...[
          _LineCard(line: line),
          const SizedBox(height: AppSpacing.s12),
        ],
        const SizedBox(height: AppSpacing.s4),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: AppButton(
            label: 'Add more from ${cart.shopName}',
            icon: Icons.add,
            variant: AppButtonVariant.tertiary,
            onPressed: () => context.go(homePath),
          ),
        ),
      ],
    );
  }
}

class _LineCard extends ConsumerWidget {
  const _LineCard({required this.line});

  final CartLine line;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    final cart = ref.read(cartProvider.notifier);
    final shade = line.shade;
    final issue = line.issue;
    return AppCard(
      key: ValueKey('line-${line.key}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      line.productName,
                      style: textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      [?line.brand, line.packLabel].join(' · '),
                      style: textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              AppIconButton(
                icon: Icons.delete_outline,
                tooltip: 'Remove ${line.productName}',
                onPressed: () => cart.remove(line.key),
              ),
            ],
          ),
          if (shade != null) ...[
            const SizedBox(height: AppSpacing.s8),
            Row(
              children: [
                AppColorSwatch(hex: shade.previewHex, size: AppSpacing.s24),
                const SizedBox(width: AppSpacing.s8),
                Expanded(
                  child: Text(
                    'Shade ${shade.label}',
                    style: textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          ],
          if (issue != null) ...[
            const SizedBox(height: AppSpacing.s8),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: AppBadge(
                label: switch (issue) {
                  CartLineIssue.notAvailable => 'Not available now',
                  CartLineIssue.noLongerSold => 'No longer sold',
                },
                tone: AppTone.warning,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.s12),
          Row(
            children: [
              AppQuantityStepper(
                label: 'Quantity of ${line.productName}',
                value: line.quantity,
                max: Cart.maxQuantity,
                onChanged: issue == CartLineIssue.noLongerSold
                    ? null
                    : (value) => cart.setQuantity(line.key, value),
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatRupees(line.totalPaise),
                    style: textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      decoration: issue == null
                          ? null
                          : TextDecoration.lineThrough,
                    ),
                  ),
                  if (line.quantity > 1)
                    Text(
                      '${formatRupees(line.pricePaise)} each',
                      style: textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.cart});

  final Cart cart;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                cart.itemCount == 1
                    ? 'Subtotal (1 item)'
                    : 'Subtotal (${cart.itemCount} items)',
                style: textTheme.bodyLarge,
              ),
            ),
            Text(
              formatRupees(cart.subtotalPaise),
              key: const Key('cart-subtotal'),
              style: textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.s4),
        Text(
          'Pickup or delivery and the delivery charge are chosen at checkout, '
          'which comes in the next update. You pay the shop at pickup or '
          'delivery.',
          style: textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
        ),
      ],
    );
  }
}
