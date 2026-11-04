import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shop_app/app.dart';
import 'package:shop_app/src/auth/auth_repository.dart';
import 'package:shop_app/src/location/location_service.dart';
import 'package:shop_app/src/providers.dart';
import 'package:shop_app/src/shops/shop_access_repository.dart';
import 'package:shop_app/src/shops/shop_models.dart';
import 'package:shop_app/src/shops/shop_profile.dart';

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

class FakeShopProfileRepository implements ShopProfileRepository {
  FakeShopProfileRepository({Map<String, ShopProfile>? profiles})
    : profiles = profiles ?? {};

  final Map<String, ShopProfile> profiles;
  final List<(String, double, double)> savedLocations = [];

  /// When set, saveDeviceLocation() fails with it.
  Object? saveError;

  @override
  Future<ShopProfile> fetchProfile(String shopId) async {
    final profile = profiles[shopId];
    if (profile == null) {
      throw const ShopNotFound();
    }
    return profile;
  }

  @override
  Future<ShopProfile> saveDeviceLocation(
    String shopId, {
    required double latitude,
    required double longitude,
  }) async {
    final error = saveError;
    if (error != null) {
      throw error;
    }
    savedLocations.add((shopId, latitude, longitude));
    final current = profiles[shopId]!;
    final updated = ShopProfile(
      shopId: current.shopId,
      shopName: current.shopName,
      supportPhone: current.supportPhone,
      address: current.address,
      location: ShopLocation(
        latitude: latitude,
        longitude: longitude,
        source: ShopLocationSource.deviceGps,
      ),
    );
    profiles[shopId] = updated;
    return updated;
  }
}

class FakeLocationService implements LocationService {
  FakeLocationService([
    this.result = const LocationUnavailable(LocationProblem.failed),
  ]);

  LocationResult result;
  int appSettingsOpened = 0;
  int locationSettingsOpened = 0;

  @override
  Future<LocationResult> currentLocation() async => result;

  @override
  Future<void> openAppSettings() async => appSettingsOpened++;

  @override
  Future<void> openLocationSettings() async => locationSettingsOpened++;
}

const lakshmiProfile = ShopProfile(
  shopId: 'shop-a',
  shopName: 'Lakshmi Paints',
  supportPhone: '+919876543210',
  address: ShopAddress(
    line1: 'Door 12, MG Road',
    line2: 'Ravipuram',
    landmark: null,
    city: 'Kochi',
    district: 'Ernakulam',
    stateName: 'Kerala',
    postalCode: '682016',
  ),
  location: null,
);

Widget testApp({
  required FakeAuthRepository auth,
  required ShopAccessRepository shops,
  ShopProfileRepository? profiles,
  LocationService? location,
}) => ProviderScope(
  overrides: [
    authRepositoryProvider.overrideWithValue(auth),
    shopAccessRepositoryProvider.overrideWithValue(shops),
    shopProfileRepositoryProvider.overrideWithValue(
      profiles ?? FakeShopProfileRepository(),
    ),
    locationServiceProvider.overrideWithValue(
      location ?? FakeLocationService(),
    ),
  ],
  child: const ShopApp(),
);
