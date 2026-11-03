import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shop_app/app.dart';
import 'package:shop_app/src/auth/auth_repository.dart';
import 'package:shop_app/src/providers.dart';
import 'package:shop_app/src/shops/shop_access_repository.dart';
import 'package:shop_app/src/shops/shop_models.dart';

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
    if (requestFailure != null) {
      throw requestFailure!;
    }
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

class FakeShopAccessRepository implements ShopAccessRepository {
  FakeShopAccessRepository({
    this.memberships = const [],
    Map<String, MyShop>? shops,
  }) : shops = shops ?? {};

  List<ShopMembership> memberships;
  final Map<String, MyShop> shops;

  /// When set, the next fetchMe() fails with it (once).
  Object? fetchMeError;
  int fetchMeCalls = 0;

  @override
  Future<ShopUser> fetchMe() async {
    fetchMeCalls++;
    final error = fetchMeError;
    if (error != null) {
      fetchMeError = null;
      throw error;
    }
    return ShopUser(phone: '+919999900001', memberships: memberships);
  }

  @override
  Future<MyShop> fetchShop(String shopId) async {
    final shop = shops[shopId];
    if (shop == null) {
      throw const ShopNotFound();
    }
    return shop;
  }
}

const lakshmi = ShopMembership(
  shopId: 'shop-a',
  shopName: 'Lakshmi Paints',
  shopStatus: 'DRAFT',
  role: 'MASTER',
);

const lakshmiShop = MyShop(
  id: 'shop-a',
  name: 'Lakshmi Paints',
  status: 'DRAFT',
  myRole: 'MASTER',
);

Widget testApp({
  required FakeAuthRepository auth,
  required ShopAccessRepository shops,
}) => ProviderScope(
  overrides: [
    authRepositoryProvider.overrideWithValue(auth),
    shopAccessRepositoryProvider.overrideWithValue(shops),
  ],
  child: const ShopApp(),
);
