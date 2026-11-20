import 'dart:async';

import 'package:customer_app/src/features/storefront/product_card.dart';
import 'package:customer_app/src/features/storefront/product_screen.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/storefront/storefront_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'support/fakes.dart';

const _sizes = [
  StorefrontPack(id: 'e1', label: '1 L', pricePaise: 50000, available: true),
  StorefrontPack(id: 'e4', label: '4 L', pricePaise: 180000, available: false),
];

FakeStorefrontRepository _storefront() => FakeStorefrontRepository({
  'k': [
    testProduct('emulsion', 'Emulsion', packs: _sizes, supportsShades: true),
    testProduct(
      'putty',
      'Wall Putty',
      category: 'Primers',
      brand: 'Local Brand',
      packs: const [
        StorefrontPack(
          id: 'w5',
          label: '5 kg',
          pricePaise: 64000,
          available: false,
        ),
      ],
    ),
  ],
  't': [testProduct('roller', 'Paint Roller', category: 'Tools')],
});

Future<FakeStorefrontRepository> _homeWithActiveShop(
  WidgetTester tester, {
  FakeStorefrontRepository? storefront,
}) async {
  final repository = storefront ?? _storefront();
  await pumpApp(
    tester,
    auth: FakeAuthRepository(signedIn: true),
    profiles: FakeCustomerProfileRepository(
      profileOf('Meera', CustomerType.customer),
    ),
    shops: FakeShopsRepository([
      testShop('k', 'Kochi Paints'),
      testShop('t', 'Thrissur Colours', district: 'Thrissur'),
    ]),
    activeShop: FakeActiveShopStore('k'),
    storefront: repository,
  );
  return repository;
}

void main() {
  testWidgets("Home shows the active shop's products with prices", (
    tester,
  ) async {
    await _homeWithActiveShop(tester);

    expect(find.text('Shopping from'), findsOneWidget);
    expect(find.byType(ProductCard), findsNWidgets(2));
    expect(find.text('Emulsion'), findsOneWidget);
    expect(find.text('From ₹500'), findsOneWidget);
    // Nothing in Wall Putty can be bought (D-029).
    expect(find.text('₹640'), findsOneWidget);
    expect(find.text('Not available'), findsOneWidget);
    // Browse only: no Add button yet (owner, 2026-11-20).
    expect(find.text('Add'), findsNothing);
  });

  testWidgets('category chips and search narrow the list', (tester) async {
    final repository = await _homeWithActiveShop(tester);

    await tapVisible(tester, find.text('Primers'));
    expect(repository.productCalls.last.$3, 'cat-primers');
    expect(find.byType(ProductCard), findsOneWidget);
    expect(find.text('Wall Putty'), findsOneWidget);

    await tapVisible(tester, find.text('All'));
    await tester.enterText(find.byType(TextField).first, 'emul');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    expect(repository.productCalls.last.$2, 'emul');
    expect(find.byType(ProductCard), findsOneWidget);
    expect(find.text('Emulsion'), findsOneWidget);
  });

  testWidgets('product page: sizes with price and availability', (
    tester,
  ) async {
    await _homeWithActiveShop(tester);
    await tapVisible(tester, find.text('Emulsion'));

    expect(find.byType(ProductScreen), findsOneWidget);
    expect(find.text('Asian Colours'), findsOneWidget);
    expect(find.text('₹500  1 L'), findsOneWidget);
    expect(find.text('Available'), findsOneWidget);
    expect(
      find.text('Available in shades. You choose the shade when you order.'),
      findsOneWidget,
    );

    await tapVisible(tester, find.text('4 L'));
    expect(find.text('₹1,800  4 L'), findsOneWidget);
    expect(find.text('Not available'), findsOneWidget);
    expect(find.text('4 L: ₹1,800 (not available)'), findsOneWidget);
    expect(find.text('Emulsion description'), findsOneWidget);
  });

  testWidgets("another shop's products open from its page without switching", (
    tester,
  ) async {
    final repository = await _homeWithActiveShop(tester);
    await tapVisible(tester, find.byKey(const Key('change-shop')));
    await tapVisible(tester, find.text('Thrissur Colours'));
    await tapVisible(tester, find.byKey(const Key('browse-products')));

    expect(repository.productCalls.last.$1, 't');
    expect(find.text('Paint Roller'), findsOneWidget);
    expect(find.text('Emulsion'), findsNothing);
  });

  testWidgets('an empty shop says so', (tester) async {
    await _homeWithActiveShop(tester, storefront: FakeStorefrontRepository());
    expect(find.text('No products yet'), findsOneWidget);
  });

  testWidgets('a removed product says it is not available', (tester) async {
    await _homeWithActiveShop(tester);
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    unawaited((app.routerConfig! as GoRouter).push('/shop/k/product/gone'));
    await tester.pumpAndSettle();
    expect(find.text('This product is not available'), findsOneWidget);
  });
}
