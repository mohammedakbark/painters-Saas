import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/customers/customer_models.dart';
import 'package:shop_app/src/features/customers/customer_labels.dart';
import 'package:shop_app/src/shops/shop_models.dart';
import 'package:shop_app/src/shops/shop_permissions.dart';

import 'support/fakes.dart';

// SHP-012: the Customers tab, the customer page and painters' sites, on the
// ORD-004 API. The API keeps each shop's customers private (D-054).

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

/// Ravi has the order #1001 (the fake order 'o1' belongs to 'c-o1').
CustomerDetail _ravi() => const CustomerDetail(
  customer: ShopCustomer(
    id: 'c-o1',
    name: 'Ravi Painter',
    phone: '+919876543210',
    kind: CustomerKind.painter,
    hasApp: false,
  ),
  sites: [
    CustomerSite(
      id: 'site-a',
      name: 'Kakkanad villa',
      ownerName: 'Joseph',
      address: 'Door 4, Kakkanad',
      hasPin: true,
    ),
  ],
  archivedSites: [
    CustomerSite(
      id: 'site-old',
      name: 'Old flat',
      address: 'Flat 2, Edappally',
      archived: true,
    ),
  ],
  orderCount: 1,
);

CustomerDetail _meena() => const CustomerDetail(
  customer: ShopCustomer(
    id: 'c-meena',
    name: 'Meena',
    phone: '+919812345678',
    kind: CustomerKind.customer,
    hasApp: false,
  ),
  sites: [],
);

CustomerDetail _suresh() => const CustomerDetail(
  customer: ShopCustomer(
    id: 'c-suresh',
    name: 'Suresh',
    phone: '+919900011122',
    kind: CustomerKind.painter,
    hasApp: true,
  ),
  sites: [],
);

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is AppTextField && widget.label == label,
);

Finder _button(String label) => find.widgetWithText(AppButton, label);

Finder _chip(String label) => find.descendant(
  of: find.byType(AppChoiceChips<String>),
  matching: find.text(label),
);

void main() {
  late FakeShopCustomersRepository customers;
  late FakeShopOrdersRepository orders;

  setUp(() {
    customers = FakeShopCustomersRepository(
      customers: [_ravi(), _meena(), _suresh()],
    );
    orders = FakeShopOrdersRepository(
      orders: {
        'shop-a': [FakeOrder('o1', 1001)],
      },
    );
  });

  Future<void> openCustomers(
    WidgetTester tester, {
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
        orders: orders,
        customers: customers,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lakshmi Paints'));
    await tester.pumpAndSettle();
    await openTab(tester, 'Customers');
  }

  Future<void> openRavi(WidgetTester tester) async {
    await openCustomers(tester);
    await tester.tap(find.text('Ravi Painter'));
    await tester.pumpAndSettle();
  }

  group('customers list', () {
    testWidgets('shows type, mobile, how they order and counts', (
      tester,
    ) async {
      await openCustomers(tester);

      expect(find.text('Ravi Painter'), findsOneWidget);
      expect(find.text('+91 98765 43210 · Recorded by you'), findsOneWidget);
      expect(find.text('1 order · 1 site'), findsOneWidget);
      expect(find.text('+91 99000 11122 · Uses the app'), findsOneWidget);
      // App painters keep their own sites: no site count.
      expect(find.text('No orders yet'), findsNWidgets(2));
      expect(_button('Add customer'), findsOneWidget);
    });

    testWidgets('filters by type and searches by name or mobile', (
      tester,
    ) async {
      await openCustomers(tester);

      await tester.tap(_chip('Painters'));
      await tester.pumpAndSettle();
      expect(find.text('Meena'), findsNothing);
      expect(find.text('Suresh'), findsOneWidget);
      expect(customers.listed.last.kind, CustomerKind.painter);

      await tester.tap(_chip('All'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(AppSearchField), '98123');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(find.text('Meena'), findsOneWidget);
      expect(find.text('Ravi Painter'), findsNothing);

      await tester.enterText(find.byType(AppSearchField), 'nobody');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(find.text(CustomerMessages.noMatch), findsOneWidget);
      await tester.tap(_button('Show all customers'));
      await tester.pumpAndSettle();
      expect(find.text('Ravi Painter'), findsOneWidget);
    });

    testWidgets('loads more customers on request', (tester) async {
      customers.pageSize = 2;
      await openCustomers(tester);

      expect(find.text('Suresh'), findsNothing);
      await tester.tap(_button('Load more'));
      await tester.pumpAndSettle();
      expect(find.text('Suresh'), findsOneWidget);
      expect(_button('Load more'), findsNothing);
    });

    testWidgets('an empty shop explains what the tab is for', (tester) async {
      customers.customers.clear();
      await openCustomers(tester);

      expect(find.text(CustomerMessages.noCustomers), findsOneWidget);
    });

    testWidgets('a failed load can be retried', (tester) async {
      customers.nextError = const ApiException(status: 500);
      await openCustomers(tester);

      expect(find.text(CustomerMessages.listFailed), findsOneWidget);
      await tester.tap(_button('Try again'));
      await tester.pumpAndSettle();
      expect(find.text('Ravi Painter'), findsOneWidget);
    });

    testWidgets('adds a customer and opens their page', (tester) async {
      await openCustomers(tester);

      await tester.tap(_button('Add customer'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Name'), 'Anu');
      await tester.enterText(_field('Mobile number'), '98765 43210');
      await tester.tap(find.text('Customer').last);
      await tester.pumpAndSettle();
      await tester.tap(_button('Add customer').last);
      await tester.pumpAndSettle();
      expect(
        find.text('This mobile number is already in your customers.'),
        findsOneWidget,
      );

      await tester.enterText(_field('Mobile number'), '91234 56789');
      await tester.tap(_button('Add customer').last);
      await tester.pumpAndSettle();
      expect(find.text(CustomerMessages.added), findsOneWidget);
      expect(find.text('Call +91 91234 56789'), findsOneWidget);
      expect(customers.customers.last.customer.name, 'Anu');
    });
  });

  group('customer page', () {
    testWidgets('shows the customer, their orders and sites', (tester) async {
      await openRavi(tester);

      expect(find.text('Recorded by your shop'), findsOneWidget);
      expect(find.text('Call +91 98765 43210'), findsOneWidget);
      expect(find.textContaining('#1001'), findsOneWidget);
      expect(find.text('Kakkanad villa'), findsOneWidget);
      expect(find.text('Owner: Joseph'), findsOneWidget);
      expect(find.text(CustomerMessages.pinFromWeb), findsOneWidget);
      expect(find.text('Archived sites (1)'), findsOneWidget);

      await tester.tap(_button('Call +91 98765 43210'));
      await tester.pumpAndSettle();

      await tester.tap(find.textContaining('#1001'));
      await tester.pumpAndSettle();
      expect(find.text('Order #1001'), findsWidgets);
    });

    testWidgets('New order starts with this customer chosen', (tester) async {
      await openRavi(tester);

      await tester.tap(_button('New order'));
      await tester.pumpAndSettle();
      expect(find.text('Ravi Painter'), findsOneWidget);
      expect(_button('Change customer'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is AppDropdown<String?> &&
              widget.label == 'Site (optional)',
        ),
        findsOneWidget,
      );
    });

    // Found on the emulator: back from New order went to the Orders tab.
    testWidgets('back from New order and from an order returns here', (
      tester,
    ) async {
      await openRavi(tester);

      await tester.tap(_button('New order'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      expect(find.text('Recorded by your shop'), findsOneWidget);

      await tester.tap(find.textContaining('#1001'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      expect(find.text('Recorded by your shop'), findsOneWidget);
    });

    testWidgets('no New order without permission to record orders', (
      tester,
    ) async {
      await openCustomers(
        tester,
        shop: const MyShop(
          id: 'shop-a',
          name: 'Lakshmi Paints',
          status: 'ACTIVE',
          myRole: 'STAFF',
          permissions: {ShopPermission.customersManage},
        ),
      );
      await tester.tap(find.text('Ravi Painter'));
      await tester.pumpAndSettle();

      expect(_button('New order'), findsNothing);
      // The orders list needs orders.handle, so no latest orders either.
      expect(find.text('Latest orders'), findsNothing);
      expect(find.text('Kakkanad villa'), findsOneWidget);
    });

    testWidgets('edits the name and type', (tester) async {
      await openRavi(tester);

      await tester.tap(find.byTooltip('Edit customer'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Name'), 'Ravi K');
      await tester.tap(_button('Save changes'));
      await tester.pumpAndSettle();

      expect(find.text(CustomerMessages.saved), findsOneWidget);
      expect(find.text('Ravi K'), findsWidgets);
      expect(customers.customers.first.customer.name, 'Ravi K');
    });

    testWidgets("an app customer's mobile can't be changed", (tester) async {
      await openCustomers(tester);
      await tester.tap(find.text('Suresh'));
      await tester.pumpAndSettle();

      expect(find.text(CustomerMessages.sitesForAppPainters), findsOneWidget);
      expect(_button('Add site'), findsNothing);

      await tester.tap(find.byTooltip('Edit customer'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<AppTextField>(_field('Mobile number')).enabled,
        isFalse,
      );
    });

    testWidgets('a customer who is not a painter has no sites', (tester) async {
      await openCustomers(tester);
      await tester.tap(find.text('Meena'));
      await tester.pumpAndSettle();

      expect(find.text('Sites'), findsNothing);
      expect(find.text('No orders yet.'), findsOneWidget);
    });

    testWidgets('an unknown customer says so', (tester) async {
      await openCustomers(tester);
      customers.customers.removeAt(0);
      await tester.tap(find.text('Ravi Painter'));
      await tester.pumpAndSettle();

      expect(find.text(CustomerMessages.notFound), findsOneWidget);
    });
  });

  group('sites', () {
    testWidgets('adds a site, refusing a name already used', (tester) async {
      await openRavi(tester);

      await tester.tap(_button('Add site'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Add site').last);
      await tester.pumpAndSettle();
      expect(find.text('Enter the site name.'), findsOneWidget);
      expect(find.text('Enter the address or place.'), findsOneWidget);

      await tester.enterText(_field('Site name'), 'Kakkanad villa');
      await tester.enterText(_field('Address or place'), 'Plot 9, Kakkanad');
      await tester.tap(_button('Add site').last);
      await tester.pumpAndSettle();
      expect(
        find.text('This customer already has a site with this name.'),
        findsOneWidget,
      );

      await tester.enterText(_field('Site name'), 'Vyttila shop');
      await tester.tap(_button('Add site').last);
      await tester.pumpAndSettle();
      expect(find.text(CustomerMessages.siteAdded), findsOneWidget);
      expect(find.text('Vyttila shop'), findsOneWidget);
      expect(find.text('Plot 9, Kakkanad'), findsOneWidget);
    });

    testWidgets('edits a site and keeps its map pin', (tester) async {
      await openRavi(tester);

      await tester.tap(_button('Edit'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Owner name'), '');
      await tester.tap(_button('Save changes'));
      await tester.pumpAndSettle();

      expect(find.text('Owner: Joseph'), findsNothing);
      final site = customers.customers.first.sites.single;
      expect(site.ownerName, isNull);
      expect(site.hasPin, isTrue);
    });

    testWidgets('archives after confirmation and restores', (tester) async {
      await openRavi(tester);

      await tester.tap(_button('Archive'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Cancel'));
      await tester.pumpAndSettle();
      expect(customers.customers.first.sites, hasLength(1));

      await tester.tap(_button('Archive'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Archive site'));
      await tester.pumpAndSettle();
      expect(find.text(CustomerMessages.siteArchived), findsOneWidget);
      expect(find.text('Archived sites (2)'), findsOneWidget);
      expect(find.text(CustomerMessages.noSites), findsOneWidget);

      await tester.tap(_button('Restore').first);
      await tester.pumpAndSettle();
      expect(find.text(CustomerMessages.siteRestored), findsOneWidget);
      expect(find.text('Archived sites (1)'), findsOneWidget);
    });

    testWidgets('a refused archive is explained', (tester) async {
      await openRavi(tester);
      customers.nextError = const ApiException(
        status: 409,
        code: 'site_limit',
        detail:
            'A customer can have at most 50 active sites. Archive one first.',
      );

      await tester.tap(_button('Restore'));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'A customer can have at most 50 active sites. Archive one first.',
        ),
        findsOneWidget,
      );
    });
  });
}
