import 'package:flutter_shared/flutter_shared.dart';

import '../../customers/customer_models.dart';

/// Wording of the Customers tab and the customer page (SHP-012), the same
/// as the web Customers pages (ORD-004).
abstract final class CustomerMessages {
  static const listFailed = "We couldn't load your customers.";
  static const loadMoreFailed = "We couldn't load more customers.";
  static const noCustomers = 'No customers yet';
  static const noCustomersMessage =
      'Add the customers and painters who order by phone or at the counter. '
      'Customers who order in the app show up here too.';
  static const noMatch = 'No customers match';
  static const noMatchMessage = 'Check the name or mobile number.';
  static const customerFailed = "We couldn't load this customer.";
  static const notFound = 'Customer not found';
  static const notFoundMessage = "This customer isn't in your shop's records.";
  static const ordersFailed = "We couldn't load the orders.";
  static const noOrders = 'No orders yet.';
  static const noSites = 'No sites yet. Add the places this painter works at.';
  static const sitesForAppPainters =
      'This painter uses the app and keeps their own sites there.';
  static const pinFromWeb = 'Map pin set on the web';
  static const added = 'Customer added';
  static const saved = 'Changes saved';
  static const siteAdded = 'Site added';
  static const siteArchived = 'Site archived';
  static const siteRestored = 'Site restored';
}

/// Painter and Customer look different (DESIGN_SYSTEM status colours).
AppTone kindTone(CustomerKind kind) =>
    kind == CustomerKind.painter ? AppTone.info : AppTone.neutral;

String sourceLabel(ShopCustomer customer, {bool short = false}) =>
    customer.hasApp
    ? 'Uses the app'
    : short
    ? 'Recorded by you'
    : 'Recorded by your shop';

String orderCountLabel(int count) => switch (count) {
  0 => 'No orders yet',
  1 => '1 order',
  _ => '$count orders',
};

String siteCountLabel(int count) => count == 1 ? '1 site' : '$count sites';
