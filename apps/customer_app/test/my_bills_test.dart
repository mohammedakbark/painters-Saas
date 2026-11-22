import 'package:customer_app/src/bills/my_bills.dart';
import 'package:customer_app/src/features/bills/my_bills_screens.dart';
import 'package:customer_app/src/orders/my_orders.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/sites/sites.dart';
import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

// BIL-003: "what I owe each shop" (BIL-001 API, D-062).

Finder _tab(String label) =>
    find.descendant(of: find.byType(AppBottomNav), matching: find.text(label));

final _abc = MyBillSummary(
  shopId: 'abc',
  shopName: 'ABC Paints',
  balancePaise: 100000,
  lastEntryAt: DateTime.utc(2026, 11, 21, 10),
);

final _kochi = MyBillSummary(
  shopId: 'kochi',
  shopName: 'Kochi Colours',
  balancePaise: -20000,
  lastEntryAt: DateTime.utc(2026, 11, 20, 10),
);

final _abcBill = MyBill(
  shopId: 'abc',
  shopName: 'ABC Paints',
  balancePaise: 100000,
  sites: const [(label: 'Green Villa', billedPaise: 150000, orderCount: 1)],
  entries: [
    MyBillEntry(
      id: 'e2',
      kind: BillEntryKind.payment,
      amountPaise: -50000,
      createdAt: DateTime.utc(2026, 11, 21, 10),
      orderId: null,
      orderNumber: null,
      siteLabel: null,
      method: 'UPI',
    ),
    MyBillEntry(
      id: 'e1',
      kind: BillEntryKind.charge,
      amountPaise: 150000,
      createdAt: DateTime.utc(2026, 11, 20, 10),
      orderId: 'o1',
      orderNumber: 1001,
      siteLabel: 'Green Villa',
      method: null,
    ),
  ],
  page: 1,
  hasMore: false,
);

Future<void> _open(
  WidgetTester tester, {
  required FakeMyBillsRepository bills,
  CustomerType type = CustomerType.painter,
  FakeSitesRepository? sites,
}) async {
  await pumpApp(
    tester,
    auth: FakeAuthRepository(signedIn: true),
    profiles: FakeCustomerProfileRepository(profileOf('Arun', type)),
    bills: bills,
    sites: sites,
  );
}

void main() {
  test('says who owes whom, and reads part paid on an order', () {
    expect(myBalanceState(100000).label, 'You owe');
    expect(myBalanceState(-1).label, 'Shop owes you');
    expect(myBalanceState(0).label, 'Settled');
    expect(signedRupees(-50000), '−₹500');
  });

  testWidgets('More opens my bills; a shop opens its bill', (tester) async {
    await _open(
      tester,
      bills: FakeMyBillsRepository(
        bills: [_abc, _kochi],
        one: {'abc': _abcBill},
      ),
    );
    await tester.tap(_tab('More'));
    await tester.pumpAndSettle();
    await tapVisible(tester, find.byKey(const Key('more-bills')));

    expect(find.text('ABC Paints'), findsOneWidget);
    expect(find.text('₹1,000'), findsOneWidget);
    expect(find.text('You owe'), findsOneWidget);
    expect(find.text('Shop owes you'), findsOneWidget);

    await tapVisible(tester, find.text('ABC Paints'));
    expect(
      find.descendant(
        of: find.byKey(const Key('my-bill-total')),
        matching: find.text('₹1,000'),
      ),
      findsOneWidget,
    );
    expect(find.text('Green Villa · 1 order'), findsOneWidget);
    expect(find.text('Order · #1001'), findsOneWidget);
    expect(find.text('Payment · UPI'), findsOneWidget);
    expect(find.text('−₹500'), findsOneWidget);
  });

  testWidgets('no bills yet says when one starts', (tester) async {
    await _open(
      tester,
      bills: FakeMyBillsRepository(),
      type: CustomerType.customer,
    );
    await tester.tap(_tab('More'));
    await tester.pumpAndSettle();
    await tapVisible(tester, find.byKey(const Key('more-bills')));
    expect(find.text('No bills yet'), findsOneWidget);
  });

  testWidgets("a site's page shows what the painter owes each shop", (
    tester,
  ) async {
    const villa = CustomerSite(
      id: 'v',
      name: 'Green Villa',
      ownerName: null,
      address: 'Green Villa, Kakkanad',
      latitude: 10.01,
      longitude: 76.35,
      archived: false,
    );
    final sites = FakeSitesRepository([villa])
      ..spends['v'] = SiteSpend(
        siteId: 'v',
        siteName: 'Green Villa',
        archived: false,
        totalPaise: 150000,
        ordersTruncated: false,
        shops: [
          SiteShopSpend(
            shopId: 'abc',
            shopName: 'ABC Paints',
            totalPaise: 150000,
            orderCount: 1,
            orders: [
              SiteSpendOrder(
                id: 'o1',
                number: 1001,
                placedAt: DateTime.utc(2026, 11, 20, 10),
                status: OrderStatus.completed,
                totalPaise: 150000,
              ),
            ],
          ),
        ],
      );
    await _open(
      tester,
      bills: FakeMyBillsRepository(bills: [_abc]),
      sites: sites,
    );
    await tester.tap(_tab('Sites'));
    await tester.pumpAndSettle();
    await tapVisible(tester, find.text('Green Villa'));

    expect(
      find.text('Your bill with this shop: you owe ₹1,000 for all sites.'),
      findsOneWidget,
    );
    await tapVisible(tester, find.byKey(const Key('site-bills')));
    expect(find.text('What you owe each shop'), findsWidgets);
  });
}
