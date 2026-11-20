import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../providers.dart';

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
}

class ApiSitesRepository implements SitesRepository {
  const ApiSitesRepository(this._api);

  static const _path = '/v1/me/sites';

  final ApiClient _api;

  static String _site(String siteId) =>
      '$_path/${Uri.encodeComponent(siteId)}';

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
      CustomerSite.fromJson(await _api.patchJson(_site(siteId), draft.toJson()));

  @override
  Future<CustomerSite> archive(String siteId) async => CustomerSite.fromJson(
    await _api.postJson('${_site(siteId)}/archive', const {}),
  );

  @override
  Future<CustomerSite> restore(String siteId) async => CustomerSite.fromJson(
    await _api.postJson('${_site(siteId)}/restore', const {}),
  );
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
