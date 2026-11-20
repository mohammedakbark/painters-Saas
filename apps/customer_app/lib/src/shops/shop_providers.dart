import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../location/location_service.dart';
import '../providers.dart';
import 'active_shop_store.dart';
import 'shop_models.dart';
import 'shops_repository.dart';

/// Overridden in `main()` and in tests.
final shopsRepositoryProvider = Provider<ShopsRepository>(
  (ref) => throw UnimplementedError('shopsRepositoryProvider is overridden'),
);

final locationServiceProvider = Provider<LocationService>(
  (ref) => throw UnimplementedError('locationServiceProvider is overridden'),
);

final activeShopStoreProvider = Provider<ActiveShopStore>(
  (ref) => throw UnimplementedError('activeShopStoreProvider is overridden'),
);

/// Where Find shops and My Shops sort from. Starts with nothing; set when the
/// person taps Near me or picks a district (D-038). Kept for the session.
final shopsNearProvider = NotifierProvider<ShopsNearNotifier, ShopsNear>(
  ShopsNearNotifier.new,
);

class ShopsNearNotifier extends Notifier<ShopsNear> {
  @override
  ShopsNear build() => const NearNothing();

  // ignore: use_setters_to_change_properties
  void set(ShopsNear near) => state = near;
}

/// The shop the person shops from on this phone, or null.
final activeShopIdProvider = AsyncNotifierProvider<ActiveShopNotifier, String?>(
  ActiveShopNotifier.new,
  retry: noRetry,
);

class ActiveShopNotifier extends AsyncNotifier<String?> {
  ActiveShopStore get _store => ref.read(activeShopStoreProvider);

  @override
  Future<String?> build() => _store.read();

  Future<void> choose(String shopId) async {
    state = AsyncData(shopId);
    await _store.write(shopId);
  }

  Future<void> clear() async {
    state = const AsyncData(null);
    await _store.clear();
  }
}

/// One Live shop's page. Adding to or removing from My Shops updates it in
/// place (D-044).
final shopProvider = AsyncNotifierProvider.autoDispose
    .family<ShopNotifier, PublicShop, String>(ShopNotifier.new, retry: noRetry);

class ShopNotifier extends AsyncNotifier<PublicShop> {
  ShopNotifier(this.shopId);

  final String shopId;

  @override
  Future<PublicShop> build() => ref
      .read(shopsRepositoryProvider)
      .get(shopId, near: ref.read(shopsNearProvider));

  /// Adds or removes the shop. Throws [ApiException]; the page stays as it was.
  Future<void> setInMyShops(bool add) async {
    final current = state.value;
    if (current == null) return;
    final myShops = ref.read(myShopsProvider.notifier);
    if (add) {
      await myShops.add(current);
    } else {
      await myShops.remove(current.id);
    }
    state = AsyncData(current.copyWith(inMyShops: add));
  }
}

/// The person's My Shops, most recently added first.
final myShopsProvider =
    AsyncNotifierProvider<MyShopsNotifier, List<PublicShop>>(
      MyShopsNotifier.new,
      retry: noRetry,
    );

class MyShopsNotifier extends AsyncNotifier<List<PublicShop>> {
  ShopsRepository get _repository => ref.read(shopsRepositoryProvider);

  @override
  Future<List<PublicShop>> build() =>
      _repository.myShops(near: ref.read(shopsNearProvider));

  /// Throws [ApiException].
  Future<void> add(PublicShop shop) async {
    final saved = await _repository.add(shop.id);
    final list = state.value;
    if (list != null) {
      state = AsyncData([
        saved.copyWith(distanceKm: shop.distanceKm),
        ...list.where((item) => item.id != shop.id),
      ]);
    }
  }

  /// Throws [ApiException].
  Future<void> remove(String shopId) async {
    await _repository.remove(shopId);
    final list = state.value;
    if (list != null) {
      state = AsyncData(list.where((item) => item.id != shopId).toList());
    }
  }
}

/// Clears what belongs to this person on this phone, then signs out.
Future<void> signOut(WidgetRef ref) async {
  await ref.read(activeShopIdProvider.notifier).clear();
  ref.invalidate(myShopsProvider);
  ref.invalidate(shopsNearProvider);
  await ref.read(authRepositoryProvider).signOut();
}
