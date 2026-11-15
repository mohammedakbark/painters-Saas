import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/orders/order_models.dart';
import 'package:shop_app/src/shops/shop_models.dart';
import 'package:shop_app/src/shops/shop_permissions.dart';

import 'support/fakes.dart';

// SHP-010 (D-056): the app shows each area and action only to people with
// its permission. The API checks again; these tests cover what is shown.

MyShop _shop(Set<ShopPermission> permissions) => MyShop(
  id: 'shop-a',
  name: 'Lakshmi Paints',
  status: 'ACTIVE',
  myRole: 'STAFF',
  permissions: permissions,
);

const _membership = ShopMembership(
  shopId: 'shop-a',
  shopName: 'Lakshmi Paints',
  shopStatus: 'ACTIVE',
  role: 'STAFF',
);

const _ordersRow = 'New orders, packing, payment and returns';
const _productsRow = 'Prices, pack sizes and availability';

Map<String, Object?> _shopJson([Object? permissions]) => {
  'id': 's',
  'name': 'Shop',
  'status': 'ACTIVE',
  'myRole': 'MASTER',
  'permissions': ?permissions,
};

void main() {
  test('reading permissions keeps known keys and fails closed', () {
    expect(ShopPermission.parse(['orders.handle', 'something.new', 7]), {
      ShopPermission.ordersHandle,
    });
    expect(ShopPermission.parse(null), isEmpty);

    final shop = MyShop.fromJson(_shopJson(['catalogue.view']));
    expect(shop.can(ShopPermission.catalogueView), isTrue);
    expect(shop.can(ShopPermission.catalogueManage), isFalse);
    expect(MyShop.fromJson(_shopJson()).permissions, isEmpty);
  });

  group('what a member sees', () {
    late FakeShopOrdersRepository orders;

    setUp(() {
      orders = FakeShopOrdersRepository(
        orders: {
          'shop-a': [FakeOrder('o1', 1001, status: OrderStatus.readyForPickup)],
        },
      );
    });

    Future<void> openShop(
      WidgetTester tester,
      Set<ShopPermission> permissions,
    ) async {
      tester.view.physicalSize = const Size(1080, 3600);
      tester.view.devicePixelRatio = 2.5;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        testApp(
          auth: FakeAuthRepository(signedIn: true),
          shops: FakeShopAccessRepository(
            memberships: [_membership],
            shops: {'shop-a': _shop(permissions)},
          ),
          orders: orders,
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lakshmi Paints'));
      await tester.pumpAndSettle();
    }

    testWidgets('order staff see orders but not products or money', (
      tester,
    ) async {
      orders.hideMoney = true;
      await openShop(tester, {ShopPermission.ordersHandle});

      expect(find.text(_ordersRow), findsOneWidget);
      expect(find.text(_productsRow), findsNothing);
      expect(find.text('Ready or on the way'), findsOneWidget);
      expect(find.text("Today's sales"), findsNothing);
      expect(find.text('1 order not paid yet.'), findsOneWidget);

      await tester.tap(find.text(_ordersRow));
      await tester.pumpAndSettle();
      expect(find.widgetWithText(AppButton, 'New order'), findsNothing);
      expect(find.widgetWithText(AppButton, 'Mark completed'), findsOneWidget);
    });

    testWidgets('catalogue staff see products without changing them', (
      tester,
    ) async {
      await openShop(tester, {ShopPermission.catalogueView});

      expect(find.text(_ordersRow), findsNothing);
      expect(find.text('To pack'), findsNothing);

      await tester.tap(find.text(_productsRow));
      await tester.pumpAndSettle();
      expect(
        find.widgetWithText(AppButton, 'Add from brand catalogue'),
        findsNothing,
      );
    });

    testWidgets('the owner sees every area and the money figures', (
      tester,
    ) async {
      await openShop(tester, {...ShopPermission.values});

      expect(find.text(_ordersRow), findsOneWidget);
      expect(find.text(_productsRow), findsOneWidget);
      expect(find.text("Today's sales"), findsOneWidget);
      expect(find.textContaining('not paid yet: ₹'), findsOneWidget);
    });
  });
}
