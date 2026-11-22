import 'dart:math';

import '../shops/shop_models.dart';

/// Pickup at the shop or delivery (D-046, D-053).
enum Fulfilment {
  pickup('PICKUP'),
  delivery('DELIVERY');

  const Fulfilment(this.apiValue);

  final String apiValue;

  static Fulfilment fromApi(String value) =>
      value == 'DELIVERY' ? Fulfilment.delivery : Fulfilment.pickup;
}

/// Why delivery can't be chosen for this order, in words.
enum DeliveryProblem { shopDoesNotDeliver, chooseAPlace, outOfRange }

/// What checkout shows before the order is placed (CUS-006). The server
/// checks the same rules again; this only lets the person see them first.
class CheckoutQuote {
  const CheckoutQuote({
    required this.itemsPaise,
    required this.deliveryPaise,
    this.deliveryProblem,
    this.distanceKm,
  });

  final int itemsPaise;

  /// 0 for pickup and for free delivery.
  final int deliveryPaise;
  final DeliveryProblem? deliveryProblem;

  /// From the shop's pin to the chosen place, when both are known.
  final double? distanceKm;

  int get totalPaise => itemsPaise + deliveryPaise;
}

/// The same charge and distance rules as the API (`order-rules.ts`, D-046,
/// D-049): a flat charge, free from the free-above amount, only within the
/// shop's radius of its map pin.
CheckoutQuote quoteCheckout({
  required int itemsPaise,
  required Fulfilment fulfilment,
  required ShopDelivery delivery,
  double? shopLatitude,
  double? shopLongitude,
  ({double latitude, double longitude})? destination,
}) {
  if (fulfilment == Fulfilment.pickup) {
    return CheckoutQuote(itemsPaise: itemsPaise, deliveryPaise: 0);
  }
  final radius = delivery.radiusKm;
  if (!delivery.enabled ||
      radius == null ||
      shopLatitude == null ||
      shopLongitude == null) {
    return CheckoutQuote(
      itemsPaise: itemsPaise,
      deliveryPaise: 0,
      deliveryProblem: DeliveryProblem.shopDoesNotDeliver,
    );
  }
  if (destination == null) {
    return CheckoutQuote(
      itemsPaise: itemsPaise,
      deliveryPaise: deliveryChargeFor(delivery, itemsPaise),
      deliveryProblem: DeliveryProblem.chooseAPlace,
    );
  }
  final km = distanceKm(
    shopLatitude,
    shopLongitude,
    destination.latitude,
    destination.longitude,
  );
  return CheckoutQuote(
    itemsPaise: itemsPaise,
    deliveryPaise: deliveryChargeFor(delivery, itemsPaise),
    distanceKm: km,
    deliveryProblem: km > radius ? DeliveryProblem.outOfRange : null,
  );
}

/// The flat charge, or free from the free-above amount.
int deliveryChargeFor(ShopDelivery delivery, int itemsPaise) {
  final freeAbove = delivery.freeAbovePaise;
  if (freeAbove != null && itemsPaise >= freeAbove) return 0;
  return delivery.chargePaise ?? 0;
}

/// Great-circle distance in km, as the API computes it.
double distanceKm(
  double fromLatitude,
  double fromLongitude,
  double toLatitude,
  double toLongitude,
) {
  double rad(double degrees) => degrees * pi / 180;
  final dLat = rad(toLatitude - fromLatitude);
  final dLng = rad(toLongitude - fromLongitude);
  final a =
      pow(sin(dLat / 2), 2) +
      cos(rad(fromLatitude)) * cos(rad(toLatitude)) * pow(sin(dLng / 2), 2);
  return 2 * 6371 * asin(sqrt(a));
}
