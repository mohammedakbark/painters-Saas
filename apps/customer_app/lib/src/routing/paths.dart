/// Signed out: the brand and Get started.
const welcomePath = '/welcome';

/// Signed out: mobile number and code.
const signInPath = '/sign-in';

/// The tabs (CustomerTab, same order as the shell branches).
const homePath = '/home';
const ordersPath = '/orders';
const myShopsPath = '/shops';
const sitesPath = '/sites';

// A painter's sites (CUS-005), above the tabs.
const newSitePath = '/site/new';
const archivedSitesPath = '/site/archived';

/// A site's spend by shop (CUS-007).
String sitePath(String siteId) => '/site/${Uri.encodeComponent(siteId)}';
String editSitePath(String siteId) => '${sitePath(siteId)}/edit';
const morePath = '/more';

/// Above the tabs: Find shops and a shop's page (CUS-002).
const findShopsPath = '/find-shops';
String shopPath(String shopId) => '/shop/${Uri.encodeComponent(shopId)}';

/// Above the tabs: the cart (CUS-004).
const cartPath = '/cart';

// Checkout and orders (CUS-006), above the tabs.
const checkoutPath = '/checkout';
const newDeliveryPlacePath = '/delivery-place/new';
String orderPath(String orderId) => '/order/${Uri.encodeComponent(orderId)}';
String orderPlacedPath(String orderId, int number, {String? siteName}) => Uri(
  path: '${orderPath(orderId)}/placed',
  queryParameters: {'number': '$number', 'site': ?siteName},
).toString();

/// Above the tabs: a shop's products and one product (CUS-003).
String shopProductsPath(String shopId) => '${shopPath(shopId)}/products';
String productPath(String shopId, String productId) =>
    '${shopPath(shopId)}/product/${Uri.encodeComponent(productId)}';
