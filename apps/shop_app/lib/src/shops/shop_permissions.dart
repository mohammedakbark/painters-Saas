/// What a shop member may do (D-056). Mirrors `SHOP_PERMISSIONS` in
/// apps/api/src/shop-access/shop-permissions.ts. The owner has all of them;
/// employees will have the ones the owner ticks. The API checks every call
/// again: hiding a button here is a convenience, never the security.
enum ShopPermission {
  /// See orders, move steps, not available, substitute, cancel.
  ordersHandle('orders.handle'),

  /// Record payments and returns.
  ordersPayments('orders.payments'),

  /// Record phone and counter orders.
  ordersRecord('orders.record'),

  /// See, add and edit the shop's customers and their sites.
  customersManage('customers.manage'),

  /// See products, prices and shades.
  catalogueView('catalogue.view'),

  /// Change products, prices, availability, shades and categories.
  catalogueManage('catalogue.manage'),

  /// Edit the profile, photo and map location.
  shopProfile('shop.profile'),

  /// Delivery settings and order messages.
  shopSettings('shop.settings'),

  /// Money figures: today's sales and unpaid totals.
  reportsView('reports.view'),

  /// Add employees and set their permissions.
  staffManage('staff.manage');

  const ShopPermission(this.apiValue);

  final String apiValue;

  /// The known permissions in [keys]; keys this app doesn't know are ignored.
  static Set<ShopPermission> parse(Object? keys) => {
    if (keys is List)
      for (final key in keys)
        for (final permission in ShopPermission.values)
          if (permission.apiValue == key) permission,
  };
}
