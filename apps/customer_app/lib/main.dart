import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'src/api/api_client.dart';
import 'src/auth/secure_session_storage.dart';
import 'src/auth/supabase_auth_repository.dart';
import 'src/config/app_config.dart';
import 'src/profile/customer_profile.dart';
import 'src/providers.dart';

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
      ],
      child: const CustomerApp(),
    ),
  );
}
