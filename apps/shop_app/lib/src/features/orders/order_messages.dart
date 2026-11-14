import '../../api/api_client.dart';
import '../../orders/shop_orders_repository.dart';
import '../../shops/shop_access_repository.dart';

/// User-facing text of the order screens (also used by tests). The wording
/// follows the web portal's Orders pages (ORD-002).
abstract final class OrderMessages {
  static const offline =
      "We couldn't reach the server. Check your connection and try again.";
  static const failed = "That didn't work. Try again in a moment.";
  static const forbidden = 'Only the shop owner can do this.';
  static const listFailed = "We couldn't load your orders";
  static const loadMoreFailed = "We couldn't load more orders.";
  static const orderFailed = "We couldn't load the order";
  static const orderNotFound = 'Order not found';
  static const orderNotFoundMessage =
      "This order isn't one of your shop's orders.";
  static const noOrders = 'No orders yet';
  static const noOrdersMessage =
      'Orders from customers and painters appear here.';
  static const nothingInStep = 'No orders in this step';
  static const nothingInStepMessage = 'Choose another step to see its orders.';
  static const noMatch = 'No orders match';
  static const noMatchMessage = 'Change the search or clear the filters.';
  static String newOrders(int count) =>
      count == 1 ? '1 new order' : '$count new orders';

  static const editItemsHint =
      'Out of stock? Mark the item not available or suggest a substitute.';
  static const recordedByShop = 'This order was recorded by your shop.';
  static const ordersInApp = 'Orders in the app';
  static const noMapPin = 'No map pin for this address.';
  static const ownerRecordsPayment = 'The shop owner records the payment.';
  static const payWhenReady =
      'You can record the payment once the order is ready.';
  static const callFailed = "The phone app couldn't be opened.";
  static const mapFailed = "The map couldn't be opened.";

  static const writeMyOwn = 'Write my own';
  static const chooseMessage = 'Choose a message or write your own.';
  static const messageTooShort = 'The message needs at least 2 characters.';
  static const cancelReasonRequired =
      'Tell the customer why the order is cancelled.';
  static const notAvailableSaved =
      'Item marked not available. The total is updated.';
  static const substituteSaved =
      'Substitute suggested. It counts once the customer accepts.';
  static const paymentSaved = 'Payment recorded.';
  static const returnSaved = 'Return recorded. The order total is updated.';
  static const choosePack = 'Search and choose a pack size.';
  static const searchTooShort = 'Type at least 2 letters to search.';
  static const noPacksFound = 'No available pack size matches.';
  static const quantityInvalid = 'Enter a quantity from 1 to 999.';
  static String returnQuantityInvalid(int max) => max == 1
      ? 'Only 1 unit can be returned.'
      : 'Enter a quantity from 1 to $max.';
  static const reasonRequired = 'Enter a reason.';
  static const choosePayment = 'Choose cash, UPI or bank transfer.';
}

/// The sentence to show for a failed order request.
String orderErrorMessage(Object error) {
  if (error is OrdersForbidden) return OrderMessages.forbidden;
  if (error is OrderNotFound) return OrderMessages.orderNotFoundMessage;
  if (error is ShopNotFound) {
    return "This shop doesn't exist, or your account doesn't have access to "
        'it.';
  }
  if (error is ApiException) {
    if (error.isUnavailable) return OrderMessages.offline;
    final detail = error.detail;
    if (detail != null && const {400, 409}.contains(error.status)) {
      return detail;
    }
  }
  return OrderMessages.failed;
}
