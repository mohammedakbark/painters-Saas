import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/catalogue/catalogue_models.dart';
import 'package:shop_app/src/catalogue/shades_repository.dart';
import 'package:shop_app/src/features/catalogue/categories_screen.dart';
import 'package:shop_app/src/features/catalogue/shades_screen.dart';
import 'package:shop_app/src/shops/shop_models.dart';
import 'package:shop_app/src/shops/shop_permissions.dart';

import 'support/fakes.dart';

// SHP-014: Shades (WEB-006 API) and Categories (CAT-007 API) in the Shop
// App. `catalogue.view` sees them; `catalogue.manage` changes them.

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is AppTextField && widget.label == label,
);

Finder _button(String label) => find.widgetWithText(AppButton, label);

/// The chip row scrolls sideways; bring the chip on screen first.
Future<void> _tapChip(WidgetTester tester, String label) async {
  await tester.ensureVisible(_chip(label));
  await tester.pumpAndSettle();
  await tester.tap(_chip(label));
  await tester.pumpAndSettle();
}

Finder _chip(String label) => find.descendant(
  of: find.byWidgetPredicate((widget) => widget is AppChoiceChips),
  matching: find.textContaining(label),
);

const _viewer = MyShop(
  id: 'shop-a',
  name: 'Lakshmi Paints',
  status: 'DRAFT',
  myRole: 'STAFF',
  permissions: {ShopPermission.catalogueView},
);

void main() {
  late FakeShadesRepository shades;
  late FakeCategoriesRepository categories;

  setUp(() {
    shades = FakeShadesRepository();
    categories = FakeCategoriesRepository();
  });

  Future<void> open(
    WidgetTester tester,
    String row, {
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
        catalogue: FakeShopCatalogueRepository(
          brands: const [
            CatalogueBrand(
              id: 'brand-1',
              name: 'Royal Paints',
              productCount: 3,
            ),
          ],
        ),
        shades: shades,
        categories: categories,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lakshmi Paints'));
    await tester.pumpAndSettle();
    await openFromDrawer(tester, row);
  }

  group('shades', () {
    testWidgets('marks a brand shade as a favourite and removes it', (
      tester,
    ) async {
      await open(tester, 'Shades');
      expect(find.text(ShadeMessages.noFavourites), findsOneWidget);

      await _tapChip(tester, 'Brand shades');
      expect(find.text('RP 101'), findsOneWidget);
      expect(find.text('Ivory'), findsOneWidget);

      await tester.tap(_button('Add to favourites').first);
      await tester.pumpAndSettle();
      expect(shades.favouriteIds, {'b1'});
      expect(find.text(ShadeMessages.favouriteAdded), findsOneWidget);
      expect(find.text('Favourite'), findsOneWidget);

      await _tapChip(tester, 'Favourites');
      expect(find.text('Ivory · Royal Paints'), findsOneWidget);
      await tester.tap(_button('Remove favourite'));
      await tester.pumpAndSettle();
      expect(shades.favouriteIds, isEmpty);
      expect(find.text('RP 101'), findsNothing);
    });

    testWidgets('searches and loads more', (tester) async {
      shades.pageSize = 2;
      await open(tester, 'Shades');
      await _tapChip(tester, 'Brand shades');

      expect(find.text('RP 103'), findsNothing);
      await tester.tap(_button('Load more'));
      await tester.pumpAndSettle();
      expect(find.text('RP 103'), findsOneWidget);

      await tester.enterText(find.byType(AppSearchField), 'sky');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(find.text('RP 102'), findsOneWidget);
      expect(find.text('RP 101'), findsNothing);

      await tester.enterText(find.byType(AppSearchField), 'nothing');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(find.text(ShadeMessages.noMatch), findsOneWidget);
    });

    testWidgets('adds a shade of your own and removes it', (tester) async {
      await open(tester, 'Shades');
      await _tapChip(tester, 'My shades');
      expect(find.text(ShadeMessages.noOwn), findsOneWidget);

      await tester.tap(_button('Add shade'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Shade code'), '#bad');
      await tester.enterText(_field('Screen colour'), 'blue');
      await tester.tap(_button('Add shade').last);
      await tester.pumpAndSettle();
      expect(find.text(ShadeMessages.codeInvalid), findsOneWidget);
      expect(find.text(ShadeMessages.nameRequired), findsOneWidget);
      expect(find.text(ShadeMessages.hexInvalid), findsOneWidget);

      await tester.enterText(_field('Shade code'), 'sp  1204');
      await tester.enterText(_field('Shade name'), 'Sunset');
      await tester.enterText(_field('Screen colour'), 'E8D5B7');
      await tester.tap(_button('Add shade').last);
      await tester.pumpAndSettle();
      expect(find.text(ShadeMessages.added), findsOneWidget);
      expect(find.text('SP 1204'), findsOneWidget);
      expect(shades.own.single.previewHex, '#E8D5B7');

      await tester.tap(_button('Remove'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Remove shade'));
      await tester.pumpAndSettle();
      expect(shades.own, isEmpty);
      expect(find.text(ShadeMessages.removed), findsOneWidget);
    });

    testWidgets('a duplicate code is shown on the field', (tester) async {
      shades.own.add(
        const ShadeItem(
          id: 'own-x',
          code: 'SP 1204',
          name: 'Sunset',
          previewHex: null,
        ),
      );
      await open(tester, 'Shades');
      await _tapChip(tester, 'My shades');

      await tester.tap(_button('Add shade'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Shade code'), 'SP 1204');
      await tester.enterText(_field('Shade name'), 'Again');
      await tester.tap(_button('Add shade').last);
      await tester.pumpAndSettle();
      expect(
        find.text('You already have a shade with the code SP 1204.'),
        findsOneWidget,
      );
    });

    testWidgets('a failed load can be retried', (tester) async {
      shades.nextError = const ApiException(status: 500);
      await open(tester, 'Shades');

      expect(find.text(ShadeMessages.loadFailed), findsOneWidget);
      await tester.tap(_button('Try again'));
      await tester.pumpAndSettle();
      expect(find.text(ShadeMessages.noFavourites), findsOneWidget);
    });

    testWidgets('catalogue.view only: the lists without changes', (
      tester,
    ) async {
      await open(tester, 'Shades', shop: _viewer);
      await _tapChip(tester, 'Brand shades');

      expect(find.text('RP 101'), findsOneWidget);
      expect(_button('Add to favourites'), findsNothing);
      await _tapChip(tester, 'My shades');
      expect(_button('Add shade'), findsNothing);
    });
  });

  group('categories', () {
    testWidgets('lists platform and own categories with counts', (
      tester,
    ) async {
      await open(tester, 'Categories');

      expect(find.text('Interior emulsion'), findsOneWidget);
      expect(find.text('4 products'), findsOneWidget);
      expect(find.widgetWithText(AppBadge, 'Platform'), findsNWidgets(2));

      await _tapChip(tester, 'Yours');
      expect(find.text(CategoryMessages.noOwn), findsOneWidget);
    });

    testWidgets('adds, renames, archives and restores an own category', (
      tester,
    ) async {
      await open(tester, 'Categories');

      await tester.tap(_button('Add category'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Category name'), 'x');
      await tester.tap(_button('Add category').last);
      await tester.pumpAndSettle();
      expect(find.text(CategoryMessages.nameLength), findsOneWidget);

      await tester.enterText(_field('Category name'), 'interior EMULSION');
      await tester.tap(_button('Add category').last);
      await tester.pumpAndSettle();
      expect(
        find.text('There is already a category named "interior EMULSION".'),
        findsOneWidget,
      );

      await tester.enterText(_field('Category name'), 'Wood polish');
      await tester.tap(_button('Add category').last);
      await tester.pumpAndSettle();
      expect(find.text(CategoryMessages.added), findsOneWidget);
      expect(find.text('Yours'), findsWidgets);

      await tester.tap(find.text('Wood polish'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Category name'), 'Wood finishes');
      await tester.tap(_button('Save name'));
      await tester.pumpAndSettle();
      expect(find.text('Wood finishes'), findsOneWidget);

      await tester.tap(find.text('Wood finishes'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Archive category'));
      await tester.pumpAndSettle();
      expect(find.text(CategoryMessages.archived), findsOneWidget);
      expect(find.text('Archived'), findsOneWidget);

      await tester.tap(find.text('Wood finishes'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Restore category'));
      await tester.pumpAndSettle();
      expect(find.text('Archived'), findsNothing);
    });

    testWidgets('platform categories open nothing; viewers change nothing', (
      tester,
    ) async {
      await open(tester, 'Categories', shop: _viewer);

      expect(_button('Add category'), findsNothing);
      await tester.tap(find.text('Interior emulsion'));
      await tester.pumpAndSettle();
      expect(_field('Category name'), findsNothing);
    });
  });

  testWidgets('without catalogue.view the menu has no Catalogue section', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 3600);
    tester.view.devicePixelRatio = 2.5;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      testApp(
        auth: FakeAuthRepository(signedIn: true),
        shops: FakeShopAccessRepository(
          memberships: [lakshmi],
          shops: {
            'shop-a': const MyShop(
              id: 'shop-a',
              name: 'Lakshmi Paints',
              status: 'DRAFT',
              myRole: 'STAFF',
              permissions: {ShopPermission.ordersHandle},
            ),
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lakshmi Paints'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Open navigation menu').first);
    await tester.pumpAndSettle();

    expect(find.text('Shades'), findsNothing);
    expect(find.text('Categories'), findsNothing);
  });
}
