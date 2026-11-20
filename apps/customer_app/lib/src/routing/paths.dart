/// Signed out: the brand and Get started.
const welcomePath = '/welcome';

/// Signed out: mobile number and code.
const signInPath = '/sign-in';

/// The tabs (CustomerTab, same order as the shell branches).
const homePath = '/home';
const ordersPath = '/orders';
const myShopsPath = '/shops';
const sitesPath = '/sites';
const morePath = '/more';

/// Above the tabs: Find shops and a shop's page (CUS-002).
const findShopsPath = '/find-shops';
String shopPath(String shopId) => '/shop/${Uri.encodeComponent(shopId)}';

/// Above the tabs: the cart (CUS-004).
const cartPath = '/cart';

/// Above the tabs: a shop's products and one product (CUS-003).
String shopProductsPath(String shopId) => '${shopPath(shopId)}/products';
String productPath(String shopId, String productId) =>
    '${shopPath(shopId)}/product/${Uri.encodeComponent(productId)}';
