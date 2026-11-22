import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../cart/cart_models.dart';
import '../../cart/cart_providers.dart';
import '../../delivery/delivery_locations.dart';
import '../../orders/checkout.dart';
import '../../orders/my_orders.dart';
import '../../providers.dart';
import '../../routing/paths.dart';
import '../../shops/shop_models.dart';
import '../../shops/shop_providers.dart';
import '../../sites/sites.dart';

abstract final class CheckoutMessages {
  static const chooseSite = 'Choose the site this order is for.';
  static const choosePlace = 'Choose where to deliver.';
  static const shopDoesNotDeliver =
      'This shop does not deliver. Choose pickup.';
  static String outOfRange(int km) =>
      'This place is outside the shop’s $km km delivery area.';
  static const totalChanged =
      'Prices or availability changed. Check your cart and try again.';
  static const placeFailed =
      "We couldn't place your order right now. Try again in a moment.";
}

/// Checkout (CUS-006, design "Customer App › Checkout"): pickup or delivery,
/// the painter's site or the customer's saved place, pay at pickup or
/// delivery (D-053), the totals and Place order. The server checks prices,
/// availability and the delivery area again; a changed total places nothing.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  // One key per checkout: a repeated tap or a retry never places twice.
  final String _requestId = newRequestId();
  Fulfilment _fulfilment = Fulfilment.pickup;
  String? _siteId;
  String? _placeId;
  bool _busy = false;
  String? _error;

  Future<void> _place({
    required Cart cart,
    required PublicShop shop,
    required bool painter,
    required CheckoutQuote quote,
  }) async {
    if (painter && _siteId == null) {
      setState(() => _error = CheckoutMessages.chooseSite);
      return;
    }
    if (_fulfilment == Fulfilment.delivery && quote.deliveryProblem != null) {
      setState(() => _error = _deliveryMessage(quote, shop));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final placed = await ref
          .read(myOrdersRepositoryProvider)
          .place(
            PlaceOrderDraft(
              shopId: cart.shopId,
              fulfilment: _fulfilment,
              siteId: painter ? _siteId : null,
              deliveryLocationId: !painter && _fulfilment == Fulfilment.delivery
                  ? _placeId
                  : null,
              lines: [
                for (final line in cart.lines)
                  (
                    packId: line.packId,
                    quantity: line.quantity,
                    shadeCode: line.shade?.code,
                    shadeName: line.shade?.name,
                  ),
              ],
              expectedTotalPaise: quote.totalPaise,
              clientRequestId: _requestId,
            ),
          );
      await ref.read(cartProvider.notifier).clear();
      ref.invalidate(myOrdersProvider);
      final siteName = painter ? _siteName() : null;
      if (painter) {
        ref.invalidate(sitesProvider);
        ref.invalidate(siteSpendProvider);
      }
      if (!mounted) return;
      context.pushReplacement(
        orderPlacedPath(placed.id, placed.number, siteName: siteName),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      if (error.code == 'order_total_changed') {
        // Show the cart with today's prices.
        await ref
            .read(cartProvider.notifier)
            .check()
            .catchError((_) => const CartCheckResult());
        if (!mounted) return;
        setState(() => _error = CheckoutMessages.totalChanged);
        return;
      }
      setState(() => _error = error.detail ?? CheckoutMessages.placeFailed);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _deliveryMessage(CheckoutQuote quote, PublicShop shop) =>
      switch (quote.deliveryProblem) {
        DeliveryProblem.shopDoesNotDeliver =>
          CheckoutMessages.shopDoesNotDeliver,
        DeliveryProblem.outOfRange => CheckoutMessages.outOfRange(
          shop.delivery.radiusKm ?? 0,
        ),
        _ => CheckoutMessages.choosePlace,
      };

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider).value;
    final profile = ref.watch(customerProfileProvider);
    if (cart == null) {
      return const AppScaffold(
        title: 'Checkout',
        body: MessageView(
          icon: Icons.shopping_cart_outlined,
          title: 'Your cart is empty',
          message: 'Add products from a shop, then check out.',
        ),
      );
    }
    final shop = ref.watch(shopProvider(cart.shopId));
    return switch ((shop, profile)) {
      (AsyncData(value: final shop), AsyncData(value: final profile)) =>
        _content(cart, shop, profile.isPainter),
      (AsyncError(), _) || (_, AsyncError()) => AppScaffold(
        title: 'Checkout',
        body: ErrorView(
          title: "We couldn't open checkout",
          onRetry: () {
            ref
              ..invalidate(shopProvider(cart.shopId))
              ..invalidate(customerProfileProvider);
          },
        ),
      ),
      _ => const AppScaffold(title: 'Checkout', body: LoadingView()),
    };
  }

  String? _siteName() => ref
      .read(sitesProvider)
      .value
      ?.where((s) => s.id == _siteId)
      .firstOrNull
      ?.name;

  Widget _content(Cart cart, PublicShop shop, bool painter) {
    ({double latitude, double longitude})? destination;
    if (_fulfilment == Fulfilment.delivery) {
      if (painter) {
        final site = ref
            .watch(sitesProvider)
            .value
            ?.where((s) => s.id == _siteId)
            .firstOrNull;
        if (site != null) {
          destination = (latitude: site.latitude, longitude: site.longitude);
        }
      } else {
        final place = ref
            .watch(deliveryLocationsProvider)
            .value
            ?.where((p) => p.id == _placeId)
            .firstOrNull;
        if (place != null) {
          destination = (latitude: place.latitude, longitude: place.longitude);
        }
      }
    }
    final quote = quoteCheckout(
      itemsPaise: cart.subtotalPaise,
      fulfilment: _fulfilment,
      delivery: shop.delivery,
      shopLatitude: shop.latitude,
      shopLongitude: shop.longitude,
      destination: destination,
    );
    final error = _error;
    final textTheme = Theme.of(context).textTheme;
    final delivers = shop.delivery.enabled;
    return AppScaffold(
      title: 'Checkout',
      subtitle: shop.name,
      bottomBar: AppBottomActionBar(
        child: AppButton(
          key: const Key('place-order'),
          label: 'Place order · ${formatRupees(quote.totalPaise)}',
          loadingLabel: 'Placing your order…',
          loading: _busy,
          expand: true,
          onPressed: () =>
              _place(cart: cart, shop: shop, painter: painter, quote: quote),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        children: [
          _heading('Pickup or delivery'),
          AppChoiceCard(
            key: const Key('fulfilment-pickup'),
            title: 'Pickup',
            description: 'Collect it at the shop.',
            icon: Icons.storefront_outlined,
            selected: _fulfilment == Fulfilment.pickup,
            onTap: _busy
                ? null
                : () => setState(() {
                    _fulfilment = Fulfilment.pickup;
                    _error = null;
                  }),
          ),
          const SizedBox(height: AppSpacing.s12),
          AppChoiceCard(
            key: const Key('fulfilment-delivery'),
            title: 'Delivery',
            description: delivers
                ? _deliveryTerms(shop.delivery)
                : 'This shop does not deliver.',
            icon: Icons.local_shipping_outlined,
            selected: _fulfilment == Fulfilment.delivery,
            onTap: _busy || !delivers
                ? null
                : () => setState(() {
                    _fulfilment = Fulfilment.delivery;
                    _error = null;
                  }),
          ),
          const SizedBox(height: AppSpacing.s24),
          if (painter)
            _SiteChoice(
              delivery: _fulfilment == Fulfilment.delivery,
              selected: _siteId,
              onChanged: _busy
                  ? null
                  : (id) => setState(() {
                      _siteId = id;
                      _error = null;
                    }),
            )
          else if (_fulfilment == Fulfilment.delivery)
            _PlaceChoice(
              selected: _placeId,
              onChanged: _busy
                  ? null
                  : (id) => setState(() {
                      _placeId = id;
                      _error = null;
                    }),
            )
          else ...[
            _heading('Collect from'),
            AppCard(
              child: Text(
                '${shop.name}\n${shop.address.lines.join(', ')}',
                style: textTheme.bodyLarge,
              ),
            ),
          ],
          if (_fulfilment == Fulfilment.delivery &&
              quote.deliveryProblem == DeliveryProblem.outOfRange) ...[
            const SizedBox(height: AppSpacing.s8),
            AppInlineMessage(
              message: _deliveryMessage(quote, shop),
              tone: AppTone.warning,
            ),
          ],
          const SizedBox(height: AppSpacing.s24),
          _heading('Payment'),
          AppCard(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.account_balance_wallet_outlined,
                  color: AppColors.brandPrimary,
                ),
                const SizedBox(width: AppSpacing.s12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _fulfilment == Fulfilment.pickup
                            ? 'Pay at pickup'
                            : 'Pay at delivery',
                        style: textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        'Cash, UPI or bank transfer. The shop records it.',
                        style: textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s12),
          AppCard(
            child: Column(
              children: [
                _line(
                  cart.itemCount == 1
                      ? 'Items (1)'
                      : 'Items (${cart.itemCount})',
                  formatRupees(quote.itemsPaise),
                ),
                _line(
                  'Delivery',
                  _fulfilment == Fulfilment.pickup
                      ? '—'
                      : quote.deliveryPaise == 0
                      ? 'Free'
                      : formatRupees(quote.deliveryPaise),
                ),
                const Divider(),
                _line(
                  'Total',
                  formatRupees(quote.totalPaise),
                  strong: true,
                  key: const Key('checkout-total'),
                ),
              ],
            ),
          ),
          if (error != null) ...[
            const SizedBox(height: AppSpacing.s16),
            AppInlineMessage(message: error, tone: AppTone.error),
          ],
        ],
      ),
    );
  }

  String _deliveryTerms(ShopDelivery delivery) {
    final charge = delivery.chargePaise ?? 0;
    final freeAbove = delivery.freeAbovePaise;
    final price = charge == 0 ? 'Free' : formatRupees(charge);
    return [
      price,
      if (charge > 0 && freeAbove != null)
        'free from ${formatRupees(freeAbove)}',
      if (delivery.radiusKm != null) 'within ${delivery.radiusKm} km',
    ].join(', ');
  }

  Widget _heading(String text) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.s8),
    child: Semantics(
      header: true,
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleMedium
            ?.copyWith(fontWeight: FontWeight.w700),
      ),
    ),
  );

  Widget _line(String label, String value, {bool strong = false, Key? key}) {
    final style = strong
        ? Theme.of(context).textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.w800)
        : Theme.of(context).textTheme.bodyLarge;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.s4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, key: key, style: style),
        ],
      ),
    );
  }
}

/// The painter's sites (D-049): every order is for one of them.
class _SiteChoice extends ConsumerWidget {
  const _SiteChoice({
    required this.delivery,
    required this.selected,
    required this.onChanged,
  });

  final bool delivery;
  final String? selected;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sites = ref.watch(sitesProvider);
    return _ChoiceList(
      title: delivery ? 'Deliver to site' : 'For site',
      addLabel: 'New site',
      addKey: const Key('checkout-new-site'),
      onAdd: () => context.push(newSitePath),
      emptyText: 'Add the site this order is for.',
      choices: sites.whenData(
        (list) => [
          for (final site in list)
            (id: site.id, title: site.name, description: site.address),
        ],
      ),
      selected: selected,
      onChanged: onChanged,
      onRetry: () => ref.invalidate(sitesProvider),
    );
  }
}

/// A normal customer's saved delivery places (D-061).
class _PlaceChoice extends ConsumerWidget {
  const _PlaceChoice({required this.selected, required this.onChanged});

  final String? selected;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final places = ref.watch(deliveryLocationsProvider);
    return _ChoiceList(
      title: 'Deliver to',
      addLabel: 'New place',
      addKey: const Key('checkout-new-place'),
      onAdd: () async {
        // A new place is chosen straight away.
        final id = await context.push<String>(newDeliveryPlacePath);
        if (id != null) onChanged?.call(id);
      },
      emptyText: 'Add where to deliver, such as Home.',
      choices: places.whenData(
        (list) => [
          for (final place in list)
            (id: place.id, title: place.label, description: place.address),
        ],
      ),
      selected: selected,
      onChanged: onChanged,
      onRetry: () => ref.invalidate(deliveryLocationsProvider),
    );
  }
}

class _ChoiceList extends StatelessWidget {
  const _ChoiceList({
    required this.title,
    required this.addLabel,
    required this.addKey,
    required this.onAdd,
    required this.emptyText,
    required this.choices,
    required this.selected,
    required this.onChanged,
    required this.onRetry,
  });

  final String title;
  final String addLabel;
  final Key addKey;
  final VoidCallback onAdd;
  final String emptyText;
  final AsyncValue<List<({String id, String title, String description})>>
  choices;
  final String? selected;
  final ValueChanged<String>? onChanged;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final onChanged = this.onChanged;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Semantics(header: true, child: appRequiredLabel(title)),
            ),
            AppButton(
              key: addKey,
              label: addLabel,
              icon: Icons.add,
              variant: AppButtonVariant.tertiary,
              onPressed: onAdd,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.s8),
        switch (choices) {
          AsyncData(value: final list) when list.isEmpty => AppInlineMessage(
            message: emptyText,
          ),
          AsyncData(value: final list) => Column(
            children: [
              for (final (index, choice) in list.indexed) ...[
                if (index > 0) const SizedBox(height: AppSpacing.s8),
                AppChoiceCard(
                  key: ValueKey('choice-${choice.id}'),
                  title: choice.title,
                  description: choice.description,
                  icon: Icons.location_on_outlined,
                  selected: choice.id == selected,
                  onTap: onChanged == null ? null : () => onChanged(choice.id),
                ),
              ],
            ],
          ),
          AsyncError() => AppInlineMessage(
            message: "We couldn't load these.",
            tone: AppTone.error,
            action: AppButton(
              label: 'Try again',
              variant: AppButtonVariant.tertiary,
              onPressed: onRetry,
            ),
          ),
          _ => const Center(child: AppSpinner.small()),
        },
      ],
    );
  }
}
