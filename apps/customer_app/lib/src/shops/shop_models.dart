/// A Live shop as any signed-in person sees it (CUS-002 API, `PublicShop`).
class PublicShop {
  const PublicShop({
    required this.id,
    required this.name,
    required this.thumbUrl,
    required this.photoUrl,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.delivery,
    required this.distanceKm,
    required this.inMyShops,
  });

  factory PublicShop.fromJson(Map<String, Object?> json) {
    final photo = json['photo'] as Map<String, Object?>?;
    final location = json['location'] as Map<String, Object?>?;
    return PublicShop(
      id: json['id']! as String,
      name: json['name']! as String,
      thumbUrl: photo?['thumbUrl'] as String?,
      photoUrl: photo?['url'] as String?,
      address: ShopAddress.fromJson(json['address']! as Map<String, Object?>),
      latitude: (location?['latitude'] as num?)?.toDouble(),
      longitude: (location?['longitude'] as num?)?.toDouble(),
      delivery: ShopDelivery.fromJson(
        json['delivery']! as Map<String, Object?>,
      ),
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      inMyShops: json['inMyShops'] == true,
    );
  }

  final String id;
  final String name;
  final String? thumbUrl;
  final String? photoUrl;
  final ShopAddress address;
  final double? latitude;
  final double? longitude;
  final ShopDelivery delivery;

  /// From the position sent with the request; null without one.
  final double? distanceKm;
  final bool inMyShops;

  PublicShop copyWith({bool? inMyShops, double? distanceKm}) => PublicShop(
    id: id,
    name: name,
    thumbUrl: thumbUrl,
    photoUrl: photoUrl,
    address: address,
    latitude: latitude,
    longitude: longitude,
    delivery: delivery,
    distanceKm: distanceKm ?? this.distanceKm,
    inMyShops: inMyShops ?? this.inMyShops,
  );
}

class ShopAddress {
  const ShopAddress({
    this.line1,
    this.line2,
    this.landmark,
    this.city,
    this.district,
    this.postalCode,
  });

  factory ShopAddress.fromJson(Map<String, Object?> json) => ShopAddress(
    line1: json['line1'] as String?,
    line2: json['line2'] as String?,
    landmark: json['landmark'] as String?,
    city: json['city'] as String?,
    district: json['district'] as String?,
    postalCode: json['postalCode'] as String?,
  );

  final String? line1;
  final String? line2;
  final String? landmark;
  final String? city;
  final String? district;
  final String? postalCode;

  /// "Edappally, Kochi" style: the area or city and the district.
  String get place => [
    if (line2 != null && line2!.isNotEmpty) line2!,
    if (city != null && city!.isNotEmpty) city!,
    if (district != null && district != city) district!,
  ].join(', ');

  /// Every line of the address, for the shop page.
  List<String> get lines => [
    if (line1 != null && line1!.isNotEmpty) line1!,
    if (line2 != null && line2!.isNotEmpty) line2!,
    if (landmark != null && landmark!.isNotEmpty) 'Near $landmark',
    [
      ?city,
      if (district != null && district != city) district!,
      ?postalCode,
    ].join(', '),
  ].where((line) => line.isNotEmpty).toList();
}

/// Pickup is always offered (D-046); delivery is the shop's choice.
class ShopDelivery {
  const ShopDelivery({
    required this.enabled,
    this.chargePaise,
    this.freeAbovePaise,
    this.radiusKm,
  });

  factory ShopDelivery.fromJson(Map<String, Object?> json) => ShopDelivery(
    enabled: json['enabled'] == true,
    chargePaise: json['chargePaise'] as int?,
    freeAbovePaise: json['freeAbovePaise'] as int?,
    radiusKm: json['radiusKm'] as int?,
  );

  final bool enabled;
  final int? chargePaise;
  final int? freeAbovePaise;
  final int? radiusKm;
}

/// One page of Find shops.
class FindShopsPage {
  const FindShopsPage({
    required this.items,
    required this.total,
    required this.page,
    required this.sort,
  });

  factory FindShopsPage.fromJson(Map<String, Object?> json) => FindShopsPage(
    items: [
      for (final item in json['items']! as List<Object?>)
        PublicShop.fromJson(item! as Map<String, Object?>),
    ],
    total: json['total']! as int,
    page: json['page']! as int,
    sort: json['sort']! as String,
  );

  final List<PublicShop> items;
  final int total;
  final int page;

  /// `distance`, `district` or `name`.
  final String sort;
}

/// A district with Live shops, for the picker when location is off.
class ShopDistrict {
  const ShopDistrict({required this.district, required this.shopCount});

  factory ShopDistrict.fromJson(Map<String, Object?> json) => ShopDistrict(
    district: json['district']! as String,
    shopCount: json['shopCount']! as int,
  );

  final String district;
  final int shopCount;
}

/// Where Find shops sorts from (D-038): the phone's position, a chosen
/// district, or neither (by name).
sealed class ShopsNear {
  const ShopsNear();
}

final class NearPosition extends ShopsNear {
  const NearPosition(this.latitude, this.longitude);

  final double latitude;
  final double longitude;
}

final class NearDistrict extends ShopsNear {
  const NearDistrict(this.district);

  final String district;
}

final class NearNothing extends ShopsNear {
  const NearNothing();
}
