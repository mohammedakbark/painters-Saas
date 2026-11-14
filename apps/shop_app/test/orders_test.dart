import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/features/orders/order_messages.dart';
import 'package:shop_app/src/orders/order_models.dart';
import 'package:shop_app/src/shops/shop_models.dart';

import 'support/fakes.dart';

const _liveMembership = ShopMembership(
  shopId: 'shop-a',
  shopName: 'Lakshmi Paints',
  shopStatus: 'ACTIVE',
  role: 'MASTER',
);

const _liveShop = MyShop(
  id: 'shop-a',
  name: 'Lakshmi Paints',
  status: 'ACTIVE',
  myRole: 'MASTER',
);

const _staffShop = MyShop(
  id: 'shop-a',
  name: 'Lakshmi Paints',
  status: 'ACTIVE',
  myRole: 'STAFF',
);

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is AppTextField && widget.label == label,
);

Finder _button(String label) => find.widgetWithText(AppButton, label);

Finder _chip(String label) => find.descendant(
  of: find.byType(AppChoiceChips<OrderTab>),
  matching: find.text(label),
);

/// The chip row scrolls sideways; bring the chip on screen first.
Future<void> tapChip(WidgetTester tester, String label) async {
  await tester.ensureVisible(_chip(label));
  await tester.pumpAndSettle();
  await tester.tap(_chip(label));
}

void main() {
  late FakeShopOrdersRepository orders;
  final opened = <Uri>[];

  setUp(() {
    opened.clear();
    orders = FakeShopOrdersRepository(
      orders: {
        'shop-a': [
          FakeOrder('o1', 1001),
          FakeOrder(
            'o2',
            1002,
            status: OrderStatus.packing,
            fulfilment: Fulfilment.delivery,
            customerName: 'Bindu Thomas',
          ),
          FakeOrder(
            'o3',
            1003,
            status: OrderStatus.readyForPickup,
            customerName: 'Chandran',
          ),
          FakeOrder(
            'o4',
            1004,
            status: OrderStatus.completed,
            customerName: 'Deepa',
            items: [testItem('o4-1', 'Wall Primer', quantity: 3)],
          ),
        ],
      },
      packs: const [
        PackOption(
          packId: 'k-9',
          productName: 'Royal Emulsion',
          brandName: 'Demo Paints',
          packLabel: '1 L',
          pricePaise: 52000,
        ),
      ],
    );
  });

  Future<void> openHome(
    WidgetTester tester, {
    MyShop shop = _liveShop,
    Duration refresh = const Duration(hours: 1),
  }) async {
    tester.view.physicalSize = const Size(1080, 3600);
    tester.view.devicePixelRatio = 2.5;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      testApp(
        auth: FakeAuthRepository(signedIn: true),
        shops: FakeShopAccessRepository(
          memberships: [_liveMembership],
          shops: {'shop-a': shop},
        ),
        orders: orders,
        orderRefreshInterval: refresh,
        openLink: (link) async {
          opened.add(link);
          return true;
        },
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lakshmi Paints'));
    await tester.pumpAndSettle();
  }

  Future<void> openOrders(
    WidgetTester tester, {
    MyShop shop = _liveShop,
    Duration refresh = const Duration(hours: 1),
  }) async {
    await openHome(tester, shop: shop, refresh: refresh);
    await tester.tap(find.text('New orders, packing, payment and returns'));
    await tester.pumpAndSettle();
  }

  Future<void> openOrder(
    WidgetTester tester,
    String number, {
    MyShop shop = _liveShop,
    String? tab,
  }) async {
    await openOrders(tester, shop: shop);
    if (tab != null) {
      await tapChip(tester, tab);
      await tester.pumpAndSettle();
    }
    await tester.tap(find.text(number));
    await tester.pumpAndSettle();
  }

  group('shop home', () {
    testWidgets('shows order figures that open their orders', (tester) async {
      await openHome(tester);

      expect(
        find.bySemanticsLabel('New: 1'),
        findsOneWidget,
        reason: 'one new order',
      );
      expect(find.bySemanticsLabel('To pack: 1'), findsOneWidget);
      expect(find.bySemanticsLabel('Ready or on the way: 1'), findsOneWidget);
      expect(find.bySemanticsLabel("Today's sales: ₹1,350"), findsOneWidget);
      expect(find.text('2 orders not paid yet: ₹2,250'), findsOneWidget);

      await tester.tap(find.text('To pack'));
      await tester.pumpAndSettle();
      expect(find.text('#1002'), findsOneWidget);
      expect(find.text('#1001'), findsNothing);
    });

    testWidgets('a shop that is not Live has no figures', (tester) async {
      await openHome(tester, shop: lakshmiShop);

      expect(find.text('To pack'), findsNothing);
      expect(
        find.text('New orders, packing, payment and returns'),
        findsOneWidget,
      );
    });

    testWidgets('a failed figures request can be retried', (tester) async {
      orders.nextError = const ApiException(status: 500);
      await openHome(tester);

      expect(find.text("We couldn't load the order figures."), findsOneWidget);
      expect(find.text('Products'), findsOneWidget);

      await tester.tap(_button('Try again'));
      await tester.pumpAndSettle();
      expect(find.text('To pack'), findsOneWidget);
    });
  });

  group('orders list', () {
    testWidgets('shows open orders with counts, customer and next step', (
      tester,
    ) async {
      await openOrders(tester);

      expect(find.text('#1001'), findsOneWidget);
      expect(find.text('#1002'), findsOneWidget);
      expect(find.text('#1003'), findsOneWidget);
      expect(find.text('#1004'), findsNothing);
      expect(find.text('Anil Kumar'), findsOneWidget);
      expect(find.text('+91 98765 43210'), findsNWidgets(3));
      expect(find.text('₹900'), findsNWidgets(2));
      expect(find.text('₹950'), findsOneWidget);
      expect(find.text('Unpaid'), findsNWidgets(3));
      expect(_button('Start packing'), findsOneWidget);
      expect(_button('Out for delivery'), findsOneWidget);
      expect(_button('Mark completed'), findsOneWidget);
      expect(_button('Cancel order'), findsNothing);
      expect(find.bySemanticsLabel('Open, 3'), findsOneWidget);
      expect(find.bySemanticsLabel('Completed, 1'), findsOneWidget);
      expect(find.bySemanticsLabel('All, 4'), findsOneWidget);
    });

    testWidgets('switches step, searches and explains an empty result', (
      tester,
    ) async {
      await openOrders(tester);

      await tapChip(tester, 'Completed');
      await tester.pumpAndSettle();
      expect(find.text('#1004'), findsOneWidget);
      expect(find.text('#1001'), findsNothing);

      await tapChip(tester, 'Cancelled');
      await tester.pumpAndSettle();
      expect(find.text(OrderMessages.nothingInStep), findsOneWidget);

      await tapChip(tester, 'All');
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(AppSearchField), 'bindu');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(find.text('#1002'), findsOneWidget);
      expect(find.text('#1001'), findsNothing);
      expect(find.bySemanticsLabel('All, 1'), findsOneWidget);

      await tester.enterText(find.byType(AppSearchField), 'nobody');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(find.text(OrderMessages.noMatch), findsOneWidget);
    });

    testWidgets('filters by delivery and payment in a sheet', (tester) async {
      await openOrders(tester);

      await tester.tap(_button('Filter'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delivery'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Show orders'));
      await tester.pumpAndSettle();

      expect(find.text('#1002'), findsOneWidget);
      expect(find.text('#1001'), findsNothing);
      expect(_button('Filter (1)'), findsOneWidget);
      expect(orders.listed.last.fulfilment, Fulfilment.delivery);

      await tester.tap(_button('Filter (1)'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Clear filters'));
      await tester.pumpAndSettle();
      expect(find.text('#1001'), findsOneWidget);
      expect(_button('Filter'), findsOneWidget);
    });

    testWidgets('a next step updates that order and the counts', (
      tester,
    ) async {
      await openOrders(tester);

      await tester.tap(_button('Start packing'));
      await tester.pumpAndSettle();

      expect(find.text('#1001: Packing started.'), findsOneWidget);
      expect(_button('Start packing'), findsNothing);
      expect(_button('Ready for pickup'), findsOneWidget);
      expect(find.bySemanticsLabel('Packing, 2'), findsOneWidget);
      expect(find.bySemanticsLabel('New, 0'), findsOneWidget);
    });

    testWidgets('a refused step says why and reads the list again', (
      tester,
    ) async {
      await openOrders(tester);
      orders.orders['shop-a']!.first.status = OrderStatus.cancelled;
      orders.nextError = const ApiException(
        status: 409,
        code: 'order_status_invalid',
        detail: 'This order was already cancelled.',
      );

      await tester.tap(_button('Start packing'));
      await tester.pumpAndSettle();

      expect(find.text('This order was already cancelled.'), findsOneWidget);
      expect(find.text('#1001'), findsNothing);
    });

    testWidgets('tells about new orders while the screen is open', (
      tester,
    ) async {
      await openOrders(tester, refresh: const Duration(seconds: 30));

      orders.orders['shop-a']!.add(
        FakeOrder(
          'o5',
          1005,
          customerName: 'Esha',
          placedAt: DateTime.utc(2026, 11, 10, 9),
        ),
      );
      await tester.pump(const Duration(seconds: 30));
      await tester.pumpAndSettle();

      expect(find.text('1 new order'), findsOneWidget);
      expect(find.text('#1005'), findsOneWidget);
      expect(find.bySemanticsLabel('Open, 4'), findsOneWidget);
    });

    testWidgets('shows an error with retry, and no orders yet', (tester) async {
      orders.orders['shop-a'] = [];
      await openHome(tester);
      orders.nextError = const ApiException(status: 500);
      await tester.tap(find.text('New orders, packing, payment and returns'));
      await tester.pumpAndSettle();

      expect(find.text(OrderMessages.listFailed), findsOneWidget);
      expect(find.byType(AppSearchField), findsOneWidget);

      await tester.tap(_button('Try again'));
      await tester.pumpAndSettle();
      expect(find.text(OrderMessages.noOrders), findsOneWidget);
    });
  });

  group('order', () {
    testWidgets('shows items, totals, customer, delivery and timeline', (
      tester,
    ) async {
      await openOrder(tester, '#1002');

      expect(find.text('Order #1002'), findsNWidgets(2));
      expect(find.text('Packing'), findsOneWidget);
      expect(find.text('Silk Emulsion'), findsOneWidget);
      expect(find.text('Demo Paints · 1 L · 2 × ₹450'), findsOneWidget);
      expect(find.text('Free'), findsNothing);
      expect(find.text('₹50'), findsOneWidget);
      expect(find.text('₹950'), findsOneWidget);
      expect(find.text('Bindu Thomas'), findsOneWidget);
      expect(find.text(OrderMessages.ordersInApp), findsOneWidget);
      expect(find.text('14 Beach Road, Kochi'), findsOneWidget);
      expect(find.text('3.4 km from your shop'), findsOneWidget);
      expect(find.text(OrderMessages.payWhenReady), findsOneWidget);
      expect(find.text('Order placed by the customer.'), findsOneWidget);
      expect(_button('Out for delivery'), findsOneWidget);
    });

    testWidgets('calls the customer and opens the map', (tester) async {
      await openOrder(tester, '#1002');

      await tester.tap(_button('Call +91 98765 43210'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(_button('Open in maps'));
      await tester.tap(_button('Open in maps'));
      await tester.pumpAndSettle();

      expect(opened.map((link) => link.toString()), [
        'tel:+919876543210',
        'geo:9.97,76.28?q=9.97,76.28',
      ]);
    });

    testWidgets('moves to the next step from the main button', (tester) async {
      await openOrder(tester, '#1001');

      await tester.tap(_button('Start packing'));
      await tester.pumpAndSettle();

      expect(find.text('Packing started.'), findsOneWidget);
      expect(_button('Ready for pickup'), findsOneWidget);
      expect(orders.orders['shop-a']!.first.status, OrderStatus.packing);
    });

    testWidgets('cancelling needs a reason for the customer', (tester) async {
      await openOrder(tester, '#1001');

      await tester.tap(_button('Cancel order'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Cancel order').last);
      await tester.pumpAndSettle();
      expect(find.text(OrderMessages.cancelReasonRequired), findsOneWidget);
      expect(orders.orders['shop-a']!.first.status, OrderStatus.newOrder);

      await tester.tap(find.text('Out of stock today'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Cancel order').last);
      await tester.pumpAndSettle();

      expect(find.text('Order cancelled.'), findsOneWidget);
      expect(find.text('Cancelled by the shop'), findsOneWidget);
      expect(find.text('Out of stock today'), findsOneWidget);
      expect(_button('Start packing'), findsNothing);
      expect(_button('Not available'), findsNothing);
    });

    testWidgets('marks an item not available with the shop\'s own message', (
      tester,
    ) async {
      await openOrder(tester, '#1001');

      await tester.tap(_button('Not available'));
      await tester.pumpAndSettle();
      await tester.tap(find.text(OrderMessages.writeMyOwn));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Your message'), 'x');
      await tester.tap(_button('Mark not available'));
      await tester.pumpAndSettle();
      expect(find.text(OrderMessages.messageTooShort), findsOneWidget);

      await tester.enterText(_field('Your message'), 'Back on Monday');
      await tester.tap(_button('Mark not available'));
      await tester.pumpAndSettle();

      expect(find.text(OrderMessages.notAvailableSaved), findsOneWidget);
      expect(find.text('Not available'), findsOneWidget);
      expect(find.text('Message: Back on Monday'), findsOneWidget);
      expect(find.text('₹0'), findsNWidgets(2));
      expect(_button('Not available'), findsNothing);
      expect(_button('Suggest substitute'), findsOneWidget);
    });

    testWidgets('suggests a substitute found by search', (tester) async {
      await openOrder(tester, '#1001');

      await tester.tap(_button('Suggest substitute'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Suggest substitute').last);
      await tester.pumpAndSettle();
      expect(find.text(OrderMessages.choosePack), findsOneWidget);
      expect(find.text(OrderMessages.chooseMessage), findsOneWidget);

      await tester.enterText(find.byType(AppSearchField), 'royal');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Royal Emulsion · 1 L · ₹520'));
      await tester.enterText(_field('Quantity'), '1');
      await tester.enterText(_field('Message for the customer'), 'Same finish');
      await tester.pumpAndSettle();
      await tester.tap(_button('Suggest substitute').last);
      await tester.pumpAndSettle();

      expect(find.text(OrderMessages.substituteSaved), findsOneWidget);
      expect(find.text('Substitute: Royal Emulsion'), findsOneWidget);
      expect(find.text('Waiting for the customer'), findsOneWidget);
      expect(orders.offers.single.packId, 'k-9');
      expect(orders.offers.single.quantity, 1);
      expect(orders.offers.single.message, 'Same finish');
    });

    testWidgets('the owner records the payment once', (tester) async {
      await openOrder(tester, '#1003');

      await tester.ensureVisible(_button('Record payment'));
      await tester.tap(_button('Record payment'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Record payment').last);
      await tester.pumpAndSettle();
      expect(find.text(OrderMessages.choosePayment), findsOneWidget);

      await tester.tap(find.text('UPI'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Record payment').last);
      await tester.pumpAndSettle();

      expect(find.text(OrderMessages.paymentSaved), findsOneWidget);
      expect(find.text('Paid'), findsOneWidget);
      expect(find.textContaining('UPI · '), findsOneWidget);
      expect(_button('Record payment'), findsNothing);
    });

    testWidgets('the owner records a return within the quantity', (
      tester,
    ) async {
      await openOrder(tester, '#1004', tab: 'Completed');

      await tester.tap(_button('Record return'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Units returned'), '4');
      await tester.enterText(_field('Reason'), 'Damaged tin');
      await tester.tap(_button('Record return').last);
      await tester.pumpAndSettle();
      expect(find.text('Enter a quantity from 1 to 3.'), findsOneWidget);

      await tester.enterText(_field('Units returned'), '2');
      await tester.tap(_button('Record return').last);
      await tester.pumpAndSettle();

      expect(find.text(OrderMessages.returnSaved), findsOneWidget);
      expect(find.text('2 units returned'), findsOneWidget);
      expect(find.text('₹450'), findsNWidgets(2));
    });

    testWidgets('staff cannot record payments or returns', (tester) async {
      await openOrder(tester, '#1003', shop: _staffShop);
      expect(_button('Record payment'), findsNothing);
      expect(find.text(OrderMessages.ownerRecordsPayment), findsOneWidget);
      expect(_button('Mark completed'), findsOneWidget);
    });

    testWidgets('staff see no return button on a completed order', (
      tester,
    ) async {
      await openOrder(tester, '#1004', shop: _staffShop, tab: 'Completed');
      expect(_button('Record return'), findsNothing);
    });

    testWidgets('an API refusal stays in the sheet with its reason', (
      tester,
    ) async {
      await openOrder(tester, '#1003');
      await tester.ensureVisible(_button('Record payment'));
      await tester.tap(_button('Record payment'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cash'));
      await tester.pumpAndSettle();
      orders.nextError = const ApiException(
        status: 409,
        code: 'order_already_paid',
        detail: 'This order is already paid.',
      );
      await tester.tap(_button('Record payment').last);
      await tester.pumpAndSettle();

      expect(find.text('This order is already paid.'), findsOneWidget);
      expect(_button('Record payment'), findsNWidgets(2));
    });

    testWidgets("another shop's order is not found", (tester) async {
      await openOrders(tester);
      orders.orders['shop-a']!.removeWhere((order) => order.id == 'o1');

      await tester.tap(find.text('#1001'));
      await tester.pumpAndSettle();

      expect(find.text(OrderMessages.orderNotFound), findsOneWidget);
      await tester.tap(_button('Go to your orders'));
      await tester.pumpAndSettle();
      expect(find.text('#1002'), findsOneWidget);
    });
  });
}
