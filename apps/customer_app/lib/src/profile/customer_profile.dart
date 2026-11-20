import '../api/api_client.dart';

/// How the person uses the Customer App (D-036). Painters also get sites;
/// a shop's painter-only information still needs that shop's confirmation.
enum CustomerType {
  painter('PAINTER', 'Painter/Contractor'),
  customer('CUSTOMER', 'Normal Customer');

  const CustomerType(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static CustomerType? fromApi(Object? value) {
    for (final type in values) {
      if (type.apiValue == value) return type;
    }
    return null;
  }
}

/// The caller's Customer App profile (CUS-001 API).
class CustomerProfile {
  const CustomerProfile({
    required this.displayName,
    required this.phone,
    required this.customerType,
    required this.complete,
  });

  factory CustomerProfile.fromJson(Map<String, Object?> json) =>
      CustomerProfile(
        displayName: json['displayName'] as String?,
        phone: json['phone'] as String?,
        customerType: CustomerType.fromApi(json['customerType']),
        complete: json['complete'] == true,
      );

  final String? displayName;

  /// E.164, for example +919999900001.
  final String? phone;
  final CustomerType? customerType;

  /// The name and the type are set; until then the app asks for them.
  final bool complete;

  bool get isPainter => customerType == CustomerType.painter;
}

abstract class CustomerProfileRepository {
  /// Throws [ApiException].
  Future<CustomerProfile> fetch();

  /// Saves the name and the type. Throws [ApiException] (field messages for
  /// `displayName` and `customerType`).
  Future<CustomerProfile> save({
    required String displayName,
    required CustomerType customerType,
  });
}

class ApiCustomerProfileRepository implements CustomerProfileRepository {
  const ApiCustomerProfileRepository(this._api);

  static const _path = '/v1/me/customer-profile';

  final ApiClient _api;

  @override
  Future<CustomerProfile> fetch() async =>
      CustomerProfile.fromJson(await _api.getJson(_path));

  @override
  Future<CustomerProfile> save({
    required String displayName,
    required CustomerType customerType,
  }) async => CustomerProfile.fromJson(
    await _api.putJson(_path, {
      'displayName': displayName,
      'customerType': customerType.apiValue,
    }),
  );
}
