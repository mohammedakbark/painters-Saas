import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/bills/bill_models.dart';
import 'package:shop_app/src/customers/customer_models.dart';
import 'package:shop_app/src/orders/order_models.dart';
import 'package:shop_app/src/shops/shop_models.dart';
import 'package:shop_app/src/shops/shop_permissions.dart';

import 'support/fakes.dart';

// BIL-002: the running bill (BIL-001 API, D-062) in the Shop App.

const _membership = ShopMembership(
  shopId: 'shop-a',
  shopName: 'Lakshmi Paints',
  shopStatus: 'ACTIVE',
  role: 'MASTER',
);

const _owner = MyShop(
  id: 'shop-a',
  name: 'Lakshmi Paints',
  status: 'ACTIVE',
  myRole: 'MASTER',
);

CustomerDetail _customer(String id, String name) => CustomerDetail(
  customer: ShopCustomer(
    id: id,
    name: name,
    phone: '+919876543210',
    kind: CustomerKind.painter,
    hasApp: true,
  ),
  sites: const [],
);

Finder _button(String label) => find.widgetWithText(AppButton, label);

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is AppTextField && widget.label == label,
);

void main() {
  late FakeShopBillsRepository bills;

  setUp(() {
    bills = FakeShopBillsRepository(
      bills: {
        'c-ravi': testBill(
          150000,
          entries: [testCharge('e1', 150000)],
          sites: [
            (label: 'Kakkanad villa', billedPaise: 150000, orderCount: 1),
          ],
        ),
        'c-meena': testBill(-40000),
      },
      people: {
        'c-ravi': (name: 'Ravi Painter', kind: CustomerKind.painter),
        'c-meena': (name: 'Meena', kind: CustomerKind.customer),
      },
    );
  });

  Future<void> openShop(
    WidgetTester tester, {
    MyShop shop = _owner,
    FakeShopOrdersRepository? orders,
  }) async {
    tester.view.physicalSize = const Size(1080, 3600);
    tester.view.devicePixelRatio = 2.5;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      testApp(
        auth: FakeAuthRepository(signedIn: true),
        shops: FakeShopAccessRepository(
          memberships: [_membership],
          shops: {'shop-a': shop},
        ),
        orders: orders,
        customers: FakeShopCustomersRepository(
          customers: [
            _customer('c-ravi', 'Ravi Painter'),
            _customer('c-meena', 'Meena'),
          ],
        ),
        bills: bills,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lakshmi Paints'));
    await tester.pumpAndSettle();
  }

  Future<void> openCustomer(WidgetTester tester, String name) async {
    await openShop(tester);
    await openTab(tester, 'Customers');
    await tester.tap(find.text(name));
    await tester.pumpAndSettle();
  }

  testWidgets('the customer page shows the bill and billed by site', (
    tester,
  ) async {
    await openCustomer(tester, 'Ravi Painter');

    expect(find.text('Bill'), findsOneWidget);
    expect(
      tester.widget<Text>(find.byKey(const Key('bill-balance'))).data,
      '₹1,500',
    );
    expect(find.text('Owes you'), findsOneWidget);
    expect(find.text('Kakkanad villa · 1 order'), findsOneWidget);
    expect(find.text('Order · #1001'), findsOneWidget);
  });

  testWidgets('records part of what is owed; more than owed is refused', (
    tester,
  ) async {
    await openCustomer(tester, 'Ravi Painter');
    await tester.tap(_button('Record payment'));
    await tester.pumpAndSettle();

    // Starts at what is owed; more is refused before it is sent.
    expect(find.text('1500'), findsOneWidget);
    await tester.enterText(_field('Amount (₹)'), '1600');
    await tester.tap(find.byKey(const Key('save-bill-money')));
    await tester.pumpAndSettle();
    expect(find.text('Enter at most ₹1,500.'), findsOneWidget);
    expect(bills.recorded, isEmpty);

    await tester.enterText(_field('Amount (₹)'), '1000');
    await tester.tap(find.text('UPI'));
    await tester.tap(find.byKey(const Key('save-bill-money')));
    await tester.pumpAndSettle();

    final recorded = bills.recorded.single;
    expect(recorded.refund, isFalse);
    expect(recorded.money.amountPaise, 100000);
    expect(recorded.money.method, PaymentMethod.upi);
    expect(recorded.money.requestId, hasLength(36));
    expect(find.text('Payment of ₹1,000 recorded.'), findsOneWidget);
    expect(
      tester.widget<Text>(find.byKey(const Key('bill-balance'))).data,
      '₹500',
    );
    expect(find.text('Payment · UPI'), findsOneWidget);
  });

  testWidgets('when the shop owes, it records a refund', (tester) async {
    await openCustomer(tester, 'Meena');

    expect(find.text('You owe'), findsOneWidget);
    await tester.tap(_button('Record refund'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('save-bill-money')));
    await tester.pumpAndSettle();

    expect(bills.recorded.single.refund, isTrue);
    expect(bills.recorded.single.money.amountPaise, 40000);
    expect(find.text('Settled'), findsOneWidget);
  });

  testWidgets('without payments or money figures there is no bill', (
    tester,
  ) async {
    await openShop(
      tester,
      shop: const MyShop(
        id: 'shop-a',
        name: 'Lakshmi Paints',
        status: 'ACTIVE',
        myRole: 'STAFF',
        permissions: {ShopPermission.customersManage},
      ),
    );
    await openTab(tester, 'Customers');
    await tester.tap(find.text('Ravi Painter'));
    await tester.pumpAndSettle();
    expect(find.text('Bill'), findsNothing);

    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Open navigation menu').first);
    await tester.pumpAndSettle();
    expect(
      find.descendant(of: find.byType(AppDrawer), matching: find.text('Bills')),
      findsNothing,
    );
  });

  testWidgets('money figures only: the bill shows without Record payment', (
    tester,
  ) async {
    await openShop(
      tester,
      shop: const MyShop(
        id: 'shop-a',
        name: 'Lakshmi Paints',
        status: 'ACTIVE',
        myRole: 'STAFF',
        permissions: {
          ShopPermission.customersManage,
          ShopPermission.reportsView,
        },
      ),
    );
    await openTab(tester, 'Customers');
    await tester.tap(find.text('Ravi Painter'));
    await tester.pumpAndSettle();
    expect(find.text('Owes you'), findsOneWidget);
    expect(_button('Record payment'), findsNothing);
  });

  testWidgets('Bills lists balances with totals and a balance filter', (
    tester,
  ) async {
    await openShop(tester);
    await openFromDrawer(tester, 'Bills');

    expect(
      find.descendant(
        of: find.byKey(const Key('bills-owing')),
        matching: find.text('₹1,500'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byKey(const Key('bills-shop-owes')),
        matching: find.text('₹400'),
      ),
      findsOneWidget,
    );
    expect(find.text('Ravi Painter'), findsOneWidget);
    expect(find.text('Meena'), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byType(AppChoiceChips<BillStatus?>),
        matching: find.text('You owe'),
      ),
    );
    await tester.pumpAndSettle();
    expect(bills.listed.last.status, BillStatus.shopOwes);
    expect(find.text('Ravi Painter'), findsNothing);

    await tester.tap(find.text('Meena'));
    await tester.pumpAndSettle();
    expect(find.text('Record refund'), findsOneWidget);
  });

  testWidgets('an order paid in part from the bill says so', (tester) async {
    final orders = FakeShopOrdersRepository(
      orders: {
        'shop-a': [
          FakeOrder(
            'o1',
            1001,
            status: OrderStatus.completed,
            paidPaise: 20000,
          ),
        ],
      },
    );
    await openShop(tester, orders: orders);
    await openTab(tester, 'Orders');
    final completed = find.descendant(
      of: find.byType(AppChoiceChips<OrderTab>),
      matching: find.text('Completed'),
    );
    await tester.ensureVisible(completed);
    await tester.pumpAndSettle();
    await tester.tap(completed);
    await tester.pumpAndSettle();
    await tester.tap(find.text('#1001'));
    await tester.pumpAndSettle();

    expect(find.text('Part paid'), findsOneWidget);
    expect(find.textContaining('₹200 of'), findsOneWidget);
  });
}
