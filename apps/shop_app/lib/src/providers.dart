import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import 'auth/auth_repository.dart';
import 'catalogue/product_photo_picker.dart';
import 'catalogue/shop_catalogue_repository.dart';
import 'location/location_service.dart';
import 'orders/shop_orders_repository.dart';
import 'shops/shop_access_repository.dart';
import 'shops/shop_models.dart';
import 'shops/shop_profile.dart';
import 'shops/shop_review.dart';

/// Overridden in `main()` (and in tests) with the real or a fake implementation.
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => throw UnimplementedError('authRepositoryProvider is overridden'),
);

final shopAccessRepositoryProvider = Provider<ShopAccessRepository>(
  (ref) =>
      throw UnimplementedError('shopAccessRepositoryProvider is overridden'),
);

final shopProfileRepositoryProvider = Provider<ShopProfileRepository>(
  (ref) =>
      throw UnimplementedError('shopProfileRepositoryProvider is overridden'),
);

/// The shop's catalogue (CAT-002 API; SHP-005 screens).
final shopCatalogueRepositoryProvider = Provider<ShopCatalogueRepository>(
  (ref) =>
      throw UnimplementedError('shopCatalogueRepositoryProvider is overridden'),
);

/// The shop's orders (ORD-001 API; SHP-007 screens).
final shopOrdersRepositoryProvider = Provider<ShopOrdersRepository>(
  (ref) =>
      throw UnimplementedError('shopOrdersRepositoryProvider is overridden'),
);

/// Opens a `tel:` or map link in the phone's own app. Returns false when
/// nothing on the phone can open it.
typedef LinkOpener = Future<bool> Function(Uri link);

final linkOpenerProvider = Provider<LinkOpener>(
  (ref) =>
      (link) => launchUrl(link, mode: LaunchMode.externalApplication),
);

/// How often the open orders list checks for new orders (ORD-002: 30 s).
final orderRefreshIntervalProvider = Provider<Duration>(
  (ref) => const Duration(seconds: 30),
);

/// The camera and photo picker for product photos.
final productPhotoPickerProvider = Provider<ProductPhotoPicker>(
  (ref) => ImagePickerProductPhotoPicker(),
);

final locationServiceProvider = Provider<LocationService>(
  (ref) => const GeolocatorLocationService(),
);

/// Whether maps are drawn (`MAPS_ENABLED`, true by default; D-041). `main`
/// overrides it from `AppConfig`; tests keep false, so no tiles are fetched.
final mapsEnabledProvider = Provider<bool>((ref) => false);

/// No automatic retries: failures show an error view with a "Try again" action.
Duration? noRetry(int retryCount, Object error) => null;

/// The signed-in user and their shop memberships (`GET /v1/me`).
final shopUserProvider = FutureProvider.autoDispose<ShopUser>(
  (ref) => ref.watch(shopAccessRepositoryProvider).fetchMe(),
  retry: noRetry,
);

/// One shop the user is a member of (`GET /v1/shops/{id}`).
final shopProvider = FutureProvider.autoDispose.family<MyShop, String>(
  (ref, shopId) => ref.watch(shopAccessRepositoryProvider).fetchShop(shopId),
  retry: noRetry,
);

/// The shop's review status (`GET /v1/shops/{id}/review`, PLT-002).
final shopReviewProvider = FutureProvider.autoDispose
    .family<ShopReviewState, String>(
      (ref, shopId) =>
          ref.watch(shopProfileRepositoryProvider).fetchReview(shopId),
      retry: noRetry,
    );

/// The shop's support mobile, address and location (`GET /v1/shops/{id}/profile`).
final shopProfileProvider = FutureProvider.autoDispose
    .family<ShopProfile, String>(
      (ref, shopId) =>
          ref.watch(shopProfileRepositoryProvider).fetchProfile(shopId),
      retry: noRetry,
    );
