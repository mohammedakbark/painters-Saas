import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'cart_models.dart';

/// Keeps the cart on this phone (CUS-004). It is cleared on sign-out; the
/// server prices everything again when the order is placed.
abstract interface class CartStore {
  Future<Cart?> read();

  Future<void> write(Cart cart);

  Future<void> clear();
}

class SecureCartStore implements CartStore {
  const SecureCartStore([this._storage = const FlutterSecureStorage()]);

  static const _key = 'customer_app.cart';

  final FlutterSecureStorage _storage;

  @override
  Future<Cart?> read() async {
    final text = await _storage.read(key: _key);
    if (text == null) return null;
    try {
      return Cart.fromJson(jsonDecode(text) as Map<String, Object?>);
    } on Object {
      // An unreadable cart (for example from an older app version) is dropped.
      await clear();
      return null;
    }
  }

  @override
  Future<void> write(Cart cart) =>
      _storage.write(key: _key, value: jsonEncode(cart.toJson()));

  @override
  Future<void> clear() => _storage.delete(key: _key);
}
