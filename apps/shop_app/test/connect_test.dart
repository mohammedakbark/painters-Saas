import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/customers/connect_requests.dart';
import 'package:shop_app/src/customers/customer_models.dart';
import 'package:shop_app/src/shops/shop_models.dart';

import 'support/fakes.dart';

// CON-002: connection requests in the Shop App (CON-001 API, D-063).

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

ConnectRequest _request(String id, String name, {bool merges = false}) =>
    ConnectRequest(
      id: id,
      requestedAt: DateTime.utc(2026, 11, 22, 6),
      customerId: 'c-$id',
      name: name,
      phone: '+919876543210',
      kind: CustomerKind.painter,
      mergesIntoAppRecord: merges,
    );

void main() {
  Future<void> openCustomers(
    WidgetTester tester,
    FakeConnectRequestsRepository connect, {
    MyShop shop = _owner,
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
        connect: connect,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lakshmi Paints'));
    await tester.pumpAndSettle();
    await openTab(tester, 'Customers');
  }

  testWidgets('connects after confirming; the merge is explained', (
    tester,
  ) async {
    final connect = FakeConnectRequestsRepository([
      _request('r1', 'Shibu Thomas', merges: true),
    ]);
    await openCustomers(tester, connect);

    expect(find.text('Connection requests'), findsOneWidget);
    expect(find.textContaining('already orders in the app'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('approve-r1')));
    await tester.pumpAndSettle();
    expect(find.textContaining('the two become one'), findsOneWidget);
    await tester.tap(find.widgetWithText(AppButton, 'Connect').last);
    await tester.pumpAndSettle();

    expect(connect.answered.single, (id: 'r1', approve: true));
    expect(
      find.text('Shibu Thomas’s records are connected to their app.'),
      findsOneWidget,
    );
    expect(find.text('Connection requests'), findsNothing);
  });

  testWidgets('declines after confirming', (tester) async {
    final connect = FakeConnectRequestsRepository([
      _request('r1', 'Shibu Thomas'),
    ]);
    await openCustomers(tester, connect);
    await tester.tap(find.byKey(const ValueKey('decline-r1')));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(AppButton, 'Decline').last);
    await tester.pumpAndSettle();
    expect(connect.answered.single, (id: 'r1', approve: false));
  });

  testWidgets('no card when nobody asked', (tester) async {
    await openCustomers(tester, FakeConnectRequestsRepository());
    expect(find.text('Connection requests'), findsNothing);
  });
}
