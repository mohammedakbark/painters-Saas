import '../api/api_client.dart';
import 'shop_access_repository.dart';
import 'shop_profile.dart';

/// Limits of the settings, the same as the API's (SHP-008).
abstract final class ShopSettingsLimits {
  static const maxChargePaise = 1000000;
  static const minRadiusKm = 1;
  static const maxRadiusKm = 50;
  static const maxMessages = 10;
  static const minMessageLength = 2;
  static const maxMessageLength = 160;
}

/// How the shop delivers (D-046, D-049). Values stay when delivery is off.
class DeliveryOptions {
  const DeliveryOptions({
    required this.enabled,
    required this.chargePaise,
    required this.freeAbovePaise,
    required this.radiusKm,
  });

  factory DeliveryOptions.fromJson(Map<String, Object?> json) =>
      DeliveryOptions(
        enabled: json['enabled']! as bool,
        chargePaise: (json['chargePaise'] as num?)?.toInt(),
        freeAbovePaise: (json['freeAbovePaise'] as num?)?.toInt(),
        radiusKm: (json['radiusKm'] as num?)?.toInt(),
      );

  final bool enabled;

  /// Flat per order; 0 is free delivery.
  final int? chargePaise;

  /// Orders from this amount are delivered free.
  final int? freeAbovePaise;
  final int? radiusKm;

  Map<String, Object?> toJson() => {
    'enabled': enabled,
    'chargePaise': chargePaise,
    'freeAbovePaise': freeAbovePaise,
    'radiusKm': radiusKm,
  };
}

/// Pickup, delivery and order messages (`GET /v1/shops/{id}/settings`).
class ShopSettings {
  const ShopSettings({
    required this.delivery,
    required this.hasLocation,
    required this.orderMessages,
  });

  factory ShopSettings.fromJson(Map<String, Object?> json) => ShopSettings(
    delivery: DeliveryOptions.fromJson(
      json['delivery']! as Map<String, Object?>,
    ),
    hasLocation: json['hasLocation']! as bool,
    orderMessages: [
      for (final message in json['orderMessages']! as List<Object?>)
        message! as String,
    ],
  );

  final DeliveryOptions delivery;

  /// Delivery needs the shop's map location.
  final bool hasLocation;

  /// Ready messages for items the shop can't supply (D-045).
  final List<String> orderMessages;
}

/// Reads and changes the shop settings (SHP-008 API). Needs `shop.settings`
/// to change them; the API checks it.
abstract interface class ShopSettingsRepository {
  /// Throws [ShopNotFound].
  Future<ShopSettings> fetch(String shopId);

  /// 409 `delivery_needs_location` when delivery is turned on without a map
  /// location; 400 with field errors for missing or out-of-range values.
  Future<ShopSettings> saveDelivery(String shopId, DeliveryOptions delivery);

  /// Replaces the whole list.
  Future<ShopSettings> saveOrderMessages(String shopId, List<String> messages);
}

class ApiShopSettingsRepository implements ShopSettingsRepository {
  const ApiShopSettingsRepository(this._api);

  final ApiClient _api;

  String _path(String shopId, [String rest = '']) =>
      '/v1/shops/${Uri.encodeComponent(shopId)}/settings$rest';

  @override
  Future<ShopSettings> fetch(String shopId) =>
      _guard(() => _api.getJson(_path(shopId)));

  @override
  Future<ShopSettings> saveDelivery(String shopId, DeliveryOptions delivery) =>
      _guard(() => _api.putJson(_path(shopId, '/delivery'), delivery.toJson()));

  @override
  Future<ShopSettings> saveOrderMessages(
    String shopId,
    List<String> messages,
  ) => _guard(
    () =>
        _api.putJson(_path(shopId, '/order-messages'), {'messages': messages}),
  );

  Future<ShopSettings> _guard(
    Future<Map<String, Object?>> Function() call,
  ) async {
    try {
      return ShopSettings.fromJson(await call());
    } on ApiException catch (error) {
      if (error.status == 404) throw const ShopNotFound();
      if (error.status == 403) throw const ShopProfileForbidden();
      rethrow;
    }
  }
}
