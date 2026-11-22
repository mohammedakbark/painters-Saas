import 'package:customer_app/src/orders/my_orders.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/sites/sites.dart';
import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

Finder _tab(String label) =>
    find.descendant(of: find.byType(AppBottomNav), matching: find.text(label));

CustomerSite _site(
  String id,
  String name, {
  SiteSpendTotals spend = SiteSpendTotals.none,
}) => CustomerSite(
  id: id,
  name: name,
  ownerName: null,
  address: '$name, Kakkanad, Kochi',
  latitude: 10.01,
  longitude: 76.35,
  archived: false,
  spend: spend,
);

final _villa = _site(
  'v',
  'Green Villa',
  spend: SiteSpendTotals(
    totalPaise: 1240000,
    shopCount: 2,
    orderCount: 3,
    lastOrderAt: DateTime.utc(2026, 11, 21, 10),
  ),
);

final _rahman = _site(
  'r',
  'Rahman Residence',
  spend: SiteSpendTotals(
    totalPaise: 30000,
    shopCount: 1,
    orderCount: 1,
    lastOrderAt: DateTime.utc(2026, 11, 18, 10),
  ),
);

final _villaSpend = SiteSpend(
  siteId: 'v',
  siteName: 'Green Villa',
  archived: false,
  totalPaise: 1240000,
  ordersTruncated: false,
  shops: [
    SiteShopSpend(
      shopId: 'a',
      shopName: 'Aluva Colours',
      totalPaise: 1100000,
      orderCount: 1,
      orders: [
        SiteSpendOrder(
          id: 'o3',
          number: 1003,
          placedAt: DateTime.utc(2026, 11, 21, 10),
          status: OrderStatus.newOrder,
          totalPaise: 1100000,
        ),
      ],
    ),
    SiteShopSpend(
      shopId: 'k',
      shopName: 'Kochi Paints',
      totalPaise: 140000,
      orderCount: 2,
      orders: [
        SiteSpendOrder(
          id: 'o2',
          number: 1002,
          placedAt: DateTime.utc(2026, 11, 20, 10),
          status: OrderStatus.packing,
          totalPaise: 110000,
        ),
        SiteSpendOrder(
          id: 'o1',
          number: 1001,
          placedAt: DateTime.utc(2026, 11, 19, 10),
          status: OrderStatus.completed,
          totalPaise: 30000,
        ),
      ],
    ),
  ],
);

Future<void> _painter(
  WidgetTester tester,
  FakeSitesRepository sites, {
  FakeActiveShopStore? activeShop,
}) async {
  await pumpApp(
    tester,
    auth: FakeAuthRepository(signedIn: true),
    profiles: FakeCustomerProfileRepository(
      profileOf('Arun', CustomerType.painter),
    ),
    shops: FakeShopsRepository([testShop('k', 'Kochi Paints')]),
    activeShop: activeShop,
    storefront: FakeStorefrontRepository({'k': const []}),
    sites: sites,
  );
}

Future<void> _openSites(WidgetTester tester) async {
  await tester.tap(_tab('Sites'));
  await tester.pumpAndSettle();
}

void main() {
  test('Home shows the active site ordered for most recently', () {
    expect(latestSpendSite([_rahman, _villa])?.id, 'v');
    expect(latestSpendSite([_site('n', 'New site')]), isNull);
  });

  testWidgets('each site card shows what it has cost so far', (tester) async {
    await _painter(tester, FakeSitesRepository([_villa, _site('n', 'New')]));
    await _openSites(tester);

    expect(find.text('₹12,400'), findsOneWidget);
    expect(find.text('2 shops · 3 orders'), findsOneWidget);
    expect(find.text('No orders yet'), findsOneWidget);
  });

  testWidgets("a site's page shows the total and each shop's orders", (
    tester,
  ) async {
    final sites = FakeSitesRepository([_villa])..spends['v'] = _villaSpend;
    await _painter(tester, sites);
    await _openSites(tester);
    await tapVisible(tester, find.text('Green Villa'));

    expect(find.text('Total spent on this site'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byKey(const Key('site-total')),
        matching: find.text('₹12,400'),
      ),
      findsOneWidget,
    );
    expect(find.text('Aluva Colours'), findsOneWidget);
    expect(find.text('Kochi Paints'), findsOneWidget);
    expect(find.text('₹1,400'), findsOneWidget);
    expect(find.text('#1001'), findsOneWidget);
    expect(find.text('Packing'), findsOneWidget);
    expect(find.text('Completed'), findsOneWidget);
  });

  testWidgets('a site with no orders says how to add them', (tester) async {
    await _painter(tester, FakeSitesRepository([_site('n', 'New site')]));
    await _openSites(tester);
    await tapVisible(tester, find.text('New site'));

    expect(find.text('No orders for this site yet'), findsOneWidget);
    expect(find.text('₹0'), findsOneWidget);
  });

  testWidgets("a painter's Home shows their latest site and opens it", (
    tester,
  ) async {
    final sites = FakeSitesRepository([_rahman, _villa])
      ..spends['v'] = _villaSpend;
    await _painter(tester, sites, activeShop: FakeActiveShopStore('k'));

    final card = find.byKey(const Key('home-site-spend'));
    expect(card, findsOneWidget);
    expect(find.text('Green Villa · ₹12,400 so far'), findsOneWidget);
    await tapVisible(tester, card);
    expect(find.text('Total spent on this site'), findsOneWidget);
  });

  testWidgets('no site card before the first site order', (tester) async {
    await _painter(
      tester,
      FakeSitesRepository([_site('n', 'New site')]),
      activeShop: FakeActiveShopStore('k'),
    );
    expect(find.byKey(const Key('home-site-spend')), findsNothing);
  });
}
