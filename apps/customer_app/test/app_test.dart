import 'package:customer_app/src/api/api_client.dart';
import 'package:customer_app/src/features/profile/profile_form.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/routing/router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

Finder _tab(String label) =>
    find.descendant(of: find.byType(AppBottomNav), matching: find.text(label));

void main() {
  group('authRedirect', () {
    test('signed out: only Welcome and sign-in', () {
      expect(authRedirect(signedIn: false, location: '/home'), '/welcome');
      expect(authRedirect(signedIn: false, location: '/welcome'), isNull);
      expect(authRedirect(signedIn: false, location: '/sign-in'), isNull);
    });

    test('signed in: never Welcome or sign-in', () {
      expect(authRedirect(signedIn: true, location: '/sign-in'), '/home');
      expect(authRedirect(signedIn: true, location: '/welcome'), '/home');
      expect(authRedirect(signedIn: true, location: '/more'), isNull);
    });
  });

  testWidgets('uses the Customer App palette (D-057)', (tester) async {
    await pumpApp(tester, auth: FakeAuthRepository());
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.theme?.colorScheme.primary, AppPalette.customerApp.brandPrimary);
    expect(find.byType(LogoMark), findsOneWidget);
  });

  testWidgets(
    'a new number signs up: welcome, code, then name and type, then the tabs',
    (tester) async {
      final auth = FakeAuthRepository();
      final profiles = FakeCustomerProfileRepository();
      await pumpApp(tester, auth: auth, profiles: profiles);

      await tester.tap(find.text('Get started'));
      await tester.pumpAndSettle();
      expect(find.text('Sign in or sign up'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('phone-field')),
        '99999 00001',
      );
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      expect(auth.requestedFor, ['+919999900001']);

      await tester.enterText(find.byKey(const Key('code-field')), '123456');
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();

      // The profile is not complete yet: the setup asks for it.
      expect(find.text('Tell us about you'), findsOneWidget);
      expect(find.byType(AppBottomNav), findsNothing);

      // Nothing chosen: both are asked for, nothing is saved.
      await tapVisible(tester, find.byKey(const Key('save-profile')));
      expect(find.text(ProfileMessages.enterName), findsOneWidget);
      expect(find.text(ProfileMessages.chooseType), findsOneWidget);
      expect(profiles.saves, isEmpty);

      await tester.enterText(
        find.byKey(const Key('name-field')),
        ' Ravi Kumar ',
      );
      await tapVisible(tester, find.byKey(const Key('type-painter')));
      await tapVisible(tester, find.byKey(const Key('save-profile')));

      expect(profiles.saves, [('Ravi Kumar', CustomerType.painter)]);
      expect(find.text('Hello, Ravi'), findsOneWidget);
      for (final label in ['Home', 'Orders', 'My Shops', 'Sites', 'More']) {
        expect(_tab(label), findsOneWidget, reason: label);
      }
      // Saving did not reload the profile (D-044).
      expect(profiles.fetches, 1);
    },
  );

  testWidgets('a normal customer has no Sites tab', (tester) async {
    await pumpApp(
      tester,
      auth: FakeAuthRepository(signedIn: true),
      profiles: FakeCustomerProfileRepository(
        profileOf('Meera', CustomerType.customer),
      ),
    );
    expect(_tab('Sites'), findsNothing);
    expect(_tab('My Shops'), findsOneWidget);
    expect(_tab('More'), findsOneWidget);
  });

  testWidgets('More: change the type in Edit profile; the tabs follow', (
    tester,
  ) async {
    final profiles = FakeCustomerProfileRepository(
      profileOf('Ravi', CustomerType.painter),
    );
    await pumpApp(
      tester,
      auth: FakeAuthRepository(signedIn: true),
      profiles: profiles,
    );
    expect(_tab('Sites'), findsOneWidget);

    await tester.tap(_tab('More'));
    await tester.pumpAndSettle();
    expect(find.text('+91 99999 00001'), findsOneWidget);
    expect(find.text('Painter/Contractor'), findsOneWidget);

    await tapVisible(tester, find.byKey(const Key('edit-profile')));
    await tapVisible(tester, find.byKey(const Key('type-customer')));
    await tapVisible(tester, find.byKey(const Key('save-profile')));

    expect(profiles.saves, [('Ravi', CustomerType.customer)]);
    expect(find.text('Profile saved.'), findsOneWidget);
    expect(find.text('Normal Customer'), findsOneWidget);
    expect(_tab('Sites'), findsNothing);
  });

  testWidgets('a refused save shows the field message', (tester) async {
    final profiles = FakeCustomerProfileRepository()
      ..saveFailure = const ApiException(
        status: 400,
        fieldErrors: {
          'displayName': 'Your name must be at most 100 characters.',
        },
      );
    await pumpApp(
      tester,
      auth: FakeAuthRepository(signedIn: true),
      profiles: profiles,
    );
    await tester.enterText(find.byKey(const Key('name-field')), 'Ravi');
    await tapVisible(tester, find.byKey(const Key('type-customer')));
    await tapVisible(tester, find.byKey(const Key('save-profile')));

    expect(
      find.text('Your name must be at most 100 characters.'),
      findsOneWidget,
    );
    expect(find.text('Tell us about you'), findsOneWidget);
  });

  testWidgets('a profile that fails to load can be tried again', (
    tester,
  ) async {
    final profiles = FakeCustomerProfileRepository(
      profileOf('Ravi', CustomerType.painter),
    )..fetchFailure = const ApiException();
    await pumpApp(
      tester,
      auth: FakeAuthRepository(signedIn: true),
      profiles: profiles,
    );
    expect(find.text("We couldn't load your profile"), findsOneWidget);

    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(find.text('Hello, Ravi'), findsOneWidget);
  });

  testWidgets('Sign out goes back to Welcome', (tester) async {
    final auth = FakeAuthRepository(signedIn: true);
    await pumpApp(
      tester,
      auth: auth,
      profiles: FakeCustomerProfileRepository(
        profileOf('Ravi', CustomerType.customer),
      ),
    );
    await tester.tap(_tab('More'));
    await tester.pumpAndSettle();
    await tapVisible(tester, find.byKey(const Key('sign-out')));

    expect(auth.signedIn, isFalse);
    expect(find.text('Get started'), findsOneWidget);
  });
}
