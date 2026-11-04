import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/catalogue/add_from_catalogue_screen.dart';
import '../features/catalogue/catalogue_listing_screen.dart';
import '../features/catalogue/product_list_screen.dart';
import '../features/catalogue/product_screen.dart';
import '../features/shops/shop_home_screen.dart';
import '../features/shops/shop_picker_screen.dart';
import '../features/shops/shop_profile_screen.dart';
import '../features/sign_in/sign_in_screen.dart';
import '../providers.dart';

const signInPath = '/sign-in';
const shopsPath = '/shops';

/// Signed-out users may only see the sign-in screen; signed-in users never
/// see it. Returns the location to redirect to, or null to stay.
@visibleForTesting
String? authRedirect({required bool signedIn, required String location}) {
  final onSignIn = location == signInPath;
  if (!signedIn) {
    return onSignIn ? null : signInPath;
  }
  return onSignIn ? shopsPath : null;
}

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authRepositoryProvider);
  final router = GoRouter(
    initialLocation: shopsPath,
    refreshListenable: auth,
    redirect: (context, state) => authRedirect(
      signedIn: auth.isSignedIn,
      location: state.matchedLocation,
    ),
    routes: [
      GoRoute(
        path: signInPath,
        builder: (context, state) => const SignInScreen(),
      ),
      GoRoute(
        path: shopsPath,
        builder: (context, state) => const ShopPickerScreen(),
        routes: [
          GoRoute(
            path: ':shopId',
            builder: (context, state) =>
                ShopHomeScreen(shopId: state.pathParameters['shopId']!),
            routes: [
              GoRoute(
                path: 'profile',
                builder: (context, state) =>
                    ShopProfileScreen(shopId: state.pathParameters['shopId']!),
              ),
              GoRoute(
                path: 'catalogue',
                builder: (context, state) =>
                    ProductListScreen(shopId: state.pathParameters['shopId']!),
                routes: [
                  GoRoute(
                    path: 'products/:productId',
                    builder: (context, state) => ProductScreen(
                      shopId: state.pathParameters['shopId']!,
                      productId: state.pathParameters['productId']!,
                    ),
                  ),
                  GoRoute(
                    path: 'add',
                    builder: (context, state) => AddFromCatalogueScreen(
                      shopId: state.pathParameters['shopId']!,
                    ),
                    routes: [
                      GoRoute(
                        path: ':catalogueProductId',
                        builder: (context, state) => CatalogueListingScreen(
                          shopId: state.pathParameters['shopId']!,
                          catalogueProductId:
                              state.pathParameters['catalogueProductId']!,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
