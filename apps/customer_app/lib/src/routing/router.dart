import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/cart/cart_screen.dart';
import '../features/checkout/checkout_screen.dart';
import '../features/checkout/delivery_place_form_screen.dart';
import '../features/orders/orders_screens.dart';
import '../features/profile/more_screen.dart';
import '../features/shell/customer_shell.dart';
import '../features/shell/tab_screens.dart';
import '../features/shops/find_shops_screen.dart';
import '../features/shops/my_shops_screen.dart';
import '../features/shops/shop_screen.dart';
import '../features/sign_in/sign_in_screen.dart';
import '../features/sites/site_form_screen.dart';
import '../features/sites/site_spend_screen.dart';
import '../features/sites/sites_screen.dart';
import '../features/storefront/product_screen.dart';
import '../features/storefront/shop_products_screen.dart';
import '../features/welcome/welcome_screen.dart';
import '../providers.dart';
import 'paths.dart';

const _signedOutPaths = {welcomePath, signInPath};

/// Signed-out people see only Welcome and sign-in; signed-in people never
/// see them. Returns the location to redirect to, or null to stay.
@visibleForTesting
String? authRedirect({required bool signedIn, required String location}) {
  final signedOutScreen = _signedOutPaths.contains(location);
  if (!signedIn) {
    return signedOutScreen ? null : welcomePath;
  }
  return signedOutScreen ? homePath : null;
}

final _rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authRepositoryProvider);
  final router = GoRouter(
    navigatorKey: _rootKey,
    initialLocation: homePath,
    refreshListenable: auth,
    redirect: (context, state) => authRedirect(
      signedIn: auth.isSignedIn,
      location: state.matchedLocation,
    ),
    routes: [
      GoRoute(
        path: welcomePath,
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: signInPath,
        builder: (context, state) => const SignInScreen(),
      ),
      _tabs,
      // Above the tabs, with a back arrow.
      GoRoute(path: cartPath, builder: (context, state) => const CartScreen()),
      GoRoute(
        path: checkoutPath,
        builder: (context, state) => const CheckoutScreen(),
      ),
      GoRoute(
        path: newDeliveryPlacePath,
        builder: (context, state) => const DeliveryPlaceFormScreen(),
      ),
      GoRoute(
        path: '/order/:orderId',
        builder: (context, state) =>
            OrderScreen(orderId: state.pathParameters['orderId']!),
        routes: [
          GoRoute(
            path: 'placed',
            builder: (context, state) => OrderPlacedScreen(
              orderId: state.pathParameters['orderId']!,
              number: int.tryParse(state.uri.queryParameters['number'] ?? ''),
              siteName: state.uri.queryParameters['site'],
            ),
          ),
        ],
      ),
      GoRoute(
        path: newSitePath,
        builder: (context, state) => const SiteFormScreen(),
      ),
      GoRoute(
        path: archivedSitesPath,
        builder: (context, state) => const ArchivedSitesScreen(),
      ),
      GoRoute(
        path: '/site/:siteId',
        builder: (context, state) =>
            SiteSpendScreen(siteId: state.pathParameters['siteId']!),
        routes: [
          GoRoute(
            path: 'edit',
            builder: (context, state) =>
                SiteFormScreen(siteId: state.pathParameters['siteId']),
          ),
        ],
      ),
      GoRoute(
        path: findShopsPath,
        builder: (context, state) => const FindShopsScreen(),
      ),
      GoRoute(
        path: '/shop/:shopId',
        builder: (context, state) =>
            ShopScreen(shopId: state.pathParameters['shopId']!),
        routes: [
          GoRoute(
            path: 'products',
            builder: (context, state) =>
                ShopProductsScreen(shopId: state.pathParameters['shopId']!),
          ),
          GoRoute(
            path: 'product/:productId',
            builder: (context, state) => ProductScreen(
              shopId: state.pathParameters['shopId']!,
              productId: state.pathParameters['productId']!,
            ),
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});

GoRoute _tab(String path, Widget screen) =>
    GoRoute(path: path, builder: (context, state) => screen);

/// The tabs (CustomerTab, same order). Each keeps its own stack.
final _tabs = StatefulShellRoute.indexedStack(
  builder: (context, state, shell) => CustomerShell(shell: shell),
  branches: [
    StatefulShellBranch(routes: [_tab(homePath, const HomeScreen())]),
    StatefulShellBranch(routes: [_tab(ordersPath, const MyOrdersScreen())]),
    StatefulShellBranch(routes: [_tab(myShopsPath, const MyShopsScreen())]),
    StatefulShellBranch(routes: [_tab(sitesPath, const SitesScreen())]),
    StatefulShellBranch(routes: [_tab(morePath, const MoreScreen())]),
  ],
);
