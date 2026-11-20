import 'package:customer_app/app.dart';
import 'package:customer_app/src/api/api_client.dart';
import 'package:customer_app/src/auth/auth_repository.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/providers.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeAuthRepository extends ChangeNotifier implements AuthRepository {
  FakeAuthRepository({this.signedIn = false});

  bool signedIn;
  final List<String> requestedFor = [];
  AuthFailure? requestFailure;
  String validCode = '123456';

  @override
  bool get isSignedIn => signedIn;

  @override
  String? get accessToken => signedIn ? 'test-token' : null;

  @override
  Future<void> requestCode(String phoneE164) async {
    requestedFor.add(phoneE164);
    if (requestFailure != null) throw requestFailure!;
  }

  @override
  Future<void> verifyCode(String phoneE164, String code) async {
    if (code != validCode) {
      throw const AuthFailure(AuthFailureKind.invalidCode);
    }
    signedIn = true;
    notifyListeners();
  }

  @override
  Future<void> signOut() async {
    signedIn = false;
    notifyListeners();
  }
}

const newProfile = CustomerProfile(
  displayName: null,
  phone: '+919999900001',
  customerType: null,
  complete: false,
);

CustomerProfile profileOf(String name, CustomerType type) => CustomerProfile(
  displayName: name,
  phone: '+919999900001',
  customerType: type,
  complete: true,
);

class FakeCustomerProfileRepository implements CustomerProfileRepository {
  FakeCustomerProfileRepository([this.profile = newProfile]);

  CustomerProfile profile;
  int fetches = 0;
  final List<(String, CustomerType)> saves = [];

  /// Thrown by the next fetch or save, then cleared.
  ApiException? fetchFailure;
  ApiException? saveFailure;

  @override
  Future<CustomerProfile> fetch() async {
    fetches++;
    final failure = fetchFailure;
    if (failure != null) {
      fetchFailure = null;
      throw failure;
    }
    return profile;
  }

  @override
  Future<CustomerProfile> save({
    required String displayName,
    required CustomerType customerType,
  }) async {
    final failure = saveFailure;
    if (failure != null) {
      saveFailure = null;
      throw failure;
    }
    saves.add((displayName, customerType));
    profile = profileOf(displayName, customerType);
    return profile;
  }
}

/// Scrolls [finder] into view, taps it and settles.
Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

/// Pumps the whole app with fakes on a phone-sized screen and settles.
Future<void> pumpApp(
  WidgetTester tester, {
  required FakeAuthRepository auth,
  FakeCustomerProfileRepository? profiles,
}) async {
  tester.view
    ..physicalSize = const Size(1080, 2340)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        customerProfileRepositoryProvider.overrideWithValue(
          profiles ?? FakeCustomerProfileRepository(),
        ),
      ],
      child: const CustomerApp(),
    ),
  );
  await tester.pumpAndSettle();
}
