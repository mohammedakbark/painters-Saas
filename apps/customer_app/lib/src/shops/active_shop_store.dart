import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Which shop the person is shopping from on this phone (one active
/// storefront at a time, FEATURE_CATALOG). Kept on the device only; it is a
/// convenience, not a record, and is cleared on sign-out.
abstract interface class ActiveShopStore {
  Future<String?> read();

  Future<void> write(String shopId);

  Future<void> clear();
}

class SecureActiveShopStore implements ActiveShopStore {
  const SecureActiveShopStore([this._storage = const FlutterSecureStorage()]);

  static const _key = 'customer_app.active_shop';

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read() => _storage.read(key: _key);

  @override
  Future<void> write(String shopId) => _storage.write(key: _key, value: shopId);

  @override
  Future<void> clear() => _storage.delete(key: _key);
}
