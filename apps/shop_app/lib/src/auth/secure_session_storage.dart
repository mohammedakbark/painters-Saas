import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Persists the Supabase session in the platform keystore (Android Keystore /
/// iOS Keychain) instead of shared preferences (DATA_AND_SECURITY.md §4).
class SecureSessionStorage extends LocalStorage {
  const SecureSessionStorage([this._storage = const FlutterSecureStorage()]);

  static const String _key = 'shop_app.supabase_session';

  final FlutterSecureStorage _storage;

  @override
  Future<void> initialize() async {}

  @override
  Future<bool> hasAccessToken() => _storage.containsKey(key: _key);

  @override
  Future<String?> accessToken() => _storage.read(key: _key);

  @override
  Future<void> removePersistedSession() => _storage.delete(key: _key);

  @override
  Future<void> persistSession(String persistSessionString) {
    // Fail fast on unexpected input rather than storing garbage.
    jsonDecode(persistSessionString);
    return _storage.write(key: _key, value: persistSessionString);
  }
}
