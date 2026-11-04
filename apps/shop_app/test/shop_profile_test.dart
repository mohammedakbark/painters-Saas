import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/features/shops/shop_profile_screen.dart';
import 'package:shop_app/src/location/location_service.dart';
import 'package:shop_app/src/shops/shop_profile.dart';

import 'support/fakes.dart';

void main() {
  late FakeShopProfileRepository profiles;
  late FakeLocationService location;

  setUp(() {
    profiles = FakeShopProfileRepository(profiles: {'shop-a': lakshmiProfile});
    location = FakeLocationService();
  });

  /// Signs in, opens Lakshmi Paints, then its profile.
  Future<void> openProfile(WidgetTester tester) async {
    // A phone-sized screen, so the whole profile fits without scrolling.
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.5;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      testApp(
        auth: FakeAuthRepository(signedIn: true),
        shops: FakeShopAccessRepository(
          memberships: [lakshmi],
          shops: {'shop-a': lakshmiShop},
        ),
        profiles: profiles,
        location: location,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lakshmi Paints'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Shop profile'));
    await tester.pumpAndSettle();
  }

  Finder useCurrentLocation() =>
      find.widgetWithText(AppButton, 'Use my current location');

  /// Taps "Use my current location" (the screen is tall enough to show it).
  Future<void> tapUseCurrentLocation(WidgetTester tester) =>
      tester.tap(useCurrentLocation());

  testWidgets('shows the address and support mobile from the web portal', (
    tester,
  ) async {
    await openProfile(tester);

    expect(find.text('Door 12, MG Road'), findsOneWidget);
    expect(find.text('Kochi, Ernakulam'), findsOneWidget);
    expect(find.text('Kerala 682016'), findsOneWidget);
    expect(find.text('+91 98765 43210'), findsOneWidget);
    expect(find.text(ShopProfileMessages.noLocation), findsOneWidget);
    expect(useCurrentLocation(), findsOneWidget);
  });

  testWidgets('shows the shop photo, with a message when it cannot load', (
    tester,
  ) async {
    profiles.profiles['shop-a'] = const ShopProfile(
      shopId: 'shop-a',
      shopName: 'Lakshmi Paints',
      supportPhone: null,
      address: null,
      location: null,
      photo: ShopPhoto(
        url: 'https://media.test.invalid/photo-1600.webp',
        thumbUrl: 'https://media.test.invalid/photo-480.webp',
      ),
    );
    await openProfile(tester);

    final image = tester.widget<Image>(
      find.byWidgetPredicate(
        (widget) => widget is Image && widget.semanticLabel == 'Shop photo',
      ),
    );
    expect(
      (image.image as NetworkImage).url,
      'https://media.test.invalid/photo-1600.webp',
    );
    // Widget tests answer every HTTP request with an error.
    expect(find.text(ShopProfileMessages.photoFailed), findsOneWidget);
  });

  testWidgets('explains what is missing on an empty profile', (tester) async {
    profiles.profiles['shop-a'] = const ShopProfile(
      shopId: 'shop-a',
      shopName: 'Lakshmi Paints',
      supportPhone: null,
      address: null,
      location: null,
    );
    await openProfile(tester);

    // Photo, address and support mobile.
    expect(find.text(ShopProfileMessages.notAdded), findsNWidgets(3));
  });

  testWidgets(
    'saves the current location after confirmation and shows it without a map key',
    (tester) async {
      location.result = const LocationFound(
        latitude: 10.0261,
        longitude: 76.3125,
        accuracyMeters: 8.4,
      );
      await openProfile(tester);

      await tapUseCurrentLocation(tester);
      await tester.pumpAndSettle();
      expect(find.text('Save this as the shop location?'), findsOneWidget);
      expect(find.textContaining('Accurate to about 8 m'), findsOneWidget);
      await tester.tap(find.widgetWithText(AppButton, 'Save location'));
      await tester.pumpAndSettle();

      expect(profiles.savedLocations, [('shop-a', 10.0261, 76.3125)]);
      expect(find.text(ShopProfileMessages.saved), findsOneWidget);
      // No Maps key in tests: the map falls back to the coordinates.
      expect(find.text('Map not available in this build'), findsOneWidget);
      expect(find.text('Pin: 10.026100, 76.312500'), findsOneWidget);
      expect(
        find.text('Set from a phone or browser location.'),
        findsOneWidget,
      );
    },
  );

  testWidgets('cancelling the confirmation saves nothing', (tester) async {
    location.result = const LocationFound(
      latitude: 10.0261,
      longitude: 76.3125,
      accuracyMeters: 8,
    );
    await openProfile(tester);

    await tapUseCurrentLocation(tester);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(AppButton, 'Cancel'));
    await tester.pumpAndSettle();

    expect(profiles.savedLocations, isEmpty);
    expect(find.text(ShopProfileMessages.noLocation), findsOneWidget);
  });

  testWidgets('a location too rough for a shop pin is refused', (tester) async {
    location.result = const LocationFound(
      latitude: 10.0261,
      longitude: 76.3125,
      accuracyMeters: 1800,
    );
    await openProfile(tester);

    await tapUseCurrentLocation(tester);
    await tester.pumpAndSettle();

    expect(find.text(ShopProfileMessages.inaccurate(1800)), findsOneWidget);
    expect(find.textContaining('about 2 km'), findsOneWidget);
    expect(find.text('Save this as the shop location?'), findsNothing);
    expect(profiles.savedLocations, isEmpty);
  });

  testWidgets('a location outside India is refused before saving', (
    tester,
  ) async {
    location.result = const LocationFound(
      latitude: 51.5,
      longitude: -0.12,
      accuracyMeters: 5,
    );
    await openProfile(tester);

    await tapUseCurrentLocation(tester);
    await tester.pumpAndSettle();

    expect(find.text(ShopProfileMessages.outsideIndia), findsOneWidget);
    expect(find.text('Save this as the shop location?'), findsNothing);
  });

  testWidgets('location turned off offers to open the location settings', (
    tester,
  ) async {
    location.result = const LocationUnavailable(
      LocationProblem.serviceDisabled,
    );
    await openProfile(tester);

    await tapUseCurrentLocation(tester);
    await tester.pumpAndSettle();
    expect(find.text(ShopProfileMessages.serviceDisabled), findsOneWidget);
    final fix = find.widgetWithText(AppButton, 'Turn on location');
    await tester.ensureVisible(fix);
    await tester.pumpAndSettle();
    await tester.tap(fix);
    expect(location.locationSettingsOpened, 1);
  });

  testWidgets('permission denied for good offers to open the app settings', (
    tester,
  ) async {
    location.result = const LocationUnavailable(
      LocationProblem.permissionDeniedForever,
    );
    await openProfile(tester);

    await tapUseCurrentLocation(tester);
    await tester.pumpAndSettle();
    expect(
      find.text(ShopProfileMessages.permissionDeniedForever),
      findsOneWidget,
    );
    final fix = find.widgetWithText(AppButton, 'Open settings');
    await tester.ensureVisible(fix);
    await tester.pumpAndSettle();
    await tester.tap(fix);
    expect(location.appSettingsOpened, 1);
  });

  testWidgets('permission denied once offers to try again', (tester) async {
    location.result = const LocationUnavailable(
      LocationProblem.permissionDenied,
    );
    await openProfile(tester);

    await tapUseCurrentLocation(tester);
    await tester.pumpAndSettle();
    expect(find.text(ShopProfileMessages.permissionDenied), findsOneWidget);
    expect(find.widgetWithText(AppButton, 'Try again'), findsOneWidget);
  });

  testWidgets('a refused or failed save explains why', (tester) async {
    location.result = const LocationFound(
      latitude: 10.0261,
      longitude: 76.3125,
      accuracyMeters: 8,
    );
    profiles.saveError = const ShopProfileForbidden();
    await openProfile(tester);

    await tapUseCurrentLocation(tester);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(AppButton, 'Save location'));
    await tester.pumpAndSettle();
    expect(find.text(ShopProfileMessages.forbidden), findsOneWidget);

    profiles.saveError = const ApiException();
    await tapUseCurrentLocation(tester);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(AppButton, 'Save location'));
    await tester.pumpAndSettle();
    expect(find.text(ShopProfileMessages.saveFailed), findsOneWidget);
  });

  test('ShopProfile.fromJson reads the API shape', () {
    final profile = ShopProfile.fromJson({
      'shopId': 'shop-a',
      'shopName': 'Lakshmi Paints',
      'status': 'DRAFT',
      'supportPhone': '+919876543210',
      'address': {
        'line1': 'Door 12',
        'line2': null,
        'landmark': 'Near the temple',
        'city': 'Kochi',
        'district': 'Ernakulam',
        'stateCode': 'KL',
        'stateName': 'Kerala',
        'postalCode': '682016',
      },
      'location': {
        'latitude': 10,
        'longitude': 76.3125,
        'source': 'DEVICE_GPS',
        'updatedAt': '2026-11-04T10:00:00.000Z',
      },
      'photo': {
        'url': 'https://media.test.invalid/p-1600.webp',
        'thumbUrl': 'https://media.test.invalid/p-480.webp',
        'updatedAt': '2026-11-04T10:00:00.000Z',
      },
      'updatedAt': '2026-11-04T10:00:00.000Z',
    });

    expect(profile.photo?.thumbUrl, 'https://media.test.invalid/p-480.webp');
    expect(profile.address?.lines, [
      'Door 12',
      'Landmark: Near the temple',
      'Kochi, Ernakulam',
      'Kerala 682016',
    ]);
    expect(profile.location?.latitude, 10.0);
    expect(profile.location?.source, ShopLocationSource.deviceGps);
  });

  test('isInIndia uses the API bounding box', () {
    expect(isInIndia(9.97, 76.29), isTrue);
    expect(isInIndia(51.5, -0.12), isFalse);
  });
}
