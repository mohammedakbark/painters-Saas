import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'src/api/api_client.dart';
import 'src/auth/secure_session_storage.dart';
import 'src/auth/supabase_auth_repository.dart';
import 'src/bills/my_bills.dart';
import 'src/cart/cart_providers.dart';
import 'src/cart/cart_store.dart';
import 'src/config/app_config.dart';
import 'src/delivery/delivery_locations.dart';
import 'src/location/location_service.dart';
import 'src/orders/my_orders.dart';
import 'src/profile/customer_profile.dart';
import 'src/providers.dart';
import 'src/shops/active_shop_store.dart';
import 'src/shops/shop_providers.dart';
import 'src/shops/shops_repository.dart';
import 'src/sites/sites.dart';
import 'src/storefront/storefront_models.dart';
import 'src/storefront/storefront_providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // The Customer App's own identity (D-057), picked before anything is built.
  AppPalette.use(AppPalette.customerApp);

  final AppConfig config;
  try {
    config = AppConfig.fromEnvironment();
  } on AppConfigError catch (error) {
    runApp(ConfigErrorApp(problems: error.problems));
    return;
  }

  // Supabase is used only to sign in; all data comes from the API.
  await Supabase.initialize(
    url: config.supabaseUrl.toString(),
    publishableKey: config.supabasePublishableKey,
    authOptions: const FlutterAuthClientOptions(
      localStorage: SecureSessionStorage(),
    ),
  );
  final auth = SupabaseAuthRepository(Supabase.instance.client.auth);
  final api = ApiClient(
    baseUrl: config.apiBaseUrl,
    accessToken: () => auth.accessToken,
  );

  runApp(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        customerProfileRepositoryProvider.overrideWithValue(
          ApiCustomerProfileRepository(api),
        ),
        shopsRepositoryProvider.overrideWithValue(ApiShopsRepository(api)),
        storefrontRepositoryProvider.overrideWithValue(
          ApiStorefrontRepository(api),
        ),
        locationServiceProvider.overrideWithValue(
          const GeolocatorLocationService(),
        ),
        activeShopStoreProvider.overrideWithValue(
          const SecureActiveShopStore(),
        ),
        cartStoreProvider.overrideWithValue(const SecureCartStore()),
        sitesRepositoryProvider.overrideWithValue(ApiSitesRepository(api)),
        myBillsRepositoryProvider.overrideWithValue(ApiMyBillsRepository(api)),
        deliveryLocationsRepositoryProvider.overrideWithValue(
          ApiDeliveryLocationsRepository(api),
        ),
        myOrdersRepositoryProvider.overrideWithValue(
          ApiMyOrdersRepository(api),
        ),
      ],
      child: const CustomerApp(),
    ),
  );
}
