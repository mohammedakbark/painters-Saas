import 'package:customer_app/src/cart/cart_models.dart';
import 'package:customer_app/src/features/cart/cart_screen.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/storefront/storefront_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

const _tinted = [
  StorefrontPack(id: 'e1', label: '1 L', pricePaise: 50000, available: true),
  StorefrontPack(id: 'e4', label: '4 L', pricePaise: 180000, available: false),
];

FakeStorefrontRepository _storefront() => FakeStorefrontRepository({
  'k': [
    testProduct(
      'emulsion',
      'Tinted Emulsion',
      packs: _tinted,
      supportsShades: true,
    ),
    testProduct(
      'primer',
      'Primer',
      packs: const [
        StorefrontPack(
          id: 'p1',
          label: '1 L',
          pricePaise: 30000,
          available: true,
        ),
      ],
    ),
  ],
  't': [
    testProduct(
      'roller',
      'Paint Roller',
      category: 'Tools',
      packs: const [
        StorefrontPack(
          id: 'r1',
          label: '1 pc',
          pricePaise: 35000,
          available: true,
        ),
      ],
    ),
  ],
});

Cart _cartOf(String shopId, String shopName, List<CartLine> lines) =>
    Cart(shopId: shopId, shopName: shopName, lines: lines);

const _primerLine = CartLine(
  packId: 'p1',
  productId: 'primer',
  productName: 'Primer',
  brand: 'Asian Colours',
  packLabel: '1 L',
  pricePaise: 30000,
  quantity: 2,
);

Future<void> _open(
  WidgetTester tester, {
  FakeStorefrontRepository? storefront,
  FakeCartStore? cart,
  String activeShop = 'k',
}) => pumpApp(
  tester,
  auth: FakeAuthRepository(signedIn: true),
  profiles: FakeCustomerProfileRepository(
    profileOf('Meera', CustomerType.customer),
  ),
  shops: FakeShopsRepository([
    testShop('k', 'Kochi Paints'),
    testShop('t', 'Thrissur Colours', district: 'Thrissur'),
  ]),
  activeShop: FakeActiveShopStore(activeShop),
  storefront: storefront ?? _storefront(),
  cart: cart,
);

void main() {
  testWidgets('add a product with a quantity; the cart badge counts it', (
    tester,
  ) async {
    final store = FakeCartStore();
    await _open(tester, cart: store);
    await tapVisible(tester, find.text('Primer'));

    await tapVisible(tester, find.byKey(const Key('quantity-plus')));
    await tapVisible(tester, find.byKey(const Key('quantity-plus')));
    await tapVisible(tester, find.byKey(const Key('add-to-cart')));

    expect(find.text('Added to cart.'), findsOneWidget);
    expect(store.cart?.shopName, 'Kochi Paints');
    expect(store.cart?.lines.single.quantity, 3);
    expect(store.cart?.lines.single.pricePaise, 30000);
    expect(find.byTooltip('Cart, 3'), findsOneWidget);
  });

  testWidgets('a product in shades needs a shade: pick from the card', (
    tester,
  ) async {
    final store = FakeCartStore();
    await _open(tester, cart: store);
    await tapVisible(tester, find.text('Tinted Emulsion'));

    await tapVisible(tester, find.byKey(const Key('add-to-cart')));
    expect(find.text('Choose a shade first.'), findsOneWidget);
    expect(store.cart, isNull);

    await tapVisible(tester, find.byKey(const Key('choose-shade')));
    expect(find.text("Shop's pick"), findsOneWidget);
    await tapVisible(tester, find.byKey(const ValueKey('shade-BC-100')));
    expect(find.text('BC-100 Sunflower'), findsOneWidget);

    await tapVisible(tester, find.byKey(const Key('add-to-cart')));
    final line = store.cart!.lines.single;
    expect(line.shade?.code, 'BC-100');
    expect(line.shade?.previewHex, '#F2C230');
  });

  testWidgets('a shade that is not listed can be typed', (tester) async {
    final store = FakeCartStore();
    await _open(tester, cart: store);
    await tapVisible(tester, find.text('Tinted Emulsion'));
    await tapVisible(tester, find.byKey(const Key('choose-shade')));

    await tapVisible(tester, find.byKey(const Key('use-typed-shade')));
    expect(find.text('Enter the shade code.'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('shade-code')), 'x-7842');
    await tapVisible(tester, find.byKey(const Key('use-typed-shade')));
    await tapVisible(tester, find.byKey(const Key('add-to-cart')));

    expect(store.cart!.lines.single.shade?.code, 'X-7842');
    expect(store.cart!.lines.single.shade?.previewHex, isNull);
  });

  testWidgets('an unavailable size cannot be added (D-029)', (tester) async {
    await _open(tester);
    await tapVisible(tester, find.text('Tinted Emulsion'));
    await tapVisible(tester, find.text('4 L'));

    final add = tester.widget<AppButton>(find.byKey(const Key('add-to-cart')));
    expect(add.label, 'Not available');
    expect(add.onPressed, isNull);
  });

  testWidgets("another shop's product asks before starting a new cart", (
    tester,
  ) async {
    final store = FakeCartStore(_cartOf('k', 'Kochi Paints', [_primerLine]));
    await _open(tester, cart: store, activeShop: 't');
    await tapVisible(tester, find.text('Paint Roller'));
    await tapVisible(tester, find.byKey(const Key('add-to-cart')));

    expect(find.text('Start a new cart?'), findsOneWidget);
    await tapVisible(tester, find.byKey(const Key('keep-cart')));
    expect(store.cart!.shopId, 'k');

    await tapVisible(tester, find.byKey(const Key('add-to-cart')));
    await tapVisible(tester, find.byKey(const Key('start-new-cart')));
    expect(store.cart!.shopId, 't');
    expect(store.cart!.lines.single.productName, 'Paint Roller');
  });

  testWidgets('the cart: change quantity, remove, subtotal', (tester) async {
    final store = FakeCartStore(
      _cartOf('k', 'Kochi Paints', [
        _primerLine,
        const CartLine(
          packId: 'e1',
          productId: 'emulsion',
          productName: 'Tinted Emulsion',
          brand: 'Asian Colours',
          packLabel: '1 L',
          pricePaise: 50000,
          quantity: 1,
          shade: CartShade(code: 'BC-100', name: 'Sunflower'),
        ),
      ]),
    );
    await _open(tester, cart: store);
    await tapVisible(tester, find.byKey(const Key('cart-button')));

    expect(find.byType(CartScreen), findsOneWidget);
    expect(find.text('Shade BC-100 Sunflower'), findsOneWidget);
    expect(find.text('₹1,100'), findsOneWidget);
    expect(find.text('Subtotal (3 items)'), findsOneWidget);

    await tapVisible(
      tester,
      find.descendant(
        of: find.byKey(const ValueKey('line-e1|BC-100')),
        matching: find.byKey(const Key('quantity-plus')),
      ),
    );
    expect(find.text('₹1,600'), findsOneWidget);
    expect(store.cart!.lines.last.quantity, 2);

    await tapVisible(tester, find.byTooltip('Remove Primer'));
    expect(find.text('₹1,000'), findsWidgets);
    expect(store.cart!.lines.single.productName, 'Tinted Emulsion');

    await tapVisible(tester, find.byTooltip('Remove Tinted Emulsion'));
    expect(find.text('Your cart is empty'), findsOneWidget);
    expect(store.cart, isNull);
  });

  testWidgets('opening the cart updates prices and flags items', (
    tester,
  ) async {
    final storefront = _storefront()
      ..todayPrices['p1'] = 32000
      ..unavailableToday.add('e1');
    final store = FakeCartStore(
      _cartOf('k', 'Kochi Paints', [
        _primerLine,
        const CartLine(
          packId: 'e1',
          productId: 'emulsion',
          productName: 'Tinted Emulsion',
          brand: null,
          packLabel: '1 L',
          pricePaise: 50000,
          quantity: 1,
        ),
      ]),
    );
    await _open(tester, storefront: storefront, cart: store);
    await tapVisible(tester, find.byKey(const Key('cart-button')));

    expect(storefront.checks, 1);
    expect(
      find.text(
        '1 price has changed since you added it. 1 item cannot be ordered now.',
      ),
      findsOneWidget,
    );
    expect(find.text('Not available now'), findsOneWidget);
    // Only the primer counts: 2 × ₹320.
    expect(
      tester.widget<Text>(find.byKey(const Key('cart-subtotal'))).data,
      '₹640',
    );
    expect(store.cart!.lines.first.pricePaise, 32000);
  });

  testWidgets('a failed check keeps the cart and offers Try again', (
    tester,
  ) async {
    final storefront = _storefront()..checkFails = true;
    await _open(
      tester,
      storefront: storefront,
      cart: FakeCartStore(_cartOf('k', 'Kochi Paints', [_primerLine])),
    );
    await tapVisible(tester, find.byKey(const Key('cart-button')));

    expect(
      find.textContaining("We couldn't check today's prices"),
      findsOneWidget,
    );
    expect(find.text('Primer'), findsOneWidget);
    storefront.checkFails = false;
    await tapVisible(tester, find.text('Try again'));
    expect(find.textContaining("We couldn't check"), findsNothing);
  });

  testWidgets('sign-out empties the cart on this phone', (tester) async {
    final store = FakeCartStore(_cartOf('k', 'Kochi Paints', [_primerLine]));
    await _open(tester, cart: store);
    await tester.tap(
      find.descendant(
        of: find.byType(AppBottomNav),
        matching: find.text('More'),
      ),
    );
    await tester.pumpAndSettle();
    await tapVisible(tester, find.byKey(const Key('sign-out')));

    expect(store.cart, isNull);
  });
}
