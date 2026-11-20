import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../providers.dart';

/// A saved delivery place, such as "Home" (CUS-006, D-049, D-061).
class DeliveryLocation {
  const DeliveryLocation({
    required this.id,
    required this.label,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  factory DeliveryLocation.fromJson(Map<String, Object?> json) {
    final pin = json['pin']! as Map<String, Object?>;
    return DeliveryLocation(
      id: json['id']! as String,
      label: json['label']! as String,
      address: json['address']! as String,
      latitude: (pin['latitude']! as num).toDouble(),
      longitude: (pin['longitude']! as num).toDouble(),
    );
  }

  final String id;
  final String label;

  /// House or business name, street and place.
  final String address;
  final double latitude;
  final double longitude;
}

/// What the place form sends.
class DeliveryLocationDraft {
  const DeliveryLocationDraft({
    required this.label,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  final String label;
  final String address;
  final double latitude;
  final double longitude;

  Map<String, Object?> toJson() => {
    'label': label,
    'address': address,
    'pin': {'latitude': latitude, 'longitude': longitude},
  };
}

/// The person's saved places (`/v1/me/delivery-locations`). Throws
/// [ApiException].
abstract class DeliveryLocationsRepository {
  Future<List<DeliveryLocation>> list();

  Future<DeliveryLocation> create(DeliveryLocationDraft draft);

  Future<void> archive(String locationId);
}

class ApiDeliveryLocationsRepository implements DeliveryLocationsRepository {
  const ApiDeliveryLocationsRepository(this._api);

  static const _path = '/v1/me/delivery-locations';

  final ApiClient _api;

  @override
  Future<List<DeliveryLocation>> list() async {
    final json = await _api.getJson(_path);
    return [
      for (final item in json['items']! as List<Object?>)
        DeliveryLocation.fromJson(item! as Map<String, Object?>),
    ];
  }

  @override
  Future<DeliveryLocation> create(DeliveryLocationDraft draft) async =>
      DeliveryLocation.fromJson(await _api.postJson(_path, draft.toJson()));

  @override
  Future<void> archive(String locationId) =>
      _api.postNoContent('$_path/${Uri.encodeComponent(locationId)}/archive');
}

/// Overridden in `main()` and in tests.
final deliveryLocationsRepositoryProvider =
    Provider<DeliveryLocationsRepository>(
      (ref) => throw UnimplementedError(
        'deliveryLocationsRepositoryProvider is overridden',
      ),
    );

/// The saved places by name; a new place is added in place (D-044).
final deliveryLocationsProvider =
    AsyncNotifierProvider.autoDispose<
      DeliveryLocationsNotifier,
      List<DeliveryLocation>
    >(DeliveryLocationsNotifier.new, retry: noRetry);

class DeliveryLocationsNotifier extends AsyncNotifier<List<DeliveryLocation>> {
  DeliveryLocationsRepository get _repository =>
      ref.read(deliveryLocationsRepositoryProvider);

  @override
  Future<List<DeliveryLocation>> build() => _repository.list();

  /// Throws [ApiException] (field messages for `label`, `address`, `pin`).
  Future<DeliveryLocation> create(DeliveryLocationDraft draft) async {
    final place = await _repository.create(draft);
    final list = [...?state.value, place]
      ..sort((a, b) => a.label.toLowerCase().compareTo(b.label.toLowerCase()));
    state = AsyncData(list);
    return place;
  }

  Future<void> archive(String locationId) async {
    await _repository.archive(locationId);
    state = AsyncData([
      for (final place in state.value ?? const <DeliveryLocation>[])
        if (place.id != locationId) place,
    ]);
  }
}
