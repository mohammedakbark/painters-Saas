import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/auth/auth_repository.dart';
import 'package:shop_app/src/features/sign_in/sign_in_controller.dart';
import 'package:shop_app/src/shops/shop_models.dart';

import 'support/fakes.dart';

void main() {
  testWidgets('signed-out users see the sign-in screen with the shared theme', (
    tester,
  ) async {
    await tester.pumpWidget(
      testApp(auth: FakeAuthRepository(), shops: FakeShopAccessRepository()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(find.byKey(const Key('phone-field')), findsOneWidget);
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.theme?.colorScheme.primary, AppColors.brandPrimary);
  });

  group('sign-in', () {
    testWidgets('rejects an invalid number without calling Supabase', (
      tester,
    ) async {
      final auth = FakeAuthRepository();
      await tester.pumpWidget(
        testApp(auth: auth, shops: FakeShopAccessRepository()),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('phone-field')), '12345');
      await tester.tap(find.widgetWithText(FilledButton, 'Send code'));
      await tester.pumpAndSettle();

      expect(find.text(SignInMessages.invalidPhone), findsOneWidget);
      expect(auth.requestedFor, isEmpty);
    });

    testWidgets('explains that unregistered numbers must register on the web', (
      tester,
    ) async {
      final auth = FakeAuthRepository()
        ..requestFailure = const AuthFailure(AuthFailureKind.notRegistered);
      await tester.pumpWidget(
        testApp(auth: auth, shops: FakeShopAccessRepository()),
      );
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const Key('phone-field')),
        '99999 00009',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Send code'));
      await tester.pumpAndSettle();

      expect(find.text(SignInMessages.notRegistered), findsOneWidget);
      expect(auth.requestedFor, ['+919999900009']);
    });

    testWidgets('signs in with a code and lands on the shop list', (
      tester,
    ) async {
      final auth = FakeAuthRepository();
      await tester.pumpWidget(
        testApp(
          auth: auth,
          shops: FakeShopAccessRepository(memberships: [lakshmi]),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const Key('phone-field')),
        '99999 00001',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Send code'));
      await tester.pumpAndSettle();
      expect(
        find.text('We sent a 6-digit code to +91 99999 00001.'),
        findsOneWidget,
      );

      await tester.enterText(find.byKey(const Key('code-field')), '000000');
      await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
      await tester.pumpAndSettle();
      expect(find.text(SignInMessages.wrongCode), findsOneWidget);
      expect(
        find.text('Enter the code sent to +91 99999 00001.'),
        findsOneWidget,
      );

      await tester.enterText(find.byKey(const Key('code-field')), '123456');
      await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
      await tester.pumpAndSettle();

      expect(find.text('Your shops'), findsOneWidget);
      expect(find.text('Lakshmi Paints'), findsOneWidget);
      expect(find.text('Owner (master account) · Draft'), findsOneWidget);
    });

    testWidgets('can go back and use a different number', (tester) async {
      await tester.pumpWidget(
        testApp(auth: FakeAuthRepository(), shops: FakeShopAccessRepository()),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('phone-field')),
        '99999 00001',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Send code'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Use a different number'));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('phone-field')), findsOneWidget);
      expect(find.byKey(const Key('code-field')), findsNothing);
    });
  });

  group('shops', () {
    testWidgets(
      'a number without shops sees how to register, and can sign out',
      (tester) async {
        final auth = FakeAuthRepository(signedIn: true);
        await tester.pumpWidget(
          testApp(auth: auth, shops: FakeShopAccessRepository()),
        );
        await tester.pumpAndSettle();

        expect(find.text('No shop is linked to this number'), findsOneWidget);
        expect(find.textContaining('+91 99999 00001'), findsOneWidget);

        await tester.tap(find.widgetWithText(FilledButton, 'Sign out'));
        await tester.pumpAndSettle();

        expect(auth.isSignedIn, isFalse);
        expect(find.byKey(const Key('phone-field')), findsOneWidget);
      },
    );

    testWidgets('shows an error with retry when the API fails', (tester) async {
      final shops = FakeShopAccessRepository(memberships: [lakshmi])
        ..fetchMeError = const ApiException();
      await tester.pumpWidget(
        testApp(auth: FakeAuthRepository(signedIn: true), shops: shops),
      );
      await tester.pumpAndSettle();

      expect(find.text("We couldn't load your shops"), findsOneWidget);

      await tester.tap(find.widgetWithText(OutlinedButton, 'Try again'));
      await tester.pumpAndSettle();

      expect(find.text('Lakshmi Paints'), findsOneWidget);
      expect(shops.fetchMeCalls, 2);
    });

    testWidgets('an expired session asks the user to sign in again', (
      tester,
    ) async {
      final shops = FakeShopAccessRepository()
        ..fetchMeError = const ApiException(status: 401);
      await tester.pumpWidget(
        testApp(auth: FakeAuthRepository(signedIn: true), shops: shops),
      );
      await tester.pumpAndSettle();

      expect(find.text('Your session has expired'), findsOneWidget);
    });

    testWidgets('opens a shop home from the list', (tester) async {
      await tester.pumpWidget(
        testApp(
          auth: FakeAuthRepository(signedIn: true),
          shops: FakeShopAccessRepository(
            memberships: [lakshmi],
            shops: {'shop-a': lakshmiShop},
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Lakshmi Paints'));
      await tester.pumpAndSettle();

      expect(find.text('Lakshmi Paints'), findsWidgets);
      expect(find.text('Draft'), findsOneWidget);
      expect(
        find.textContaining('Not visible to customers or painters yet.'),
        findsOneWidget,
      );
    });

    testWidgets('a shop the user cannot access shows "Shop not found"', (
      tester,
    ) async {
      // The API answers 404 for both unknown shops and other tenants' shops.
      await tester.pumpWidget(
        testApp(
          auth: FakeAuthRepository(signedIn: true),
          shops: FakeShopAccessRepository(
            memberships: [
              const ShopMembership(
                shopId: 'shop-b',
                shopName: 'Not mine',
                shopStatus: 'DRAFT',
                role: 'MASTER',
              ),
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Not mine'));
      await tester.pumpAndSettle();

      expect(find.text('Shop not found'), findsOneWidget);
      await tester.tap(find.widgetWithText(OutlinedButton, 'Go to your shops'));
      await tester.pumpAndSettle();
      expect(find.text('Your shops'), findsOneWidget);
    });
  });
}
