import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import '../storefront/storefront_models.dart';
import '../storefront/storefront_providers.dart';
import 'cart_models.dart';
import 'cart_store.dart';

/// Overridden in `main()` and in tests.
final cartStoreProvider = Provider<CartStore>(
  (ref) => throw UnimplementedError('cartStoreProvider is overridden'),
);

/// Adding needs the person's answer: the cart holds another shop's items.
class CartShopConflict implements Exception {
  const CartShopConflict(this.cartShopName);

  final String cartShopName;
}

/// The cart already has the most lines an order can have.
class CartFull implements Exception {
  const CartFull();
}

/// What the last cart check changed, to tell the person.
class CartCheckResult {
  const CartCheckResult({this.pricesChanged = 0, this.issues = 0});

  final int pricesChanged;
  final int issues;
}

/// The cart on this phone: one shop at a time, never mixed (CLAUDE.md §3;
/// owner 2026-11-20: adding from another shop asks before a new cart).
final cartProvider = AsyncNotifierProvider<CartNotifier, Cart?>(
  CartNotifier.new,
  retry: noRetry,
);

class CartNotifier extends AsyncNotifier<Cart?> {
  CartStore get _store => ref.read(cartStoreProvider);

  @override
  Future<Cart?> build() => _store.read();

  Future<void> _save(Cart? cart) async {
    final empty = cart == null || cart.lines.isEmpty;
    state = AsyncData(empty ? null : cart);
    if (empty) {
      await _store.clear();
    } else {
      await _store.write(cart);
    }
  }

  /// Adds [quantity] of [pack]. Throws [CartShopConflict] when the cart holds
  /// another shop's items (unless [startNewCart]) and [CartFull] at 50 lines.
  Future<void> add({
    required String shopId,
    required String shopName,
    required StorefrontProduct product,
    required StorefrontPack pack,
    required int quantity,
    CartShade? shade,
    bool startNewCart = false,
  }) async {
    var cart = state.value;
    if (cart != null && cart.shopId != shopId) {
      if (!startNewCart) throw CartShopConflict(cart.shopName);
      cart = null;
    }
    cart ??= Cart(shopId: shopId, shopName: shopName, lines: const []);
    final line = CartLine(
      packId: pack.id,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      packLabel: pack.label,
      pricePaise: pack.pricePaise,
      quantity: quantity,
      shade: shade,
    );
    final existing = cart.lines.indexWhere((l) => l.key == line.key);
    final List<CartLine> lines;
    if (existing >= 0) {
      final current = cart.lines[existing];
      lines = [...cart.lines]
        ..[existing] = current.copyWith(
          quantity: (current.quantity + quantity).clamp(1, Cart.maxQuantity),
          pricePaise: pack.pricePaise,
        );
    } else {
      if (cart.lines.length >= Cart.maxLines) throw const CartFull();
      lines = [...cart.lines, line];
    }
    await _save(cart.withLines(lines));
  }

  Future<void> setQuantity(String key, int quantity) async {
    final cart = state.value;
    if (cart == null) return;
    await _save(
      cart.withLines([
        for (final line in cart.lines)
          line.key == key
              ? line.copyWith(quantity: quantity.clamp(1, Cart.maxQuantity))
              : line,
      ]),
    );
  }

  Future<void> remove(String key) async {
    final cart = state.value;
    if (cart == null) return;
    await _save(
      cart.withLines(cart.lines.where((line) => line.key != key).toList()),
    );
  }

  Future<void> clear() => _save(null);

  /// Asks the shop for today's prices and availability and updates the
  /// lines. Throws `ApiException`; the cart stays as it was.
  Future<CartCheckResult> check() async {
    final cart = state.value;
    if (cart == null) return const CartCheckResult();
    final checked = await ref
        .read(storefrontRepositoryProvider)
        .checkCart(cart.shopId, cart.lines.map((l) => l.packId).toSet());
    final byPack = {for (final pack in checked) pack.packId: pack};
    var pricesChanged = 0;
    var issues = 0;
    final lines = [
      for (final line in cart.lines)
        () {
          final pack = byPack[line.packId];
          if (pack == null) {
            issues++;
            return line.copyWith(issue: () => CartLineIssue.noLongerSold);
          }
          if (pack.pricePaise != line.pricePaise) pricesChanged++;
          if (!pack.available) issues++;
          return line.copyWith(
            pricePaise: pack.pricePaise,
            issue: () => pack.available ? null : CartLineIssue.notAvailable,
          );
        }(),
    ];
    // State keeps the issues; the store keeps the new prices.
    final updated = cart.withLines(lines);
    state = AsyncData(updated);
    await _store.write(updated);
    return CartCheckResult(pricesChanged: pricesChanged, issues: issues);
  }
}

/// Items in the cart for the badge (0 while loading or empty).
final cartCountProvider = Provider<int>(
  (ref) => ref.watch(cartProvider).value?.itemCount ?? 0,
);
