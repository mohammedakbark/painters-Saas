import 'package:customer_app/src/features/shops/find_shops_screen.dart';
import 'package:customer_app/src/features/shops/shop_screen.dart';
import 'package:customer_app/src/location/location_service.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/shops/shop_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

Finder _tab(String label) =>
    find.descendant(of: find.byType(AppBottomNav), matching: find.text(label));

/// Nearest first: Kochi Paints, Thrissur Colours, ABC Paints.
List<PublicShop> _shops() => [
  testShop('k', 'Kochi Paints', delivers: true, distanceKm: 0.8),
  testShop('t', 'Thrissur Colours', district: 'Thrissur', distanceKm: 62.4),
  testShop('a', 'ABC Paints', district: 'Kozhikode', distanceKm: 140),
];

Future<void> _signedIn(
  WidgetTester tester, {
  FakeShopsRepository? shops,
  FakeLocationService? location,
  FakeActiveShopStore? activeShop,
  FakeAuthRepository? auth,
}) => pumpApp(
  tester,
  auth: auth ?? FakeAuthRepository(signedIn: true),
  profiles: FakeCustomerProfileRepository(
    profileOf('Meera', CustomerType.customer),
  ),
  shops: shops ?? FakeShopsRepository(_shops()),
  location: location,
  activeShop: activeShop,
);

List<String> _listedNames(WidgetTester tester) => [
  for (final card in tester.widgetList<Text>(
    find.descendant(
      of: find.byType(FindShopsScreen),
      matching: find.byWidgetPredicate(
        (w) =>
            w is Text &&
            ['Kochi Paints', 'Thrissur Colours', 'ABC Paints'].contains(w.data),
      ),
    ),
  ))
    card.data!,
];

void main() {
  testWidgets('Home without a shop offers Find shops; the list is by name', (
    tester,
  ) async {
    await _signedIn(tester);
    expect(find.text('Choose a shop'), findsOneWidget);

    await tapVisible(tester, find.byKey(const Key('home-find-shops')));
    expect(find.text('3 shops'), findsOneWidget);
    expect(_listedNames(tester), [
      'ABC Paints',
      'Kochi Paints',
      'Thrissur Colours',
    ]);
    expect(find.text(FindShopsMessages.noPosition), findsOneWidget);
    expect(find.text('Delivers'), findsOneWidget);
    expect(find.text('Pickup only'), findsNWidgets(2));
  });

  testWidgets('Near me sorts nearest first and shows the distance (D-038)', (
    tester,
  ) async {
    final shops = FakeShopsRepository(_shops());
    final location = FakeLocationService();
    await _signedIn(tester, shops: shops, location: location);
    await tapVisible(tester, find.byKey(const Key('home-find-shops')));

    await tapVisible(tester, find.byKey(const Key('near-me')));

    expect(location.requests, 1);
    expect(shops.findCalls.last, isA<NearPosition>());
    expect(find.text(FindShopsMessages.nearYou), findsOneWidget);
    expect(_listedNames(tester), [
      'Kochi Paints',
      'Thrissur Colours',
      'ABC Paints',
    ]);
    expect(find.textContaining('800 m'), findsOneWidget);
    expect(find.textContaining('62.4 km'), findsOneWidget);
  });

  testWidgets('without location, a chosen district comes first', (
    tester,
  ) async {
    final shops = FakeShopsRepository(_shops());
    await _signedIn(
      tester,
      shops: shops,
      location: FakeLocationService(
        const LocationUnavailable(LocationProblem.permissionDenied),
      ),
    );
    await tapVisible(tester, find.byKey(const Key('home-find-shops')));

    await tapVisible(tester, find.byKey(const Key('near-me')));
    expect(find.text(FindShopsMessages.locationDenied), findsOneWidget);

    await tapVisible(tester, find.byKey(const Key('choose-district')));
    expect(find.text('Choose your district'), findsOneWidget);
    await tapVisible(tester, find.text('Thrissur (1 shop)'));

    expect(shops.findCalls.last, isA<NearDistrict>());
    expect(find.text('Shops in Thrissur first'), findsOneWidget);
    expect(_listedNames(tester).first, 'Thrissur Colours');
  });

  testWidgets('blocked location points to Settings', (tester) async {
    final location = FakeLocationService(
      const LocationUnavailable(LocationProblem.permissionDeniedForever),
    );
    await _signedIn(tester, location: location);
    await tapVisible(tester, find.byKey(const Key('home-find-shops')));
    await tapVisible(tester, find.byKey(const Key('near-me')));

    expect(find.text(FindShopsMessages.locationBlocked), findsOneWidget);
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    expect(location.settingsOpened, 1);
  });

  testWidgets('Load more appends the next page', (tester) async {
    await _signedIn(tester, shops: FakeShopsRepository(_shops(), pageSize: 2));
    await tapVisible(tester, find.byKey(const Key('home-find-shops')));
    expect(_listedNames(tester), ['ABC Paints', 'Kochi Paints']);

    await tapVisible(tester, find.text('Load more'));
    expect(_listedNames(tester), [
      'ABC Paints',
      'Kochi Paints',
      'Thrissur Colours',
    ]);
    expect(find.text('Load more'), findsNothing);
  });

  testWidgets(
    'shop page: delivery terms, add to and remove from My Shops (D-037)',
    (tester) async {
      final shops = FakeShopsRepository(_shops());
      await _signedIn(tester, shops: shops);
      await tapVisible(tester, find.byKey(const Key('home-find-shops')));
      await tapVisible(tester, find.text('Kochi Paints'));

      expect(find.byType(ShopScreen), findsOneWidget);
      expect(find.text('Pickup at the shop'), findsOneWidget);
      expect(find.text('Delivers within 8 km'), findsOneWidget);
      expect(
        find.text('₹50 delivery charge, free above ₹5,000'),
        findsOneWidget,
      );
      expect(find.text('Kochi Paints building'), findsOneWidget);

      await tapVisible(tester, find.byKey(const Key('toggle-my-shops')));
      expect(shops.mine, {'k'});
      expect(find.text('Added to My Shops.'), findsOneWidget);
      expect(find.text('In My Shops'), findsOneWidget);

      // Back in Find shops, the row says so too.
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('In My Shops'), findsOneWidget);

      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(_tab('My Shops'));
      await tester.pumpAndSettle();
      expect(find.text('Kochi Paints'), findsOneWidget);

      await tapVisible(tester, find.text('Kochi Paints'));
      await tapVisible(tester, find.byKey(const Key('toggle-my-shops')));
      expect(shops.mine, isEmpty);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('No shops added'), findsOneWidget);
    },
  );

  testWidgets('Shop here makes it the active shop on Home', (tester) async {
    final store = FakeActiveShopStore();
    await _signedIn(tester, activeShop: store);
    await tapVisible(tester, find.byKey(const Key('home-find-shops')));
    await tapVisible(tester, find.text('Thrissur Colours'));
    await tapVisible(tester, find.byKey(const Key('shop-here')));

    expect(store.value, 't');
    expect(find.text("You're shopping from Thrissur Colours."), findsOneWidget);
    expect(find.text('Shopping from'), findsOneWidget);
    // The Home banner names the shop and offers to change it (UI-104).
    expect(find.byKey(const Key('change-shop')), findsOneWidget);
    expect(find.text('Thrissur Colours'), findsOneWidget);
  });

  testWidgets('an active shop that is no longer Live is forgotten', (
    tester,
  ) async {
    final shops = FakeShopsRepository(_shops())..notFound.add('t');
    final store = FakeActiveShopStore('t');
    await _signedIn(tester, shops: shops, activeShop: store);
    await tester.pumpAndSettle();

    expect(store.value, isNull);
    expect(find.text('Choose a shop'), findsOneWidget);
  });

  testWidgets('sign-out forgets the active shop on this phone', (tester) async {
    final store = FakeActiveShopStore('k');
    final auth = FakeAuthRepository(signedIn: true);
    await _signedIn(tester, activeShop: store, auth: auth);
    expect(find.text('Shopping from'), findsOneWidget);

    await tester.tap(_tab('More'));
    await tester.pumpAndSettle();
    await tapVisible(tester, find.byKey(const Key('sign-out')));

    expect(auth.signedIn, isFalse);
    expect(store.value, isNull);
  });
}
