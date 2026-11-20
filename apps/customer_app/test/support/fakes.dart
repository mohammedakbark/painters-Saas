import 'package:customer_app/app.dart';
import 'package:customer_app/src/api/api_client.dart';
import 'package:customer_app/src/auth/auth_repository.dart';
import 'package:customer_app/src/features/shops/shop_screen.dart';
import 'package:customer_app/src/location/location_service.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/providers.dart';
import 'package:customer_app/src/shops/active_shop_store.dart';
import 'package:customer_app/src/shops/shop_models.dart';
import 'package:customer_app/src/shops/shop_providers.dart';
import 'package:customer_app/src/shops/shops_repository.dart';
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

PublicShop testShop(
  String id,
  String name, {
  String district = 'Ernakulam',
  bool delivers = false,
  double? distanceKm,
  bool inMyShops = false,
}) => PublicShop(
  id: id,
  name: name,
  thumbUrl: null,
  photoUrl: null,
  address: ShopAddress(
    line1: '$name building',
    line2: 'Edappally',
    city: 'Kochi',
    district: district,
    postalCode: '682024',
  ),
  latitude: 9.98,
  longitude: 76.3,
  delivery: delivers
      ? const ShopDelivery(
          enabled: true,
          chargePaise: 5000,
          freeAbovePaise: 500000,
          radiusKm: 8,
        )
      : const ShopDelivery(enabled: false),
  distanceKm: distanceKm,
  inMyShops: inMyShops,
);

class FakeShopsRepository implements ShopsRepository {
  FakeShopsRepository(this.shops, {this.pageSize = 20});

  /// In the order "nearest first" would return them.
  final List<PublicShop> shops;
  final int pageSize;
  final Set<String> mine = {};
  final List<ShopsNear> findCalls = [];
  final List<String> notFound = [];
  List<ShopDistrict> districtList = const [
    ShopDistrict(district: 'Ernakulam', shopCount: 2),
    ShopDistrict(district: 'Thrissur', shopCount: 1),
  ];

  PublicShop _view(PublicShop shop, ShopsNear near) => shop.copyWith(
    inMyShops: mine.contains(shop.id),
    distanceKm: near is NearPosition ? shop.distanceKm : null,
  );

  @override
  Future<FindShopsPage> find({
    required ShopsNear near,
    String? query,
    int page = 1,
  }) async {
    findCalls.add(near);
    var list = [...shops];
    if (near is NearDistrict) {
      list.sort((a, b) {
        final inA = a.address.district == near.district;
        final inB = b.address.district == near.district;
        return inA == inB ? a.name.compareTo(b.name) : (inA ? -1 : 1);
      });
    } else if (near is NearNothing) {
      list.sort((a, b) => a.name.compareTo(b.name));
    }
    if (query != null && query.isNotEmpty) {
      list = list
          .where((s) => s.name.toLowerCase().contains(query.toLowerCase()))
          .toList();
    }
    final start = (page - 1) * pageSize;
    return FindShopsPage(
      items: [
        for (final shop in list.skip(start).take(pageSize)) _view(shop, near),
      ],
      total: list.length,
      page: page,
      sort: switch (near) {
        NearPosition() => 'distance',
        NearDistrict() => 'district',
        NearNothing() => 'name',
      },
    );
  }

  @override
  Future<List<ShopDistrict>> districts() async => districtList;

  PublicShop _byId(String shopId) {
    if (notFound.contains(shopId)) {
      throw const ApiException(status: 404, code: 'shop_not_found');
    }
    return shops.firstWhere((s) => s.id == shopId);
  }

  @override
  Future<PublicShop> get(
    String shopId, {
    ShopsNear near = const NearNothing(),
  }) async => _view(_byId(shopId), near);

  @override
  Future<List<PublicShop>> myShops({
    ShopsNear near = const NearNothing(),
  }) async => [for (final id in mine.toList().reversed) _view(_byId(id), near)];

  @override
  Future<PublicShop> add(String shopId) async {
    final shop = _byId(shopId);
    mine.add(shopId);
    return _view(shop, const NearNothing());
  }

  @override
  Future<void> remove(String shopId) async => mine.remove(shopId);
}

class FakeLocationService implements LocationService {
  FakeLocationService([
    this.result = const LocationFound(latitude: 9.98, longitude: 76.3),
  ]);

  LocationResult result;
  int requests = 0;
  int settingsOpened = 0;

  @override
  Future<LocationResult> currentLocation() async {
    requests++;
    return result;
  }

  @override
  Future<void> openAppSettings() async => settingsOpened++;
}

class FakeActiveShopStore implements ActiveShopStore {
  FakeActiveShopStore([this.value]);

  String? value;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String shopId) async => value = shopId;

  @override
  Future<void> clear() async => value = null;
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
  FakeShopsRepository? shops,
  FakeLocationService? location,
  FakeActiveShopStore? activeShop,
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
        shopsRepositoryProvider.overrideWithValue(
          shops ?? FakeShopsRepository(const []),
        ),
        locationServiceProvider.overrideWithValue(
          location ?? FakeLocationService(),
        ),
        activeShopStoreProvider.overrideWithValue(
          activeShop ?? FakeActiveShopStore(),
        ),
        mapsEnabledProvider.overrideWithValue(false),
      ],
      child: const CustomerApp(),
    ),
  );
  await tester.pumpAndSettle();
}
