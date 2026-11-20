import 'package:customer_app/src/api/api_client.dart';
import 'package:customer_app/src/cart/cart_models.dart';
import 'package:customer_app/src/delivery/delivery_locations.dart';
import 'package:customer_app/src/orders/checkout.dart';
import 'package:customer_app/src/orders/my_orders.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/shops/shop_models.dart';
import 'package:customer_app/src/sites/sites.dart';
import 'package:customer_app/src/storefront/storefront_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

Finder _tab(String label) =>
    find.descendant(of: find.byType(AppBottomNav), matching: find.text(label));

const _primerLine = CartLine(
  packId: 'p1',
  productId: 'primer',
  productName: 'Primer',
  brand: 'Asian Colours',
  packLabel: '1 L',
  pricePaise: 30000,
  quantity: 2,
);

/// Within the shop's 8 km (the shop pin is 9.98, 76.3).
const _home = DeliveryLocation(
  id: 'home',
  label: 'Home',
  address: 'Flat 3C, Lotus Apartments, Kochi',
  latitude: 10.0,
  longitude: 76.31,
);

/// Thrissur, far outside the area.
const _far = DeliveryLocation(
  id: 'far',
  label: 'Office',
  address: 'Round North, Thrissur',
  latitude: 10.52,
  longitude: 76.21,
);

const _villa = CustomerSite(
  id: 'v',
  name: 'Green Villa',
  ownerName: null,
  address: 'Green Villa, Kakkanad, Kochi',
  latitude: 10.0,
  longitude: 76.33,
  archived: false,
);

Future<void> _openCheckout(
  WidgetTester tester, {
  CustomerType type = CustomerType.customer,
  FakeMyOrdersRepository? orders,
  FakeDeliveryLocationsRepository? places,
  FakeSitesRepository? sites,
  FakeCartStore? cart,
}) async {
  await pumpApp(
    tester,
    auth: FakeAuthRepository(signedIn: true),
    profiles: FakeCustomerProfileRepository(profileOf('Meera', type)),
    shops: FakeShopsRepository([testShop('k', 'Kochi Paints', delivers: true)]),
    activeShop: FakeActiveShopStore('k'),
    storefront: FakeStorefrontRepository({
      'k': [
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
    }),
    cart:
        cart ??
        FakeCartStore(
          const Cart(
            shopId: 'k',
            shopName: 'Kochi Paints',
            lines: [_primerLine],
          ),
        ),
    orders: orders,
    places: places,
    sites: sites,
  );
  await tapVisible(tester, find.byKey(const Key('cart-button')));
  await tapVisible(tester, find.byKey(const Key('checkout')));
}

/// Scrolls the checkout list until [finder] is built and visible.
Future<void> _show(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    200,
    scrollable: find.byType(Scrollable).last,
  );
  await tester.pumpAndSettle();
}

Future<String> _total(WidgetTester tester) async {
  await _show(tester, find.byKey(const Key('checkout-total')));
  return tester.widget<Text>(find.byKey(const Key('checkout-total'))).data!;
}

void main() {
  group('quoteCheckout', () {
    const delivery = ShopDelivery(
      enabled: true,
      chargePaise: 5000,
      freeAbovePaise: 100000,
      radiusKm: 8,
    );

    test('pickup has no delivery charge', () {
      final quote = quoteCheckout(
        itemsPaise: 60000,
        fulfilment: Fulfilment.pickup,
        delivery: delivery,
      );
      expect(quote.totalPaise, 60000);
      expect(quote.deliveryProblem, isNull);
    });

    test('delivery adds the charge, free from the free-above amount', () {
      final ({double latitude, double longitude}) near = (
        latitude: 10.0,
        longitude: 76.31,
      );
      final charged = quoteCheckout(
        itemsPaise: 60000,
        fulfilment: Fulfilment.delivery,
        delivery: delivery,
        shopLatitude: 9.98,
        shopLongitude: 76.3,
        destination: near,
      );
      expect(charged.deliveryPaise, 5000);
      expect(charged.deliveryProblem, isNull);
      final free = quoteCheckout(
        itemsPaise: 100000,
        fulfilment: Fulfilment.delivery,
        delivery: delivery,
        shopLatitude: 9.98,
        shopLongitude: 76.3,
        destination: near,
      );
      expect(free.deliveryPaise, 0);
    });

    test('outside the radius or a shop that does not deliver', () {
      final far = quoteCheckout(
        itemsPaise: 60000,
        fulfilment: Fulfilment.delivery,
        delivery: delivery,
        shopLatitude: 9.98,
        shopLongitude: 76.3,
        destination: (latitude: 10.52, longitude: 76.21),
      );
      expect(far.deliveryProblem, DeliveryProblem.outOfRange);
      expect(far.distanceKm, greaterThan(50));
      final none = quoteCheckout(
        itemsPaise: 60000,
        fulfilment: Fulfilment.delivery,
        delivery: const ShopDelivery(enabled: false),
      );
      expect(none.deliveryProblem, DeliveryProblem.shopDoesNotDeliver);
    });

    test('request ids are version-4 UUIDs and differ', () {
      final a = newRequestId();
      expect(
        RegExp(
          r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        ).hasMatch(a),
        isTrue,
      );
      expect(newRequestId(), isNot(a));
    });
  });

  testWidgets('a customer places a pickup order; the cart is cleared', (
    tester,
  ) async {
    final orders = FakeMyOrdersRepository();
    final cart = FakeCartStore(
      const Cart(shopId: 'k', shopName: 'Kochi Paints', lines: [_primerLine]),
    );
    await _openCheckout(tester, orders: orders, cart: cart);

    expect(await _total(tester), '₹600');
    await tapVisible(tester, find.byKey(const Key('place-order')));

    final draft = orders.placed.single;
    expect(draft.fulfilment, Fulfilment.pickup);
    expect(draft.expectedTotalPaise, 60000);
    expect(draft.lines.single.packId, 'p1');
    expect(draft.siteId, isNull);
    expect(cart.cart, isNull);
    expect(find.text('Order placed'), findsWidgets);
    expect(find.byKey(const Key('track-order')), findsOneWidget);
  });

  testWidgets('delivery to a saved place adds the charge; far is refused', (
    tester,
  ) async {
    final orders = FakeMyOrdersRepository();
    await _openCheckout(
      tester,
      orders: orders,
      places: FakeDeliveryLocationsRepository([_home, _far]),
    );

    await tapVisible(tester, find.byKey(const Key('fulfilment-delivery')));
    await tapVisible(tester, find.byKey(const Key('choice-far')));
    expect(
      find.text('This place is outside the shop’s 8 km delivery area.'),
      findsOneWidget,
    );
    await tapVisible(tester, find.byKey(const Key('place-order')));
    expect(orders.placed, isEmpty);

    await tester.scrollUntilVisible(
      find.byKey(const Key('choice-home')),
      -200,
      scrollable: find.byType(Scrollable).last,
    );
    await tapVisible(tester, find.byKey(const Key('choice-home')));
    expect(await _total(tester), '₹650');
    await tapVisible(tester, find.byKey(const Key('place-order')));
    expect(orders.placed.single.deliveryLocationId, 'home');
    expect(orders.placed.single.expectedTotalPaise, 65000);
  });

  testWidgets('a painter must choose a site', (tester) async {
    final orders = FakeMyOrdersRepository();
    await _openCheckout(
      tester,
      type: CustomerType.painter,
      orders: orders,
      sites: FakeSitesRepository([_villa]),
    );

    await tapVisible(tester, find.byKey(const Key('place-order')));
    await _show(tester, find.text('Choose the site this order is for.'));
    expect(find.text('Choose the site this order is for.'), findsOneWidget);
    expect(orders.placed, isEmpty);

    await tapVisible(tester, find.byKey(const Key('choice-v')));
    await tapVisible(tester, find.byKey(const Key('place-order')));
    expect(orders.placed.single.siteId, 'v');
  });

  testWidgets('a changed total places nothing and says so', (tester) async {
    final orders = FakeMyOrdersRepository()
      ..rejectNextPlace = const ApiException(
        status: 409,
        code: 'order_total_changed',
      );
    final cart = FakeCartStore(
      const Cart(shopId: 'k', shopName: 'Kochi Paints', lines: [_primerLine]),
    );
    await _openCheckout(tester, orders: orders, cart: cart);
    await tapVisible(tester, find.byKey(const Key('place-order')));
    await _show(
      tester,
      find.text(
        'Prices or availability changed. Check your cart and try again.',
      ),
    );
    expect(
      find.text(
        'Prices or availability changed. Check your cart and try again.',
      ),
      findsOneWidget,
    );
    expect(cart.cart, isNotNull);
  });

  testWidgets('My Orders lists orders; the order page answers a substitute '
      'and cancels', (tester) async {
    final orders = FakeMyOrdersRepository(
      orders: [
        MyOrder.fromJson({
          'id': 'o1',
          'number': 1048,
          'shop': {'id': 'k', 'name': 'Kochi Paints'},
          'status': 'PACKING',
          'fulfilment': 'PICKUP',
          'siteLabel': null,
          'deliveryAddress': null,
          'items': [
            {
              'id': 'i1',
              'productName': 'Primer',
              'brandName': null,
              'packLabel': '4 L',
              'shadeCode': null,
              'shadeName': null,
              'unitPricePaise': 110000,
              'quantity': 1,
              'returnedQuantity': 0,
              'status': 'NOT_AVAILABLE',
              'shopNote': 'Stock not available.',
              'substituteForId': null,
            },
            {
              'id': 'i2',
              'productName': 'Primer',
              'brandName': null,
              'packLabel': '1 L',
              'shadeCode': null,
              'shadeName': null,
              'unitPricePaise': 30000,
              'quantity': 4,
              'returnedQuantity': 0,
              'status': 'SUBSTITUTE_OFFERED',
              'shopNote': null,
              'substituteForId': 'i1',
            },
          ],
          'totals': {'itemsPaise': 0, 'deliveryPaise': 0, 'totalPaise': 0},
          'payment': {'status': 'UNPAID', 'method': null},
          'cancelled': null,
          'placedAt': '2026-11-20T04:28:00.000Z',
          'canCancel': true,
        }),
      ],
    );
    await pumpApp(
      tester,
      auth: FakeAuthRepository(signedIn: true),
      profiles: FakeCustomerProfileRepository(
        profileOf('Meera', CustomerType.customer),
      ),
      orders: orders,
    );
    await tester.tap(_tab('Orders'));
    await tester.pumpAndSettle();

    expect(find.text('Kochi Paints'), findsOneWidget);
    expect(find.text('A substitute needs your answer'), findsOneWidget);

    await tapVisible(tester, find.byKey(const ValueKey('order-o1')));
    expect(find.text('Order #1048'), findsOneWidget);
    expect(find.byType(AppProgressSteps), findsOneWidget);

    await tapVisible(tester, find.byKey(const ValueKey('accept-i2')));
    expect(find.text('Substitute accepted.'), findsOneWidget);
    expect(orders.orders.single.openSubstitutes, isEmpty);

    await tapVisible(tester, find.byKey(const Key('cancel-order')));
    await tapVisible(tester, find.text('Cancel order').last);
    expect(orders.orders.single.status, OrderStatus.cancelled);
    expect(find.text('You cancelled this order.'), findsOneWidget);
  });
}
