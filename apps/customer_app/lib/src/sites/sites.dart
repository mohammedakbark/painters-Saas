import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../orders/my_orders.dart';
import '../providers.dart';

/// What a site has cost so far (CUS-007): the painter's orders for it from
/// every shop, cancelled orders left out. Computed by the server.
class SiteSpendTotals {
  const SiteSpendTotals({
    required this.totalPaise,
    required this.shopCount,
    required this.orderCount,
    required this.lastOrderAt,
  });

  factory SiteSpendTotals.fromJson(Map<String, Object?>? json) => json == null
      ? none
      : SiteSpendTotals(
          totalPaise: json['totalPaise']! as int,
          shopCount: json['shopCount']! as int,
          orderCount: json['orderCount']! as int,
          lastOrderAt: switch (json['lastOrderAt']) {
            final String value => DateTime.parse(value),
            _ => null,
          },
        );

  static const none = SiteSpendTotals(
    totalPaise: 0,
    shopCount: 0,
    orderCount: 0,
    lastOrderAt: null,
  );

  final int totalPaise;
  final int shopCount;
  final int orderCount;
  final DateTime? lastOrderAt;
}

/// A painter's own work site (CUS-005, D-049).
class CustomerSite {
  const CustomerSite({
    required this.id,
    required this.name,
    required this.ownerName,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.archived,
    this.spend = SiteSpendTotals.none,
  });

  factory CustomerSite.fromJson(Map<String, Object?> json) {
    final pin = json['pin']! as Map<String, Object?>;
    return CustomerSite(
      id: json['id']! as String,
      name: json['name']! as String,
      ownerName: json['ownerName'] as String?,
      address: json['address']! as String,
      latitude: (pin['latitude']! as num).toDouble(),
      longitude: (pin['longitude']! as num).toDouble(),
      archived: json['archived'] == true,
      spend: SiteSpendTotals.fromJson(json['spend'] as Map<String, Object?>?),
    );
  }

  final String id;
  final String name;
  final String? ownerName;

  /// House or business name, street and place.
  final String address;
  final double latitude;
  final double longitude;
  final bool archived;
  final SiteSpendTotals spend;
}

/// One order on a site's spend page.
class SiteSpendOrder {
  const SiteSpendOrder({
    required this.id,
    required this.number,
    required this.placedAt,
    required this.status,
    required this.totalPaise,
  });

  factory SiteSpendOrder.fromJson(Map<String, Object?> json) => SiteSpendOrder(
    id: json['id']! as String,
    number: json['number']! as int,
    placedAt: DateTime.parse(json['placedAt']! as String),
    status: OrderStatus.fromApi(json['status']! as String),
    totalPaise: json['totalPaise']! as int,
  );

  final String id;
  final int number;
  final DateTime placedAt;
  final OrderStatus status;
  final int totalPaise;
}

/// One shop's part of a site's spend; each shop's orders stay separate.
class SiteShopSpend {
  const SiteShopSpend({
    required this.shopId,
    required this.shopName,
    required this.totalPaise,
    required this.orderCount,
    required this.orders,
  });

  factory SiteShopSpend.fromJson(Map<String, Object?> json) {
    final shop = json['shop']! as Map<String, Object?>;
    return SiteShopSpend(
      shopId: shop['id']! as String,
      shopName: shop['name']! as String,
      totalPaise: json['totalPaise']! as int,
      orderCount: json['orderCount']! as int,
      orders: [
        for (final item in json['orders']! as List<Object?>)
          SiteSpendOrder.fromJson(item! as Map<String, Object?>),
      ],
    );
  }

  final String shopId;
  final String shopName;
  final int totalPaise;
  final int orderCount;
  final List<SiteSpendOrder> orders;
}

/// A site's spend by shop (CUS-007, `GET /v1/me/sites/{id}/spend`).
class SiteSpend {
  const SiteSpend({
    required this.siteId,
    required this.siteName,
    required this.archived,
    required this.totalPaise,
    required this.shops,
    required this.ordersTruncated,
  });

  factory SiteSpend.fromJson(Map<String, Object?> json) {
    final site = json['site']! as Map<String, Object?>;
    return SiteSpend(
      siteId: site['id']! as String,
      siteName: site['name']! as String,
      archived: site['archived'] == true,
      totalPaise: json['totalPaise']! as int,
      shops: [
        for (final item in json['shops']! as List<Object?>)
          SiteShopSpend.fromJson(item! as Map<String, Object?>),
      ],
      ordersTruncated: json['ordersTruncated'] == true,
    );
  }

  final String siteId;
  final String siteName;
  final bool archived;
  final int totalPaise;
  final List<SiteShopSpend> shops;

  /// Only the latest orders are listed; the totals stay exact.
  final bool ordersTruncated;

  int get orderCount => shops.fold(0, (sum, shop) => sum + shop.orderCount);
}

/// What the site form sends.
class SiteDraft {
  const SiteDraft({
    required this.name,
    required this.ownerName,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  final String name;
  final String ownerName;
  final String address;
  final double latitude;
  final double longitude;

  Map<String, Object?> toJson() => {
    'name': name,
    'ownerName': ownerName,
    'address': address,
    'pin': {'latitude': latitude, 'longitude': longitude},
  };
}

/// The painter's sites (CUS-005 API). Every method throws [ApiException].
abstract class SitesRepository {
  Future<List<CustomerSite>> list({bool archived = false});

  Future<CustomerSite> create(SiteDraft draft);

  Future<CustomerSite> update(String siteId, SiteDraft draft);

  Future<CustomerSite> archive(String siteId);

  Future<CustomerSite> restore(String siteId);

  Future<SiteSpend> spend(String siteId);
}

class ApiSitesRepository implements SitesRepository {
  const ApiSitesRepository(this._api);

  static const _path = '/v1/me/sites';

  final ApiClient _api;

  static String _site(String siteId) => '$_path/${Uri.encodeComponent(siteId)}';

  @override
  Future<List<CustomerSite>> list({bool archived = false}) async {
    final json = await _api.getJson(
      _path,
      query: archived ? const {'archived': 'true'} : null,
    );
    return [
      for (final item in json['items']! as List<Object?>)
        CustomerSite.fromJson(item! as Map<String, Object?>),
    ];
  }

  @override
  Future<CustomerSite> create(SiteDraft draft) async =>
      CustomerSite.fromJson(await _api.postJson(_path, draft.toJson()));

  @override
  Future<CustomerSite> update(String siteId, SiteDraft draft) async =>
      CustomerSite.fromJson(
        await _api.patchJson(_site(siteId), draft.toJson()),
      );

  @override
  Future<CustomerSite> archive(String siteId) async => CustomerSite.fromJson(
    await _api.postJson('${_site(siteId)}/archive', const {}),
  );

  @override
  Future<CustomerSite> restore(String siteId) async => CustomerSite.fromJson(
    await _api.postJson('${_site(siteId)}/restore', const {}),
  );

  @override
  Future<SiteSpend> spend(String siteId) async =>
      SiteSpend.fromJson(await _api.getJson('${_site(siteId)}/spend'));
}

/// Overridden in `main()` and in tests.
final sitesRepositoryProvider = Provider<SitesRepository>(
  (ref) => throw UnimplementedError('sitesRepositoryProvider is overridden'),
);

/// The painter's active sites by name. Saves update it in place (D-044).
final sitesProvider =
    AsyncNotifierProvider.autoDispose<SitesNotifier, List<CustomerSite>>(
      SitesNotifier.new,
      retry: noRetry,
    );

class SitesNotifier extends AsyncNotifier<List<CustomerSite>> {
  SitesRepository get _repository => ref.read(sitesRepositoryProvider);

  @override
  Future<List<CustomerSite>> build() => _repository.list();

  void _put(CustomerSite site) {
    final list = state.value;
    if (list == null) return;
    final next = [
      ...list.where((item) => item.id != site.id),
      if (!site.archived) site,
    ]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    state = AsyncData(next);
    // The site page shows the name and archived state too.
    ref.invalidate(siteSpendProvider(site.id));
  }

  /// Throws [ApiException] (field messages for `name`, `address`, `pin`).
  Future<CustomerSite> create(SiteDraft draft) async {
    final site = await _repository.create(draft);
    _put(site);
    return site;
  }

  Future<CustomerSite> save(String siteId, SiteDraft draft) async {
    final site = await _repository.update(siteId, draft);
    _put(site);
    return site;
  }

  Future<CustomerSite> archive(String siteId) async {
    final site = await _repository.archive(siteId);
    _put(site);
    ref.invalidate(archivedSitesProvider);
    return site;
  }

  Future<CustomerSite> restore(String siteId) async {
    final site = await _repository.restore(siteId);
    _put(site);
    ref.invalidate(archivedSitesProvider);
    return site;
  }
}

/// The painter's archived sites, newest first.
final archivedSitesProvider = FutureProvider.autoDispose<List<CustomerSite>>(
  (ref) => ref.watch(sitesRepositoryProvider).list(archived: true),
  retry: noRetry,
);

/// One site's spend by shop (CUS-007).
final siteSpendProvider = FutureProvider.autoDispose.family<SiteSpend, String>(
  (ref, siteId) => ref.watch(sitesRepositoryProvider).spend(siteId),
  retry: noRetry,
);

/// The site to show on a painter's Home (CUS-007): the active site ordered
/// for most recently, or null before the first site order.
CustomerSite? latestSpendSite(List<CustomerSite> sites) {
  CustomerSite? latest;
  for (final site in sites) {
    final at = site.spend.lastOrderAt;
    if (site.archived || at == null) continue;
    if (latest == null || at.isAfter(latest.spend.lastOrderAt!)) latest = site;
  }
  return latest;
}
