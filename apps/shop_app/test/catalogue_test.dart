import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/catalogue/catalogue_models.dart';
import 'package:shop_app/src/catalogue/product_photo_picker.dart';
import 'package:shop_app/src/catalogue/shop_catalogue_repository.dart';
import 'package:shop_app/src/features/catalogue/catalogue_messages.dart';
import 'package:shop_app/src/shops/shop_models.dart';

import 'support/fakes.dart';

const _staffShop = MyShop(
  id: 'shop-a',
  name: 'Lakshmi Paints',
  status: 'ACTIVE',
  myRole: 'STAFF',
);

/// Finds a field by its label setting (the shown label may add a marker).
Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is AppTextField && widget.label == label,
);

void main() {
  late FakeShopCatalogueRepository catalogue;
  late FakeProductPhotoPicker photos;

  setUp(() {
    catalogue = FakeShopCatalogueRepository(
      products: {
        'shop-a': [
          testProduct(
            'p1',
            'Silk Emulsion',
            packs: [
              testPack('p1-1', '1 L', pricePaise: 45000, mrpPaise: 50000),
              testPack('p1-4', '4 L', pricePaise: 145050, available: false),
            ],
          ),
          testProduct('p2', 'Wall Primer'),
          testProduct('p3', 'Old Enamel', archived: true),
        ],
      },
    );
    photos = FakeProductPhotoPicker();
  });

  /// Signs in, opens the shop, then its products.
  Future<void> openProducts(
    WidgetTester tester, {
    MyShop shop = lakshmiShop,
  }) async {
    tester.view.physicalSize = const Size(1080, 3200);
    tester.view.devicePixelRatio = 2.5;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      testApp(
        auth: FakeAuthRepository(signedIn: true),
        shops: FakeShopAccessRepository(
          memberships: [lakshmi],
          shops: {'shop-a': shop},
        ),
        catalogue: catalogue,
        photos: photos,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lakshmi Paints'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Products'));
    await tester.pumpAndSettle();
  }

  Future<void> openProduct(
    WidgetTester tester,
    String name, {
    MyShop shop = lakshmiShop,
  }) async {
    await openProducts(tester, shop: shop);
    await tester.tap(find.text(name));
    await tester.pumpAndSettle();
  }

  Finder availability(String label) => find.byWidgetPredicate(
    (widget) =>
        widget is AppSwitchRow && widget.semanticLabel == '$label available',
  );

  Finder button(String label) => find.widgetWithText(AppButton, label);

  group('product list', () {
    testWidgets('shows products with prices, MRP and availability', (
      tester,
    ) async {
      await openProducts(tester);

      expect(find.text('Silk Emulsion'), findsOneWidget);
      expect(find.text('Demo Paints · Interior emulsion'), findsNWidgets(2));
      expect(find.text('1 L · ₹450'), findsOneWidget);
      expect(find.text('MRP ₹500'), findsOneWidget);
      expect(find.text('4 L · ₹1,450.5'), findsOneWidget);
      expect(find.text('Not available'), findsOneWidget);
      expect(find.text('Old Enamel'), findsNothing);
      expect(button('Add from brand catalogue'), findsOneWidget);
    });

    testWidgets('switches to archived products and searches by name', (
      tester,
    ) async {
      await openProducts(tester);

      await tester.tap(find.text('Archived'));
      await tester.pumpAndSettle();
      expect(find.text('Old Enamel'), findsOneWidget);
      expect(find.text('Silk Emulsion'), findsNothing);

      await tester.tap(find.text('Selling'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(AppSearchField), 'primer');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(find.text('Wall Primer'), findsOneWidget);
      expect(find.text('Silk Emulsion'), findsNothing);

      await tester.enterText(find.byType(AppSearchField), 'nothing');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(find.text(CatalogueMessages.noMatch('nothing')), findsOneWidget);
    });

    testWidgets('loads more products page by page', (tester) async {
      catalogue = FakeShopCatalogueRepository(
        pageSize: 2,
        products: {
          'shop-a': [
            for (var i = 1; i <= 3; i++) testProduct('p$i', 'Product $i'),
          ],
        },
      );
      await openProducts(tester);

      expect(find.text('Product 3'), findsNothing);
      await tester.tap(button('Load more'));
      await tester.pumpAndSettle();
      expect(find.text('Product 3'), findsOneWidget);
      expect(button('Load more'), findsNothing);
    });

    testWidgets('an empty catalogue explains what to do', (tester) async {
      catalogue = FakeShopCatalogueRepository();
      await openProducts(tester);

      expect(find.text(CatalogueMessages.noProducts), findsOneWidget);
      expect(find.text(CatalogueMessages.noProductsOwner), findsOneWidget);
    });

    testWidgets('a failed load can be retried', (tester) async {
      catalogue.listError = const ApiException();
      await openProducts(tester);

      expect(find.text(CatalogueMessages.listFailed), findsOneWidget);
      await tester.tap(button('Try again'));
      await tester.pumpAndSettle();
      expect(find.text('Silk Emulsion'), findsOneWidget);
    });

    testWidgets('a shop the user cannot access is not found', (tester) async {
      catalogue = FakeShopCatalogueRepository(products: {});
      await openProducts(tester);

      expect(find.text('Shop not found'), findsOneWidget);
    });
  });

  group('product page', () {
    testWidgets('turning a pack off saves it and says so', (tester) async {
      await openProduct(tester, 'Silk Emulsion');

      await tester.tap(availability('1 L'));
      await tester.pumpAndSettle();

      final (packId, change) = catalogue.packChanges.single;
      expect(packId, 'p1-1');
      expect(change.toJson(), {'available': false});
      expect(
        find.text(CatalogueMessages.availabilitySaved('1 L', false)),
        findsOneWidget,
      );
      expect(tester.widget<AppSwitchRow>(availability('1 L')).value, isFalse);
    });

    testWidgets('a failed availability change keeps the saved state', (
      tester,
    ) async {
      await openProduct(tester, 'Silk Emulsion');
      catalogue.nextError = const ApiException();

      await tester.tap(availability('1 L'));
      await tester.pumpAndSettle();

      expect(tester.widget<AppSwitchRow>(availability('1 L')).value, isTrue);
      expect(find.text(CatalogueMessages.offline), findsOneWidget);
    });

    testWidgets('members who are not the owner only see the catalogue', (
      tester,
    ) async {
      await openProduct(tester, 'Silk Emulsion', shop: _staffShop);

      expect(find.text('1 L · ₹450'), findsOneWidget);
      expect(availability('1 L'), findsNothing);
      expect(button('Change price'), findsNothing);
      expect(button('Archive product'), findsNothing);
      expect(button('Take photo'), findsNothing);
    });

    testWidgets('the price sheet checks the amounts before saving', (
      tester,
    ) async {
      await openProduct(tester, 'Silk Emulsion');
      await tester.tap(button('Change price').first);
      await tester.pumpAndSettle();
      expect(find.text('Price of 1 L'), findsOneWidget);

      final price = _field('Your price');
      await tester.enterText(price, 'abc');
      await tester.tap(button('Save price'));
      await tester.pumpAndSettle();
      expect(
        find.text('Enter the price in rupees, for example 1450 or 1450.50.'),
        findsOneWidget,
      );

      await tester.enterText(price, '600');
      await tester.tap(button('Save price'));
      await tester.pumpAndSettle();
      expect(find.text(CatalogueMessages.priceAboveMrp), findsOneWidget);
      expect(catalogue.packChanges, isEmpty);
    });

    testWidgets('saving a price can clear the MRP', (tester) async {
      await openProduct(tester, 'Silk Emulsion');
      await tester.tap(button('Change price').first);
      await tester.pumpAndSettle();

      await tester.enterText(_field('Your price'), '1,450.50');
      await tester.enterText(_field('MRP (optional)'), '');
      await tester.tap(button('Save price'));
      await tester.pumpAndSettle();

      expect(catalogue.packChanges.single.$2.toJson(), {
        'pricePaise': 145050,
        'mrpPaise': null,
      });
      expect(find.text(CatalogueMessages.priceSaved), findsOneWidget);
      expect(find.text('1 L · ₹1,450.5'), findsOneWidget);
      expect(find.text('MRP ₹500'), findsNothing);
    });

    testWidgets('an API field error shows on its field', (tester) async {
      await openProduct(tester, 'Silk Emulsion');
      await tester.tap(button('Change price').first);
      await tester.pumpAndSettle();
      catalogue.nextError = const ApiException(
        status: 400,
        code: 'validation_failed',
        fieldErrors: {'pricePaise': 'The price is too large.'},
      );

      await tester.tap(button('Save price'));
      await tester.pumpAndSettle();

      expect(find.text('The price is too large.'), findsOneWidget);
      expect(find.text('Price of 1 L'), findsOneWidget);
    });

    testWidgets('the last pack size cannot be removed', (tester) async {
      await openProduct(tester, 'Wall Primer');

      final remove = tester.widget<AppButton>(button('Remove'));
      expect(remove.onPressed, isNull);
      expect(find.text(CatalogueMessages.lastPack), findsOneWidget);
    });

    testWidgets('removing a pack size asks first', (tester) async {
      await openProduct(tester, 'Silk Emulsion');

      await tester.tap(button('Remove').last);
      await tester.pumpAndSettle();
      expect(
        find.text(CatalogueMessages.removePackTitle('4 L')),
        findsOneWidget,
      );
      await tester.tap(button('Remove').last);
      await tester.pumpAndSettle();

      expect(catalogue.removedPacks, ['p1-4']);
      expect(find.text(CatalogueMessages.packRemoved('4 L')), findsOneWidget);
    });

    testWidgets('a brand catalogue pack size can be added', (tester) async {
      catalogue.products['shop-a']!.add(
        testProduct(
          'p9',
          'Roof Coat',
          unlisted: const [
            CataloguePack(
              id: 'cp-20',
              quantity: 20,
              unit: PackUnit.litre,
              label: '20 L',
            ),
          ],
        ),
      );
      await openProduct(tester, 'Roof Coat');

      await tester.tap(button('Add a pack size'));
      await tester.pumpAndSettle();
      expect(find.text('20 L'), findsOneWidget);
      await tester.enterText(_field('Your price'), '5200');
      await tester.tap(button('Add pack size'));
      await tester.pumpAndSettle();

      final (productId, pack) = catalogue.addedPacks.single;
      expect(productId, 'p9');
      expect(pack.toJson(), {
        'cataloguePackId': 'cp-20',
        'pricePaise': 520000,
        'mrpPaise': null,
        'available': true,
      });
      expect(find.text('20 L · ₹5,200'), findsOneWidget);
    });

    testWidgets('an own product pack size needs a quantity', (tester) async {
      catalogue.products['shop-a']!.add(
        testProduct('p8', 'Putty', source: ProductSource.own),
      );
      await openProduct(tester, 'Putty');

      await tester.tap(button('Add a pack size'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Your price'), '300');
      await tester.tap(button('Add pack size'));
      await tester.pumpAndSettle();
      expect(find.text('Enter the pack quantity.'), findsOneWidget);

      await tester.enterText(_field('Quantity'), '5');
      await tester.tap(button('Add pack size'));
      await tester.pumpAndSettle();
      expect(catalogue.addedPacks.single.$2.toJson(), {
        'quantity': 5.0,
        'unit': 'LITRE',
        'pricePaise': 30000,
        'mrpPaise': null,
        'available': true,
      });
    });

    testWidgets('archiving asks first; restoring does not', (tester) async {
      await openProduct(tester, 'Silk Emulsion');

      await tester.tap(button('Archive product'));
      await tester.pumpAndSettle();
      expect(find.text(CatalogueMessages.archiveTitle), findsOneWidget);
      await tester.tap(button('Archive'));
      await tester.pumpAndSettle();
      expect(find.text(CatalogueMessages.archivedNotice), findsOneWidget);

      // Let the "archived" snack bar close; it floats over the bottom.
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        button('Restore product'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(button('Restore product'));
      await tester.pumpAndSettle();
      expect(catalogue.statusChanges, [('p1', true), ('p1', false)]);
      expect(find.text(CatalogueMessages.archivedNotice), findsNothing);
    });

    testWidgets('a photo is uploaded; cancelling does nothing', (tester) async {
      await openProduct(tester, 'Silk Emulsion');

      await tester.tap(button('Choose from gallery'));
      await tester.pumpAndSettle();
      expect(catalogue.photos, isEmpty);

      photos.photo = PickedPhoto(
        bytes: Uint8List.fromList([0xFF, 0xD8, 0xFF, 0x00]),
        filename: 'product-photo.jpg',
        contentType: 'image/jpeg',
      );
      await tester.tap(button('Take photo'));
      await tester.pumpAndSettle();

      expect(photos.requested, [PhotoSource.gallery, PhotoSource.camera]);
      expect(catalogue.photos.single.$1, 'p1');
      expect(find.text(CatalogueMessages.photoSaved), findsOneWidget);
    });

    testWidgets('a photo that is too large is explained', (tester) async {
      await openProduct(tester, 'Silk Emulsion');
      photos.photo = PickedPhoto(
        bytes: Uint8List(4),
        filename: 'product-photo.jpg',
        contentType: 'image/jpeg',
      );
      catalogue.nextError = const ApiException(status: 413);

      await tester.tap(button('Take photo'));
      await tester.pumpAndSettle();

      expect(find.text(CatalogueMessages.photoTooLarge), findsOneWidget);
    });

    testWidgets('a 403 says only the owner can change the catalogue', (
      tester,
    ) async {
      await openProduct(tester, 'Silk Emulsion');
      // ApiShopCatalogueRepository turns a 403 into CatalogueForbidden.
      catalogue.nextError = const CatalogueForbidden();
      await tester.tap(availability('1 L'));
      await tester.pumpAndSettle();

      expect(find.text(CatalogueMessages.forbidden), findsOneWidget);
    });
  });

  group('add from brand catalogue', () {
    final brands = [
      const CatalogueBrand(id: 'b1', name: 'Demo Paints', productCount: 2),
    ];

    testWidgets('an empty brand catalogue says so', (tester) async {
      await openProducts(tester);
      await tester.tap(button('Add from brand catalogue'));
      await tester.pumpAndSettle();

      expect(find.text(CatalogueMessages.noBrands), findsOneWidget);
    });

    testWidgets('lists a product with prices and opens it', (tester) async {
      catalogue = FakeShopCatalogueRepository(
        products: {'shop-a': []},
        brands: brands,
        brandProducts: {
          'b1': [
            BrandProductItem(
              product: testCatalogueProduct('c1', 'Weather Coat'),
              listedProductId: null,
            ),
            BrandProductItem(
              product: testCatalogueProduct('c2', 'Silk Emulsion'),
              listedProductId: 'p1',
            ),
          ],
        },
      );
      await openProducts(tester);
      await tester.tap(button('Add from brand catalogue'));
      await tester.pumpAndSettle();

      expect(find.text('In your products'), findsOneWidget);
      expect(button('Open'), findsOneWidget);
      await tester.tap(button('Add'));
      await tester.pumpAndSettle();
      expect(find.text('Sell 1 L'), findsOneWidget);

      // 4 L is not sold; 1 L gets a price.
      await tester.tap(find.text('Sell 4 L'));
      await tester.pumpAndSettle();
      await tester.tap(button('Add to my products'));
      await tester.pumpAndSettle();
      expect(
        find.text('Enter the price in rupees, for example 1450 or 1450.50.'),
        findsOneWidget,
      );
      await tester.enterText(_field('Your price for 1 L'), '420');
      await tester.tap(button('Add to my products'));
      await tester.pumpAndSettle();

      final (catalogueId, prices) = catalogue.listings.single;
      expect(catalogueId, 'c1');
      expect(prices.keys, ['cp-1']);
      expect(prices['cp-1']!.pricePaise, 42000);
      expect(find.text('Weather Coat'), findsOneWidget);
      expect(find.text('1 L · ₹420'), findsOneWidget);
    });

    testWidgets('a product already listed elsewhere is explained', (
      tester,
    ) async {
      catalogue = FakeShopCatalogueRepository(
        products: {'shop-a': []},
        brands: brands,
        brandProducts: {
          'b1': [
            BrandProductItem(
              product: testCatalogueProduct('c1', 'Weather Coat'),
              listedProductId: null,
            ),
          ],
        },
      );
      await openProducts(tester);
      await tester.tap(button('Add from brand catalogue'));
      await tester.pumpAndSettle();
      await tester.tap(button('Add'));
      await tester.pumpAndSettle();
      for (final label in ['1 L', '4 L']) {
        await tester.enterText(_field('Your price for $label'), '100');
      }
      catalogue.nextError = const ApiException(
        status: 409,
        code: 'product_already_listed',
        detail: 'This product is already in your catalogue.',
      );

      await tester.tap(button('Add to my products'));
      await tester.pumpAndSettle();

      expect(
        find.text('This product is already in your catalogue.'),
        findsOneWidget,
      );
      expect(button('Go to your products'), findsOneWidget);
    });
  });
}
