import '../api/api_client.dart';
import '../catalogue/product_photo_picker.dart';
import 'shop_access_repository.dart';
import 'shop_review.dart';

/// The shop's address (from `GET /v1/shops/{id}/profile`).
class ShopAddress {
  const ShopAddress({
    required this.line1,
    required this.line2,
    required this.landmark,
    required this.city,
    required this.district,
    required this.stateCode,
    required this.stateName,
    required this.postalCode,
  });

  factory ShopAddress.fromJson(Map<String, Object?> json) => ShopAddress(
    line1: json['line1']! as String,
    line2: json['line2'] as String?,
    landmark: json['landmark'] as String?,
    city: json['city']! as String,
    district: json['district']! as String,
    stateCode: json['stateCode']! as String,
    stateName: json['stateName']! as String,
    postalCode: json['postalCode']! as String,
  );

  /// The API's address input; the API derives the state name from the code.
  Map<String, Object?> toJson() => {
    'line1': line1,
    'line2': line2,
    'landmark': landmark,
    'city': city,
    'district': district,
    'stateCode': stateCode,
    'postalCode': postalCode,
  };

  final String line1;
  final String? line2;
  final String? landmark;
  final String city;
  final String district;

  /// Two letters, for example KL.
  final String stateCode;
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

/// The shop is waiting for review, so its profile, photo and location are
/// locked (D-033).
class ShopInReview implements Exception {
  const ShopInReview();
}

/// Reads and changes the profile, photo and location, and submits the shop
/// for review (SHP-003, SHP-013). The API checks membership and permission;
/// this never decides access itself.
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

  /// Replaces the support mobile and the address; the location is kept.
  /// Throws [ShopInReview] while the shop waits for review, and
  /// [ApiException] with field errors for invalid values.
  Future<ShopProfile> saveDetails(
    String shopId, {
    required String? supportPhone,
    required ShopAddress? address,
  });

  /// Replaces the shop photo. Throws like [saveDetails].
  Future<ShopProfile> replacePhoto(String shopId, PickedPhoto photo);

  /// The review status (PLT-002). Throws [ShopNotFound] like [fetchProfile].
  Future<ShopReviewState> fetchReview(String shopId);

  /// Sends the shop for review; the checklist must be complete (409
  /// `onboarding_incomplete` otherwise).
  Future<ShopReviewState> submitForReview(String shopId);

  /// Takes the submission back so the shop can be edited again.
  Future<ShopReviewState> withdrawReview(String shopId);
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

  @override
  Future<ShopProfile> saveDetails(
    String shopId, {
    required String? supportPhone,
    required ShopAddress? address,
  }) => _guard(
    () => _api.putJson(_path(shopId, 'profile'), {
      'supportPhone': supportPhone,
      'address': address?.toJson(),
    }),
  );

  @override
  Future<ShopProfile> replacePhoto(String shopId, PickedPhoto photo) => _guard(
    () => _api.putMultipart(
      _path(shopId, 'photo'),
      field: 'photo',
      bytes: photo.bytes,
      filename: photo.filename,
      contentType: photo.contentType,
    ),
  );

  @override
  Future<ShopReviewState> fetchReview(String shopId) =>
      _review(() => _api.getJson(_path(shopId, 'review')));

  @override
  Future<ShopReviewState> submitForReview(String shopId) =>
      _review(() => _api.postJson(_path(shopId, 'review-submission'), {}));

  @override
  Future<ShopReviewState> withdrawReview(String shopId) => _review(
    () => _api.postJson(_path(shopId, 'review-submission/withdraw'), {}),
  );

  Future<ShopReviewState> _review(
    Future<Map<String, Object?>> Function() call,
  ) async {
    try {
      return ShopReviewState.fromJson(await call());
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
      if (error.code == 'shop_in_review') {
        throw const ShopInReview();
      }
      rethrow;
    }
  }
}
