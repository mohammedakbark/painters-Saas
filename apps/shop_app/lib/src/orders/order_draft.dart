import 'order_models.dart';

// An order the shop is recording for a customer (ORD-004), before it is
// saved. Same rules and messages as the web portal
// (`apps/admin_web/src/lib/customers/customer-forms.ts`); the API checks
// everything again.

/// Limits of the API (`ORDER_LIMITS` and `RecordOrderRequestSchema`).
const maxOrderLines = 50;
const maxLineQuantity = 999;
const minAddressLength = 5;

/// The shop's delivery settings (SHP-008), for the charge shown before
/// saving. The API fixes the real charge when the order is saved.
class DeliverySettings {
  const DeliverySettings({
    required this.enabled,
    required this.chargePaise,
    required this.freeAbovePaise,
  });

  factory DeliverySettings.fromJson(Map<String, Object?> json) =>
      DeliverySettings(
        enabled: json['enabled']! as bool,
        chargePaise: (json['chargePaise'] as num?)?.toInt(),
        freeAbovePaise: (json['freeAbovePaise'] as num?)?.toInt(),
      );

  final bool enabled;
  final int? chargePaise;
  final int? freeAbovePaise;

  /// The flat charge, or nothing from the free-delivery amount (D-046).
  int chargeFor(int itemsPaise) {
    final freeAbove = freeAbovePaise;
    if (freeAbove != null && itemsPaise >= freeAbove) return 0;
    return chargePaise ?? 0;
  }
}

/// One line of the draft: a pack at today's price.
class DraftLine {
  const DraftLine({
    required this.pack,
    required this.quantity,
    this.shadeCode = '',
  });

  final PackOption pack;

  /// Null while the typed quantity is not a whole number.
  final int? quantity;
  final String shadeCode;

  bool get quantityValid {
    final value = quantity;
    return value != null && value >= 1 && value <= maxLineQuantity;
  }

  int get amountPaise => quantityValid ? pack.pricePaise * quantity! : 0;

  Map<String, Object?> toJson() => {
    'shopProductPackId': pack.packId,
    'quantity': quantity,
    if (shadeCode.trim().isNotEmpty) 'shadeCode': shadeCode.trim(),
  };
}

/// The draft's running items total.
int draftTotal(Iterable<DraftLine> lines) =>
    lines.fold(0, (total, line) => total + line.amountPaise);

/// The problems with a draft, keyed by `customer`, `items` and `address`.
/// [siteAddress] is used when no address is typed.
Map<String, String> checkDraft({
  required String? customerId,
  required List<DraftLine> lines,
  required Fulfilment fulfilment,
  required String address,
  String? siteAddress,
}) {
  final errors = <String, String>{};
  if (customerId == null) errors['customer'] = 'Choose the customer.';
  if (lines.isEmpty) {
    errors['items'] = 'Add at least one item.';
  } else if (lines.length > maxOrderLines) {
    errors['items'] = 'An order has at most $maxOrderLines items.';
  } else if (lines.any((line) => !line.quantityValid)) {
    errors['items'] = 'Each quantity must be from 1 to $maxLineQuantity.';
  }
  final typed = address.trim();
  if (fulfilment == Fulfilment.delivery &&
      (typed.isEmpty ? siteAddress == null : typed.length < minAddressLength)) {
    errors['address'] = 'Enter the delivery address.';
  }
  return errors;
}

/// What the shop sends to record the order.
class RecordOrderRequest {
  const RecordOrderRequest({
    required this.customerId,
    required this.lines,
    required this.fulfilment,
    required this.handedOver,
    this.siteId,
    this.deliveryAddress,
    this.paymentMethod,
  });

  final String customerId;
  final String? siteId;
  final List<DraftLine> lines;
  final Fulfilment fulfilment;

  /// Typed address; null delivers to the site's address.
  final String? deliveryAddress;

  /// Handed over at the counter: saved as completed.
  final bool handedOver;

  /// Owner only, and only with [handedOver] (D-053).
  final PaymentMethod? paymentMethod;

  Map<String, Object?> toJson() => {
    'customerId': customerId,
    'siteId': ?siteId,
    'fulfilment': fulfilment.apiValue,
    if (fulfilment == Fulfilment.delivery) 'deliveryAddress': ?deliveryAddress,
    'items': [for (final line in lines) line.toJson()],
    'handedOver': handedOver,
    if (handedOver) 'paymentMethod': ?paymentMethod?.apiValue,
  };
}
