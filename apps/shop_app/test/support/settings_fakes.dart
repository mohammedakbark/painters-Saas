import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/shops/shop_access_repository.dart';
import 'package:shop_app/src/shops/shop_settings.dart';

// Shop settings test data and a fake with the API's rules (SHP-008).

const defaultOrderMessages = [
  'Stock not available.',
  'Stock can be arranged by tomorrow morning.',
];

ShopSettings testSettings({
  bool deliveryOn = false,
  bool hasLocation = true,
  List<String> messages = defaultOrderMessages,
}) => ShopSettings(
  delivery: DeliveryOptions(
    enabled: deliveryOn,
    chargePaise: deliveryOn ? 4000 : null,
    freeAbovePaise: deliveryOn ? 250000 : null,
    radiusKm: deliveryOn ? 8 : null,
  ),
  hasLocation: hasLocation,
  orderMessages: messages,
);

class FakeShopSettingsRepository implements ShopSettingsRepository {
  FakeShopSettingsRepository({Map<String, ShopSettings>? settings})
    : settings = settings ?? {};

  final Map<String, ShopSettings> settings;
  final List<DeliveryOptions> savedDelivery = [];
  final List<List<String>> savedMessages = [];

  /// When set, the next call fails with it (once).
  Object? nextError;

  void _fail() {
    final error = nextError;
    if (error != null) {
      nextError = null;
      throw error;
    }
  }

  ShopSettings _of(String shopId) =>
      settings[shopId] ?? (throw const ShopNotFound());

  @override
  Future<ShopSettings> fetch(String shopId) async {
    _fail();
    return _of(shopId);
  }

  @override
  Future<ShopSettings> saveDelivery(
    String shopId,
    DeliveryOptions delivery,
  ) async {
    _fail();
    final current = _of(shopId);
    if (delivery.enabled && !current.hasLocation) {
      throw const ApiException(
        status: 409,
        code: 'delivery_needs_location',
        detail: 'Set the shop location before turning on delivery.',
      );
    }
    savedDelivery.add(delivery);
    return settings[shopId] = ShopSettings(
      delivery: delivery,
      hasLocation: current.hasLocation,
      orderMessages: current.orderMessages,
    );
  }

  @override
  Future<ShopSettings> saveOrderMessages(
    String shopId,
    List<String> messages,
  ) async {
    _fail();
    final current = _of(shopId);
    savedMessages.add(messages);
    return settings[shopId] = ShopSettings(
      delivery: current.delivery,
      hasLocation: current.hasLocation,
      orderMessages: messages,
    );
  }
}
