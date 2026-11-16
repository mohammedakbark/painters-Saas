import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/catalogue/product_photo_picker.dart';
import 'package:shop_app/src/features/shops/profile_sheets.dart';
import 'package:shop_app/src/features/shops/review_messages.dart';
import 'package:shop_app/src/shops/indian_states.dart';
import 'package:shop_app/src/shops/shop_models.dart';
import 'package:shop_app/src/shops/shop_permissions.dart';
import 'package:shop_app/src/shops/shop_review.dart';

import 'support/fakes.dart';

// SHP-013: the owner edits the profile and photo, and submits the shop for
// review, in the Shop App. The API checks permissions and the review lock.

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is AppTextField && widget.label == label,
);

Finder _button(String label) => find.widgetWithText(AppButton, label);

void main() {
  late FakeShopProfileRepository profiles;
  late FakeProductPhotoPicker photos;

  setUp(() {
    profiles = FakeShopProfileRepository(profiles: {'shop-a': lakshmiProfile});
    photos = FakeProductPhotoPicker();
  });

  Future<void> openShop(
    WidgetTester tester, {
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
        profiles: profiles,
        photos: photos,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lakshmi Paints'));
    await tester.pumpAndSettle();
  }

  Future<void> openProfile(
    WidgetTester tester, {
    MyShop shop = lakshmiShop,
  }) async {
    await openShop(tester, shop: shop);
    await openFromDrawer(tester, 'Shop profile');
  }

  group('profile', () {
    testWidgets('edits the support mobile', (tester) async {
      await openProfile(tester);

      await tester.tap(_button('Edit support mobile'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Support mobile'), '12345');
      await tester.tap(_button('Save'));
      await tester.pumpAndSettle();
      expect(find.text(ProfileFormMessages.phoneInvalid), findsOneWidget);

      await tester.enterText(_field('Support mobile'), '91234 56789');
      await tester.tap(_button('Save'));
      await tester.pumpAndSettle();
      expect(find.text(ProfileFormMessages.saved), findsOneWidget);
      expect(find.text('+91 91234 56789'), findsOneWidget);
      final saved = profiles.profiles['shop-a']!;
      expect(saved.supportPhone, '+919123456789');
      // The address is kept as it was.
      expect(saved.address?.line1, 'Door 12, MG Road');
    });

    testWidgets('edits the address, checking it first', (tester) async {
      await openProfile(tester);

      await tester.tap(_button('Edit address'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('City or town'), '');
      await tester.enterText(_field('PIN code'), '0123');
      await tester.tap(_button('Save address'));
      await tester.pumpAndSettle();
      expect(find.text('Enter the city or town.'), findsOneWidget);
      expect(find.text(ProfileFormMessages.postalCode), findsOneWidget);
      expect(profiles.saved, isEmpty);

      await tester.enterText(_field('City or town'), 'Aluva');
      await tester.enterText(_field('PIN code'), '683101');
      await tester.enterText(_field('Landmark'), 'Near the bus stand');
      await tester.tap(_button('Save address'));
      await tester.pumpAndSettle();
      expect(find.text('Aluva, Ernakulam'), findsOneWidget);
      expect(find.text('Landmark: Near the bus stand'), findsOneWidget);
      expect(profiles.profiles['shop-a']!.address?.stateCode, 'KL');
    });

    testWidgets('a field the API refuses is shown under the field', (
      tester,
    ) async {
      await openProfile(tester);
      profiles.saveError = const ApiException(
        status: 400,
        fieldErrors: {'address.district': 'Enter the district.'},
      );

      await tester.tap(_button('Edit address'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Save address'));
      await tester.pumpAndSettle();
      expect(find.text('Enter the district.'), findsOneWidget);
    });

    testWidgets('takes a new shop photo', (tester) async {
      photos.photo = PickedPhoto(
        bytes: Uint8List.fromList([0xFF, 0xD8, 0xFF, 0x00]),
        filename: 'shop.jpg',
        contentType: 'image/jpeg',
      );
      await openProfile(tester);

      await tester.tap(_button('Take photo'));
      await tester.pumpAndSettle();
      expect(photos.requested, [PhotoSource.camera]);
      expect(profiles.saved, ['photo shop.jpg']);
      expect(find.text(ProfileFormMessages.photoSaved), findsOneWidget);
    });

    testWidgets('cancelling the photo picker changes nothing', (tester) async {
      await openProfile(tester);

      await tester.tap(_button('Choose from gallery'));
      await tester.pumpAndSettle();
      expect(profiles.saved, isEmpty);
    });

    testWidgets('in review: shown, but locked', (tester) async {
      profiles.reviews['shop-a'] = ShopReviewState(
        status: 'PENDING_REVIEW',
        missing: const [],
        submittedAt: DateTime.utc(2026, 11, 16),
        lastDecision: null,
      );
      await openProfile(tester);

      expect(find.text(ProfileFormMessages.inReview), findsOneWidget);
      expect(_button('Edit address'), findsNothing);
      expect(_button('Take photo'), findsNothing);
      expect(_button('Use my current location'), findsNothing);
      expect(find.text('Door 12, MG Road'), findsOneWidget);
    });

    testWidgets('without shop.profile there is nothing to change', (
      tester,
    ) async {
      await openProfile(
        tester,
        shop: const MyShop(
          id: 'shop-a',
          name: 'Lakshmi Paints',
          status: 'DRAFT',
          myRole: 'STAFF',
          permissions: {ShopPermission.ordersHandle},
        ),
      );

      expect(find.text('Door 12, MG Road'), findsOneWidget);
      expect(_button('Edit address'), findsNothing);
      expect(_button('Edit support mobile'), findsNothing);
      expect(_button('Take photo'), findsNothing);
    });
  });

  group('review', () {
    testWidgets('submits a complete shop, then withdraws', (tester) async {
      await openShop(tester);

      await tester.tap(_button('Submit for review'));
      await tester.pumpAndSettle();
      expect(find.text(ReviewMessages.submitted), findsOneWidget);
      expect(find.text('In review'), findsOneWidget);
      expect(profiles.reviews['shop-a']?.status, 'PENDING_REVIEW');

      await tester.tap(_button('Withdraw submission'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Cancel'));
      await tester.pumpAndSettle();
      expect(profiles.reviews['shop-a']?.status, 'PENDING_REVIEW');

      await tester.tap(_button('Withdraw submission'));
      await tester.pumpAndSettle();
      await tester.tap(_button('Withdraw'));
      await tester.pumpAndSettle();
      expect(find.text(ReviewMessages.withdrawn), findsOneWidget);
      expect(profiles.reviews['shop-a']?.status, 'DRAFT');
      expect(_button('Submit for review'), findsOneWidget);
    });

    testWidgets('an incomplete checklist links to the profile', (tester) async {
      profiles.reviews['shop-a'] = const ShopReviewState(
        status: 'DRAFT',
        missing: ['photo', 'products'],
        submittedAt: null,
        lastDecision: null,
      );
      await openShop(tester);

      expect(
        find.text('Still to do before review: shop photo, 10 products.'),
        findsOneWidget,
      );
      expect(_button('Submit for review'), findsNothing);
      await tester.tap(_button('Open shop profile'));
      await tester.pumpAndSettle();
      expect(_button('Take photo'), findsOneWidget);
    });

    testWidgets('a refused submission is explained', (tester) async {
      await openShop(tester);
      profiles.reviewError = const ApiException(
        status: 409,
        code: 'onboarding_incomplete',
      );

      await tester.tap(_button('Submit for review'));
      await tester.pumpAndSettle();
      expect(find.text(ReviewMessages.incomplete), findsOneWidget);
    });

    testWidgets('staff without shop.profile only see the status', (
      tester,
    ) async {
      await openShop(
        tester,
        shop: const MyShop(
          id: 'shop-a',
          name: 'Lakshmi Paints',
          status: 'DRAFT',
          myRole: 'STAFF',
          permissions: {ShopPermission.catalogueView},
        ),
      );

      expect(_button('Submit for review'), findsNothing);
    });
  });

  test('the state list matches the API contract', () {
    final contract = jsonDecode(
      File('../../packages/api_contracts/openapi.json').readAsStringSync(),
    ) as Map<String, Object?>;
    final schemas =
        (contract['components']! as Map<String, Object?>)['schemas']!
            as Map<String, Object?>;
    final address = schemas['ShopAddressInput']! as Map<String, Object?>;
    final properties = address['properties']! as Map<String, Object?>;
    final stateCode = properties['stateCode']! as Map<String, Object?>;
    expect(
      {for (final state in indianStates) state.code},
      {for (final code in stateCode['enum']! as List<Object?>) code},
    );
    expect(indianStates.map((state) => state.code), contains(defaultStateCode));
  });
}
