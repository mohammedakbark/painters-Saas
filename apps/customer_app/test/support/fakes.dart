import 'package:customer_app/app.dart';
import 'package:customer_app/src/api/api_client.dart';
import 'package:customer_app/src/auth/auth_repository.dart';
import 'package:customer_app/src/cart/cart_models.dart';
import 'package:customer_app/src/cart/cart_providers.dart';
import 'package:customer_app/src/cart/cart_store.dart';
import 'package:customer_app/src/delivery/delivery_locations.dart';
import 'package:customer_app/src/features/shops/shop_screen.dart';
import 'package:customer_app/src/location/location_service.dart';
import 'package:customer_app/src/orders/my_orders.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/providers.dart';
import 'package:customer_app/src/shops/active_shop_store.dart';
import 'package:customer_app/src/shops/shop_models.dart';
import 'package:customer_app/src/shops/shop_providers.dart';
import 'package:customer_app/src/shops/shops_repository.dart';
import 'package:customer_app/src/sites/sites.dart';
import 'package:customer_app/src/storefront/storefront_models.dart';
import 'package:customer_app/src/storefront/storefront_providers.dart';
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

  bool? lastPrecise;

  @override
  Future<LocationResult> currentLocation({bool precise = false}) async {
    lastPrecise = precise;
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

StorefrontProduct testProduct(
  String id,
  String name, {
  String category = 'Interior',
  String? brand = 'Asian Colours',
  List<StorefrontPack>? packs,
  bool supportsShades = false,
}) {
  final list =
      packs ??
      const [
        StorefrontPack(
          id: 'p1',
          label: '1 L',
          pricePaise: 50000,
          available: true,
        ),
      ];
  final buyable = list.where((p) => p.available).toList();
  final prices = (buyable.isEmpty ? list : buyable).map((p) => p.pricePaise);
  return StorefrontProduct(
    id: id,
    name: name,
    brand: brand,
    categoryName: category,
    description: '$name description',
    supportsShades: supportsShades,
    thumbUrl: null,
    imageUrl: null,
    packs: list,
    available: buyable.isNotEmpty,
    fromPricePaise: prices.reduce((a, b) => a < b ? a : b),
  );
}

/// Products per shop id; categories are worked out from the products.
class FakeStorefrontRepository implements StorefrontRepository {
  FakeStorefrontRepository([Map<String, List<StorefrontProduct>>? shops])
    : shops = shops ?? {};

  final Map<String, List<StorefrontProduct>> shops;
  int pageSize = 20;

  /// Shades offered for every product that comes in shades.
  List<ShadeOption> shadeOptions = const [
    ShadeOption(
      code: 'BC-100',
      name: 'Sunflower',
      previewHex: '#F2C230',
      favourite: true,
    ),
    ShadeOption(
      code: 'BC-200',
      name: 'Sky Blue',
      previewHex: '#7FB2E5',
      favourite: false,
    ),
  ];

  /// Cart check: today's prices by pack id, packs not available today, and
  /// packs no longer sold.
  final Map<String, int> todayPrices = {};
  final Set<String> unavailableToday = {};
  final Set<String> noLongerSold = {};
  bool checkFails = false;
  int checks = 0;
  final List<(String, String?, String?)> productCalls = [];

  List<StorefrontProduct> _of(String shopId) => shops[shopId] ?? const [];

  String _categoryId(String name) => 'cat-${name.toLowerCase()}';

  @override
  Future<List<StorefrontCategory>> categories(String shopId) async {
    final counts = <String, int>{};
    for (final product in _of(shopId)) {
      counts.update(product.categoryName, (n) => n + 1, ifAbsent: () => 1);
    }
    return [
      for (final entry in counts.entries)
        StorefrontCategory(
          id: _categoryId(entry.key),
          name: entry.key,
          productCount: entry.value,
        ),
    ];
  }

  @override
  Future<StorefrontPage> products(
    String shopId, {
    String? query,
    String? categoryId,
    int page = 1,
  }) async {
    productCalls.add((shopId, query, categoryId));
    final list = _of(shopId)
        .where(
          (p) =>
              (categoryId == null ||
                  _categoryId(p.categoryName) == categoryId) &&
              (query == null ||
                  query.isEmpty ||
                  '${p.name} ${p.brand}'.toLowerCase().contains(
                    query.toLowerCase(),
                  )),
        )
        .toList();
    return StorefrontPage(
      items: list.skip((page - 1) * pageSize).take(pageSize).toList(),
      total: list.length,
      page: page,
    );
  }

  @override
  Future<ShadeOptions> shades(
    String shopId,
    String productId, {
    String? query,
  }) async => ShadeOptions(
    items: [
      for (final shade in shadeOptions)
        if (query == null ||
            '${shade.code} ${shade.name}'.toLowerCase().contains(
              query.toLowerCase(),
            ))
          shade,
    ],
    more: false,
  );

  @override
  Future<List<CheckedPack>> checkCart(
    String shopId,
    Set<String> packIds,
  ) async {
    checks++;
    if (checkFails) throw const ApiException();
    final packs = {
      for (final product in _of(shopId))
        for (final pack in product.packs) pack.id: pack,
    };
    return [
      for (final id in packIds)
        if (packs[id] case final pack? when !noLongerSold.contains(id))
          CheckedPack(
            packId: id,
            pricePaise: todayPrices[id] ?? pack.pricePaise,
            available: pack.available && !unavailableToday.contains(id),
          ),
    ];
  }

  @override
  Future<StorefrontProduct> product(String shopId, String productId) async {
    for (final product in _of(shopId)) {
      if (product.id == productId) return product;
    }
    throw const ApiException(status: 404, code: 'product_not_found');
  }
}

class FakeCartStore implements CartStore {
  FakeCartStore([this.cart]);

  Cart? cart;

  @override
  Future<Cart?> read() async => cart;

  @override
  Future<void> write(Cart cart) async => this.cart = cart;

  @override
  Future<void> clear() async => cart = null;
}

/// Scrolls [finder] into view, taps it and settles.
Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

/// Pumps the whole app with fakes on a phone-sized screen and settles.
/// Sites kept in memory (CUS-005); [rejectNextSave] makes the next save
/// fail with these field messages, as the API would.
class FakeSitesRepository implements SitesRepository {
  FakeSitesRepository([List<CustomerSite>? sites]) : sites = sites ?? [];

  final List<CustomerSite> sites;
  Map<String, String>? rejectNextSave;
  int _next = 1;

  CustomerSite _store(CustomerSite site) {
    sites
      ..removeWhere((item) => item.id == site.id)
      ..add(site);
    return site;
  }

  CustomerSite _from(String id, SiteDraft draft, {bool archived = false}) =>
      CustomerSite(
        id: id,
        name: draft.name,
        ownerName: draft.ownerName.isEmpty ? null : draft.ownerName,
        address: draft.address,
        latitude: draft.latitude,
        longitude: draft.longitude,
        archived: archived,
      );

  void _maybeReject() {
    final fields = rejectNextSave;
    if (fields == null) return;
    rejectNextSave = null;
    throw ApiException(status: 422, fieldErrors: fields);
  }

  CustomerSite _withArchived(String siteId, bool archived) {
    final site = sites.firstWhere((item) => item.id == siteId);
    return _store(
      CustomerSite(
        id: site.id,
        name: site.name,
        ownerName: site.ownerName,
        address: site.address,
        latitude: site.latitude,
        longitude: site.longitude,
        archived: archived,
      ),
    );
  }

  @override
  Future<List<CustomerSite>> list({bool archived = false}) async =>
      sites.where((site) => site.archived == archived).toList()
        ..sort((a, b) => a.name.compareTo(b.name));

  @override
  Future<CustomerSite> create(SiteDraft draft) async {
    _maybeReject();
    return _store(_from('site-${_next++}', draft));
  }

  @override
  Future<CustomerSite> update(String siteId, SiteDraft draft) async {
    _maybeReject();
    return _store(_from(siteId, draft));
  }

  @override
  Future<CustomerSite> archive(String siteId) async =>
      _withArchived(siteId, true);

  @override
  Future<CustomerSite> restore(String siteId) async =>
      _withArchived(siteId, false);
}

class FakeDeliveryLocationsRepository implements DeliveryLocationsRepository {
  FakeDeliveryLocationsRepository([List<DeliveryLocation>? places])
    : places = places ?? [];

  final List<DeliveryLocation> places;
  int _next = 1;

  @override
  Future<List<DeliveryLocation>> list() async => [...places];

  @override
  Future<DeliveryLocation> create(DeliveryLocationDraft draft) async {
    final place = DeliveryLocation(
      id: 'place-${_next++}',
      label: draft.label,
      address: draft.address,
      latitude: draft.latitude,
      longitude: draft.longitude,
    );
    places.add(place);
    return place;
  }

  @override
  Future<void> archive(String locationId) async =>
      places.removeWhere((place) => place.id == locationId);
}

/// Orders kept in memory (CUS-006). [placed] records every draft;
/// [rejectNextPlace] fails the next one like the API would.
class FakeMyOrdersRepository implements MyOrdersRepository {
  FakeMyOrdersRepository({List<MyOrder>? orders}) : orders = orders ?? [];

  final List<MyOrder> orders;
  final List<PlaceOrderDraft> placed = [];
  ApiException? rejectNextPlace;

  @override
  Future<({String id, int number})> place(PlaceOrderDraft draft) async {
    final rejection = rejectNextPlace;
    if (rejection != null) {
      rejectNextPlace = null;
      throw rejection;
    }
    placed.add(draft);
    return (id: 'order-${placed.length}', number: 1000 + placed.length);
  }

  @override
  Future<({List<MyOrderSummary> items, bool hasMore})> list({
    int page = 1,
  }) async => (
    items: [
      for (final order in orders)
        MyOrderSummary(
          id: order.id,
          number: order.number,
          shopId: order.shopId,
          shopName: order.shopName,
          placedAt: order.placedAt,
          status: order.status,
          fulfilment: order.fulfilment,
          siteLabel: order.siteLabel,
          itemCount: order.items.length,
          totalPaise: order.totalPaise,
          needsAnswer: order.openSubstitutes.isNotEmpty,
        ),
    ],
    hasMore: false,
  );

  @override
  Future<MyOrder> get(String orderId) async {
    final order = orders.where((o) => o.id == orderId).firstOrNull;
    if (order == null) {
      throw const ApiException(status: 404, code: 'order_not_found');
    }
    return order;
  }

  MyOrder _replace(MyOrder updated) {
    orders
      ..removeWhere((o) => o.id == updated.id)
      ..add(updated);
    return updated;
  }

  @override
  Future<MyOrder> cancel(String orderId) async {
    final o = await get(orderId);
    return _replace(
      MyOrder.fromJson({
        ...orderJson(o),
        'status': 'CANCELLED',
        'canCancel': false,
        'cancelled': {
          'by': 'CUSTOMER',
          'reason': null,
          'at': '2026-11-20T10:00:00.000Z',
        },
      }),
    );
  }

  @override
  Future<MyOrder> answerSubstitute(
    String orderId,
    String itemId, {
    required bool accept,
  }) async {
    final o = await get(orderId);
    final offer = o.items.firstWhere((item) => item.id == itemId);
    final json = orderJson(o);
    json['items'] = [
      for (final item in o.items)
        {
          ...itemJson(item),
          if (item.id == itemId)
            'status': accept ? 'OK' : 'SUBSTITUTE_DECLINED',
          if (accept && item.id == offer.substituteForId)
            'status': 'SUBSTITUTED',
        },
    ];
    return _replace(MyOrder.fromJson(json));
  }
}

Map<String, Object?> itemJson(MyOrderItem item) => {
  'id': item.id,
  'productName': item.productName,
  'brandName': item.brandName,
  'packLabel': item.packLabel,
  'shadeCode': item.shadeCode,
  'shadeName': item.shadeName,
  'unitPricePaise': item.unitPricePaise,
  'quantity': item.quantity,
  'returnedQuantity': item.returnedQuantity,
  'status': item.status.apiValue,
  'shopNote': item.shopNote,
  'substituteForId': item.substituteForId,
};

Map<String, Object?> orderJson(MyOrder order) => {
  'id': order.id,
  'number': order.number,
  'shop': {'id': order.shopId, 'name': order.shopName},
  'status': order.status.apiValue,
  'fulfilment': order.fulfilment.apiValue,
  'siteLabel': order.siteLabel,
  'deliveryAddress': order.deliveryAddress,
  'items': [for (final item in order.items) itemJson(item)],
  'totals': {
    'itemsPaise': order.itemsPaise,
    'deliveryPaise': order.deliveryPaise,
    'totalPaise': order.totalPaise,
  },
  'payment': {
    'status': order.paid ? 'PAID' : 'UNPAID',
    'method': order.paymentMethod,
  },
  'cancelled': null,
  'placedAt': order.placedAt.toIso8601String(),
  'canCancel': order.canCancel,
};

Future<void> pumpApp(
  WidgetTester tester, {
  required FakeAuthRepository auth,
  FakeCustomerProfileRepository? profiles,
  FakeShopsRepository? shops,
  FakeLocationService? location,
  FakeActiveShopStore? activeShop,
  FakeStorefrontRepository? storefront,
  FakeCartStore? cart,
  FakeSitesRepository? sites,
  FakeDeliveryLocationsRepository? places,
  FakeMyOrdersRepository? orders,
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
        storefrontRepositoryProvider.overrideWithValue(
          storefront ?? FakeStorefrontRepository(),
        ),
        cartStoreProvider.overrideWithValue(cart ?? FakeCartStore()),
        mapsEnabledProvider.overrideWithValue(false),
        sitesRepositoryProvider.overrideWithValue(
          sites ?? FakeSitesRepository(),
        ),
        deliveryLocationsRepositoryProvider.overrideWithValue(
          places ?? FakeDeliveryLocationsRepository(),
        ),
        myOrdersRepositoryProvider.overrideWithValue(
          orders ?? FakeMyOrdersRepository(),
        ),
      ],
      child: const CustomerApp(),
    ),
  );
  await tester.pumpAndSettle();
}
