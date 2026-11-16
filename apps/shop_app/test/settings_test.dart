import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/features/shops/shop_settings_screen.dart';
import 'package:shop_app/src/shops/shop_models.dart';
import 'package:shop_app/src/shops/shop_permissions.dart';

import 'support/fakes.dart';

// SHP-013: Shop settings (the SHP-008 API) in the Shop App: delivery and the
// ready order messages. Only people with `shop.settings` open it (D-056).

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is AppTextField && widget.label == label,
);

Finder _button(String label) => find.widgetWithText(AppButton, label);

void main() {
  late FakeShopSettingsRepository settings;

  setUp(() {
    settings = FakeShopSettingsRepository(settings: {'shop-a': testSettings()});
  });

  Future<void> openShop(
    WidgetTester tester, {
    MyShop shop = lakshmiShop,
  }) async {
    tester.view.physicalSize = const Size(1080, 3600);
    tester.view.devicePixelRatio = 2.5;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      testApp(
        auth: FakeAuthRepository(signedIn: true),
        shops: FakeShopAccessRepository(
          memberships: [lakshmi],
          shops: {'shop-a': shop},
        ),
        profiles: FakeShopProfileRepository(
          profiles: {'shop-a': lakshmiProfile},
        ),
        settings: settings,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lakshmi Paints'));
    await tester.pumpAndSettle();
  }

  Future<void> openSettings(WidgetTester tester) async {
    await openShop(tester);
    await openFromDrawer(tester, 'Shop settings');
  }

  group('delivery', () {
    testWidgets('turns delivery on with a charge, free amount and distance', (
      tester,
    ) async {
      await openSettings(tester);
      expect(find.text('Off. Customers pick up their orders.'), findsOneWidget);

      await tester.tap(_button('Edit delivery'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Deliver orders'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Save delivery'));
      await tester.pumpAndSettle();
      expect(find.text(SettingsMessages.chargeRequired), findsOneWidget);
      expect(find.text(SettingsMessages.radiusInvalid), findsOneWidget);
      expect(settings.savedDelivery, isEmpty);

      await tester.enterText(_field('Delivery charge (₹ per order)'), '40');
      await tester.enterText(_field('Free delivery from (₹)'), '2,500');
      await tester.enterText(_field('Delivery distance (km)'), '8');
      await tester.tap(_button('Save delivery'));
      await tester.pumpAndSettle();

      expect(find.text(SettingsMessages.deliverySaved), findsOneWidget);
      expect(
        find.text('₹40 per order · free from ₹2,500 · up to 8 km'),
        findsOneWidget,
      );
      final saved = settings.savedDelivery.single;
      expect(saved.chargePaise, 4000);
      expect(saved.freeAbovePaise, 250000);
      expect(saved.radiusKm, 8);
    });

    testWidgets('a charge of 0 is free delivery', (tester) async {
      await openSettings(tester);

      await tester.tap(_button('Edit delivery'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Deliver orders'));
      await tester.enterText(_field('Delivery charge (₹ per order)'), '0');
      await tester.enterText(_field('Delivery distance (km)'), '5');
      await tester.tap(_button('Save delivery'));
      await tester.pumpAndSettle();

      expect(find.text('Free delivery · up to 5 km'), findsOneWidget);
    });

    testWidgets('turning delivery off keeps the values', (tester) async {
      settings.settings['shop-a'] = testSettings(deliveryOn: true);
      await openSettings(tester);

      await tester.tap(_button('Edit delivery'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<AppTextField>(_field('Delivery charge (₹ per order)'))
            .controller
            ?.text,
        '40',
      );
      await tester.tap(find.text('Deliver orders'));
      await tester.tap(_button('Save delivery'));
      await tester.pumpAndSettle();

      final saved = settings.savedDelivery.single;
      expect(saved.enabled, isFalse);
      expect(saved.chargePaise, 4000);
      expect(saved.radiusKm, 8);
    });

    testWidgets('without a map location the API refusal is explained', (
      tester,
    ) async {
      settings.settings['shop-a'] = testSettings(hasLocation: false);
      await openSettings(tester);
      expect(find.text(SettingsMessages.needsLocation), findsOneWidget);

      await tester.tap(_button('Edit delivery'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Deliver orders'));
      await tester.enterText(_field('Delivery charge (₹ per order)'), '40');
      await tester.enterText(_field('Delivery distance (km)'), '8');
      await tester.tap(_button('Save delivery'));
      await tester.pumpAndSettle();
      expect(find.text(SettingsMessages.needsLocation), findsNWidgets(2));
    });
  });

  group('order messages', () {
    testWidgets('adds, edits and removes a message', (tester) async {
      await openSettings(tester);
      expect(find.text('Stock not available.'), findsOneWidget);

      await tester.tap(_button('Add message'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Message'), 'stock not available.');
      await tester.tap(_button('Add message').last);
      await tester.pumpAndSettle();
      expect(find.text(SettingsMessages.messageDuplicate), findsOneWidget);

      await tester.enterText(_field('Message'), 'Colour out of stock.');
      await tester.tap(_button('Add message').last);
      await tester.pumpAndSettle();
      expect(find.text('Colour out of stock.'), findsOneWidget);
      expect(settings.savedMessages.last, hasLength(3));

      await tester.tap(_button('Edit').last);
      await tester.pumpAndSettle();
      await tester.enterText(_field('Message'), 'Shade out of stock.');
      await tester.tap(_button('Save message'));
      await tester.pumpAndSettle();
      expect(find.text('Shade out of stock.'), findsOneWidget);
      expect(find.text('Colour out of stock.'), findsNothing);

      await tester.tap(_button('Remove').first);
      await tester.pumpAndSettle();
      expect(find.text('Stock not available.'), findsNothing);
      expect(settings.savedMessages.last, [
        'Stock can be arranged by tomorrow morning.',
        'Shade out of stock.',
      ]);
    });

    testWidgets('at most 10 messages', (tester) async {
      settings.settings['shop-a'] = testSettings(
        messages: [for (var i = 1; i <= 10; i++) 'Message $i'],
      );
      await openSettings(tester);

      expect(_button('Add message'), findsNothing);
      expect(find.text(SettingsMessages.maxMessages), findsOneWidget);
    });
  });

  testWidgets('only people with shop.settings see it in the menu', (
    tester,
  ) async {
    await openShop(
      tester,
      shop: const MyShop(
        id: 'shop-a',
        name: 'Lakshmi Paints',
        status: 'DRAFT',
        myRole: 'STAFF',
        permissions: {ShopPermission.ordersHandle},
      ),
    );

    await tester.tap(find.byTooltip('Open navigation menu').first);
    await tester.pumpAndSettle();
    expect(find.text('Shop settings'), findsNothing);
    expect(find.text('Shop profile'), findsOneWidget);
  });
}
