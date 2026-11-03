import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth/auth_repository.dart';
import 'shops/shop_access_repository.dart';
import 'shops/shop_models.dart';

/// Overridden in `main()` (and in tests) with the real or a fake implementation.
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => throw UnimplementedError('authRepositoryProvider is overridden'),
);

final shopAccessRepositoryProvider = Provider<ShopAccessRepository>(
  (ref) =>
      throw UnimplementedError('shopAccessRepositoryProvider is overridden'),
);

/// No automatic retries: failures show an error view with a "Try again" action.
Duration? _noRetry(int retryCount, Object error) => null;

/// The signed-in user and their shop memberships (`GET /v1/me`).
final shopUserProvider = FutureProvider.autoDispose<ShopUser>(
  (ref) => ref.watch(shopAccessRepositoryProvider).fetchMe(),
  retry: _noRetry,
);

/// One shop the user is a member of (`GET /v1/shops/{id}`).
final shopProvider = FutureProvider.autoDispose.family<MyShop, String>(
  (ref, shopId) => ref.watch(shopAccessRepositoryProvider).fetchShop(shopId),
  retry: _noRetry,
);
