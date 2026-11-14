import 'package:flutter_shared/flutter_shared.dart';

import '../shops/shop_review.dart';
import 'order_models.dart';

// Words and colours for orders, the same as the web portal
// (`apps/admin_web/src/lib/orders/labels.ts`, ORD-002, D-053).

String orderStatusLabel(OrderStatus status) => switch (status) {
  OrderStatus.newOrder => 'New',
  OrderStatus.packing => 'Packing',
  OrderStatus.readyForPickup => 'Ready for pickup',
  OrderStatus.outForDelivery => 'Out for delivery',
  OrderStatus.completed => 'Completed',
  OrderStatus.cancelled => 'Cancelled',
};

/// Each status has its own colour; the words always name the step.
AppTone orderStatusTone(OrderStatus status) => switch (status) {
  OrderStatus.newOrder => AppTone.info,
  OrderStatus.packing => AppTone.warning,
  OrderStatus.readyForPickup || OrderStatus.outForDelivery => AppTone.success,
  OrderStatus.completed => AppTone.neutral,
  OrderStatus.cancelled => AppTone.error,
};

/// The button that moves an order to this step.
String stepActionLabel(OrderStatus to) => switch (to) {
  OrderStatus.newOrder => 'New',
  OrderStatus.packing => 'Start packing',
  OrderStatus.readyForPickup => 'Ready for pickup',
  OrderStatus.outForDelivery => 'Out for delivery',
  OrderStatus.completed => 'Mark completed',
  OrderStatus.cancelled => 'Cancel order',
};

/// What the snack bar says after the step.
String stepDoneMessage(OrderStatus to) => switch (to) {
  OrderStatus.newOrder => 'Order is new.',
  OrderStatus.packing => 'Packing started.',
  OrderStatus.readyForPickup => 'Ready for pickup.',
  OrderStatus.outForDelivery => 'Out for delivery.',
  OrderStatus.completed => 'Order completed.',
  OrderStatus.cancelled => 'Order cancelled.',
};

/// The next step of an order in the list, from its status and fulfilment.
OrderStatus? nextStepFor(OrderStatus status, Fulfilment fulfilment) =>
    switch (status) {
      OrderStatus.newOrder => OrderStatus.packing,
      OrderStatus.packing =>
        fulfilment == Fulfilment.pickup
            ? OrderStatus.readyForPickup
            : OrderStatus.outForDelivery,
      OrderStatus.readyForPickup ||
      OrderStatus.outForDelivery => OrderStatus.completed,
      OrderStatus.completed || OrderStatus.cancelled => null,
    };

String orderTabLabel(OrderTab tab) => switch (tab) {
  OrderTab.open => 'Open',
  OrderTab.newOrders => 'New',
  OrderTab.packing => 'Packing',
  OrderTab.ready => 'Ready',
  OrderTab.completed => 'Completed',
  OrderTab.cancelled => 'Cancelled',
  OrderTab.all => 'All',
};

/// The badge of a line that doesn't simply count; null for a normal line.
({String label, AppTone tone})? itemStatusBadge(OrderItemStatus status) =>
    switch (status) {
      OrderItemStatus.ok => null,
      OrderItemStatus.notAvailable => (
        label: 'Not available',
        tone: AppTone.warning,
      ),
      OrderItemStatus.substituted => (label: 'Replaced', tone: AppTone.neutral),
      OrderItemStatus.substituteOffered => (
        label: 'Waiting for the customer',
        tone: AppTone.info,
      ),
      OrderItemStatus.substituteDeclined => (
        label: 'Declined by the customer',
        tone: AppTone.neutral,
      ),
    };

String fulfilmentLabel(Fulfilment fulfilment) =>
    fulfilment == Fulfilment.pickup ? 'Pickup' : 'Delivery';

String paymentMethodLabel(PaymentMethod method) => switch (method) {
  PaymentMethod.cash => 'Cash',
  PaymentMethod.upi => 'UPI',
  PaymentMethod.bankTransfer => 'Bank transfer',
};

String orderNumberLabel(int number) => '#$number';

/// "3 items" or "1 item".
String itemCountLabel(int count) => count == 1 ? '1 item' : '$count items';

/// "2 × ₹450".
String quantityTimesPrice(int quantity, int paise) =>
    '$quantity × ${formatRupees(paise)}';

/// "+919876543210" → "+91 98765 43210"; other numbers are shown as sent.
String formatPhone(String e164) {
  final match = RegExp(r'^\+91(\d{5})(\d{5})$').firstMatch(e164);
  return match == null ? e164 : '+91 ${match.group(1)} ${match.group(2)}';
}

const _istOffset = Duration(hours: 5, minutes: 30);

DateTime _ist(DateTime instant) => instant.toUtc().add(_istOffset);

/// "10:42 am" in Indian Standard Time.
String formatIstTime(DateTime instant) {
  final ist = _ist(instant);
  final hour = ist.hour % 12 == 0 ? 12 : ist.hour % 12;
  final minute = ist.minute.toString().padLeft(2, '0');
  return '$hour:$minute ${ist.hour < 12 ? 'am' : 'pm'}';
}

/// "Today, 10:42 am", "Yesterday, 6:05 pm" or "3 Nov 2026, 9:10 am" (IST).
String formatOrderTime(DateTime instant, {DateTime? now}) {
  final ist = _ist(instant);
  final today = _ist(now ?? DateTime.now());
  final days = DateTime.utc(
    today.year,
    today.month,
    today.day,
  ).difference(DateTime.utc(ist.year, ist.month, ist.day)).inDays;
  final time = formatIstTime(instant);
  return switch (days) {
    0 => 'Today, $time',
    1 => 'Yesterday, $time',
    _ => '${formatIstDate(instant)}, $time',
  };
}

/// A timeline entry in plain words.
String eventSentence(OrderEvent event) {
  final by = event.byCustomer ? 'the customer' : 'the shop';
  switch (event.type) {
    case 'placed':
      return 'Order placed by the customer.';
    case 'recorded':
      return event.data['handedOver'] == true
          ? 'Recorded by the shop and handed over.'
          : 'Recorded by the shop.';
    case 'status_changed':
      final to = event.data['to'];
      if (to == 'CANCELLED') return 'Cancelled by $by.';
      for (final status in OrderStatus.values) {
        if (status.apiValue == to) {
          return 'Moved to ${orderStatusLabel(status).toLowerCase()}.';
        }
      }
      return 'Step changed.';
    case 'item_not_available':
      return 'An item was marked not available.';
    case 'substitute_offered':
      return 'A substitute was suggested.';
    case 'substitute_accepted':
      return 'The customer accepted the substitute.';
    case 'substitute_declined':
      return 'The customer declined the substitute.';
    case 'paid':
      final method = PaymentMethod.maybeFromApi(event.data['method']);
      return method == null
          ? 'Payment recorded.'
          : 'Paid by ${paymentMethodLabel(method)}.';
    case 'item_returned':
      final quantity = event.data['quantity'];
      final reason = event.data['reason'];
      final units = quantity == 1 ? '1 unit' : '$quantity units';
      return reason is String
          ? '$units returned. Reason: $reason'
          : '$units returned.';
    default:
      return 'Order updated.';
  }
}
