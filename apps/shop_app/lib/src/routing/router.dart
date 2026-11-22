import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/bills/bills_screen.dart';
import '../features/catalogue/add_from_catalogue_screen.dart';
import '../features/catalogue/catalogue_listing_screen.dart';
import '../features/catalogue/categories_screen.dart';
import '../features/catalogue/product_list_screen.dart';
import '../features/catalogue/product_screen.dart';
import '../features/catalogue/shades_screen.dart';
import '../features/customers/customer_list_screen.dart';
import '../features/customers/customer_screen.dart';
import '../features/orders/new_order_screen.dart';
import '../features/orders/order_list_screen.dart';
import '../features/orders/order_screen.dart';
import '../features/shell/shop_shell.dart';
import '../features/shops/shop_home_screen.dart';
import '../features/shops/shop_picker_screen.dart';
import '../features/shops/shop_profile_screen.dart';
import '../features/shops/shop_settings_screen.dart';
import '../features/sign_in/sign_in_screen.dart';
import '../orders/order_models.dart';
import '../providers.dart';
import '../shops/shop_permissions.dart';

const signInPath = '/sign-in';

/// A screen of the shop's side menu: `profile`, `settings`, `shades` or
/// `categories`.
String shopMenuPath(String shopId, String screen) =>
    '/shops/$shopId/home/$screen';
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

/// Detail screens open here, above the tabs, with a back arrow (SHP-011).
final _rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');

String _shopId(GoRouterState state) => state.pathParameters['shopId']!;

/// A screen opened above the tabs, shown only with one of [anyOf] (D-056).
GoRoute _detail(
  String path, {
  required String title,
  required List<ShopPermission> anyOf,
  required Widget Function(GoRouterState state) build,
  List<RouteBase> routes = const [],
}) => GoRoute(
  path: path,
  parentNavigatorKey: _rootKey,
  builder: (context, state) => RequirePermission(
    shopId: _shopId(state),
    anyOf: anyOf,
    title: title,
    child: build(state),
  ),
  routes: routes,
);

const _anyOrderWork = [
  ShopPermission.ordersHandle,
  ShopPermission.ordersPayments,
  ShopPermission.ordersRecord,
];

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authRepositoryProvider);
  final router = GoRouter(
    navigatorKey: _rootKey,
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
      ),
      // The shop. '/shops/:shopId' opens the home tab. The tabs sit below it
      // because go_router needs each tab's first route free of parameters.
      GoRoute(
        path: '/shops/:shopId',
        redirect: (context, state) {
          final shop = '/shops/${_shopId(state)}';
          return state.uri.path == shop ? '$shop/home' : null;
        },
        routes: [_shopTabs],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});

/// The shop's tabs (ShopTab, same order). Each keeps its own stack.
final _shopTabs = StatefulShellRoute.indexedStack(
  builder: (context, state, shell) =>
      ShopShell(shopId: _shopId(state), shell: shell),
  branches: [
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: 'home',
          builder: (context, state) => ShopHomeScreen(shopId: _shopId(state)),
          // Screens of the side menu open above the tabs with the home under
          // them, so the back arrow and Android back return to the home.
          routes: [
            _detail(
              'profile',
              title: 'Shop profile',
              anyOf: ShopPermission.values,
              build: (state) => ShopProfileScreen(shopId: _shopId(state)),
            ),
            _detail(
              'settings',
              title: 'Shop settings',
              anyOf: const [ShopPermission.shopSettings],
              build: (state) => ShopSettingsScreen(shopId: _shopId(state)),
            ),
            _detail(
              'bills',
              title: 'Bills',
              anyOf: const [
                ShopPermission.ordersPayments,
                ShopPermission.reportsView,
              ],
              build: (state) => BillsScreen(shopId: _shopId(state)),
            ),
            _detail(
              'shades',
              title: 'Shades',
              anyOf: const [ShopPermission.catalogueView],
              build: (state) => ShadesScreen(shopId: _shopId(state)),
            ),
            _detail(
              'categories',
              title: 'Categories',
              anyOf: const [ShopPermission.catalogueView],
              build: (state) => CategoriesScreen(shopId: _shopId(state)),
            ),
          ],
        ),
      ],
    ),
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: 'orders',
          builder: (context, state) => OrderListScreen(
            shopId: _shopId(state),
            initialTab: OrderTab.fromApi(state.uri.queryParameters['tab']),
            initialPaid: switch (state.uri.queryParameters['paid']) {
              'true' => true,
              'false' => false,
              _ => null,
            },
          ),
          routes: [
            // Before ':orderId', so "new" is never read as an order id.
            _detail(
              'new',
              title: 'New order',
              anyOf: const [ShopPermission.ordersRecord],
              build: (state) => NewOrderScreen(
                shopId: _shopId(state),
                customerId: state.uri.queryParameters['customerId'],
              ),
            ),
            _detail(
              ':orderId',
              title: 'Order',
              anyOf: _anyOrderWork,
              build: (state) => OrderScreen(
                shopId: _shopId(state),
                orderId: state.pathParameters['orderId']!,
              ),
            ),
          ],
        ),
      ],
    ),
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: 'catalogue',
          builder: (context, state) =>
              ProductListScreen(shopId: _shopId(state)),
          routes: [
            _detail(
              'products/:productId',
              title: 'Product',
              anyOf: const [ShopPermission.catalogueView],
              build: (state) => ProductScreen(
                shopId: _shopId(state),
                productId: state.pathParameters['productId']!,
              ),
            ),
            _detail(
              'add',
              title: 'Add from brand catalogue',
              anyOf: const [ShopPermission.catalogueManage],
              build: (state) => AddFromCatalogueScreen(shopId: _shopId(state)),
              routes: [
                _detail(
                  ':catalogueProductId',
                  title: 'Add product',
                  anyOf: const [ShopPermission.catalogueManage],
                  build: (state) => CatalogueListingScreen(
                    shopId: _shopId(state),
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
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: 'customers',
          builder: (context, state) =>
              CustomerListScreen(shopId: _shopId(state)),
          routes: [
            _detail(
              ':customerId',
              title: 'Customer',
              anyOf: const [ShopPermission.customersManage],
              build: (state) => CustomerScreen(
                shopId: _shopId(state),
                customerId: state.pathParameters['customerId']!,
              ),
            ),
          ],
        ),
      ],
    ),
  ],
);
