import '../api/api_client.dart';
import 'shop_access_repository.dart';

/// The shop's address (from `GET /v1/shops/{id}/profile`).
class ShopAddress {
  const ShopAddress({
    required this.line1,
    required this.line2,
    required this.landmark,
    required this.city,
    required this.district,
    required this.stateName,
    required this.postalCode,
  });

  factory ShopAddress.fromJson(Map<String, Object?> json) => ShopAddress(
    line1: json['line1']! as String,
    line2: json['line2'] as String?,
    landmark: json['landmark'] as String?,
    city: json['city']! as String,
    district: json['district']! as String,
    stateName: json['stateName']! as String,
    postalCode: json['postalCode']! as String,
  );

  final String line1;
  final String? line2;
  final String? landmark;
  final String city;
  final String district;
  final String stateName;
  final String postalCode;

  /// Display lines, for example ["Door 12, MG Road", "Ravipuram", ...].
  List<String> get lines => [
    line1,
    ?line2,
    if (landmark != null) 'Landmark: $landmark',
    '$city, $district',
    '$stateName $postalCode',
  ];
}

/// How the pin was set: on a map, or from a device's location.
enum ShopLocationSource { mapPin, deviceGps }

class ShopLocation {
  const ShopLocation({
    required this.latitude,
    required this.longitude,
    required this.source,
  });

  factory ShopLocation.fromJson(Map<String, Object?> json) => ShopLocation(
    latitude: (json['latitude']! as num).toDouble(),
    longitude: (json['longitude']! as num).toDouble(),
    source: json['source'] == 'DEVICE_GPS'
        ? ShopLocationSource.deviceGps
        : ShopLocationSource.mapPin,
  );

  final double latitude;
  final double longitude;
  final ShopLocationSource source;
}

/// The shop photo: pre-sized WebP images in public storage (SHP-004).
class ShopPhoto {
  const ShopPhoto({required this.url, required this.thumbUrl});

  factory ShopPhoto.fromJson(Map<String, Object?> json) => ShopPhoto(
    url: json['url']! as String,
    thumbUrl: json['thumbUrl']! as String,
  );

  /// At most 1600 px.
  final String url;

  /// At most 480 px, for lists.
  final String thumbUrl;
}

/// Photo, support mobile, address and map location of one shop (SHP-003, SHP-004).
class ShopProfile {
  const ShopProfile({
    required this.shopId,
    required this.shopName,
    required this.supportPhone,
    required this.address,
    required this.location,
    this.photo,
  });

  factory ShopProfile.fromJson(Map<String, Object?> json) {
    final address = json['address'];
    final location = json['location'];
    final photo = json['photo'];
    return ShopProfile(
      shopId: json['shopId']! as String,
      shopName: json['shopName']! as String,
      supportPhone: json['supportPhone'] as String?,
      address: address is Map<String, Object?>
          ? ShopAddress.fromJson(address)
          : null,
      location: location is Map<String, Object?>
          ? ShopLocation.fromJson(location)
          : null,
      photo: photo is Map<String, Object?> ? ShopPhoto.fromJson(photo) : null,
    );
  }

  final String shopId;
  final String shopName;

  /// E.164, for example +919876543210.
  final String? supportPhone;
  final ShopAddress? address;
  final ShopLocation? location;
  final ShopPhoto? photo;
}

/// The caller is a member but not allowed to change the profile.
class ShopProfileForbidden implements Exception {
  const ShopProfileForbidden();
}

/// Reads the profile and sets the location. The API checks membership and
/// role; this never decides access itself.
abstract interface class ShopProfileRepository {
  /// Throws [ShopNotFound] for shops the user cannot access.
  Future<ShopProfile> fetchProfile(String shopId);

  /// Saves the device's current location as the shop location. Throws
  /// [ShopProfileForbidden] for members who may not change it.
  Future<ShopProfile> saveDeviceLocation(
    String shopId, {
    required double latitude,
    required double longitude,
  });
}

class ApiShopProfileRepository implements ShopProfileRepository {
  const ApiShopProfileRepository(this._api);

  final ApiClient _api;

  String _path(String shopId, String rest) =>
      '/v1/shops/${Uri.encodeComponent(shopId)}/$rest';

  @override
  Future<ShopProfile> fetchProfile(String shopId) =>
      _guard(() => _api.getJson(_path(shopId, 'profile')));

  @override
  Future<ShopProfile> saveDeviceLocation(
    String shopId, {
    required double latitude,
    required double longitude,
  }) => _guard(
    () => _api.putJson(_path(shopId, 'location'), {
      'latitude': latitude,
      'longitude': longitude,
      'source': 'DEVICE_GPS',
    }),
  );

  Future<ShopProfile> _guard(
    Future<Map<String, Object?>> Function() call,
  ) async {
    try {
      return ShopProfile.fromJson(await call());
    } on ApiException catch (error) {
      if (error.status == 404) {
        throw const ShopNotFound();
      }
      if (error.status == 403) {
        throw const ShopProfileForbidden();
      }
      rethrow;
    }
  }
}
