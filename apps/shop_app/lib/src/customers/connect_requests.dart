import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../providers.dart';
import '../shops/shop_access_repository.dart';
import 'customer_models.dart';

/// An app user whose verified mobile matches one of the shop's own records
/// asked to connect it (CON-001, D-063).
class ConnectRequest {
  const ConnectRequest({
    required this.id,
    required this.requestedAt,
    required this.customerId,
    required this.name,
    required this.phone,
    required this.kind,
    required this.mergesIntoAppRecord,
  });

  factory ConnectRequest.fromJson(Map<String, Object?> json) {
    final customer = json['customer']! as Map<String, Object?>;
    return ConnectRequest(
      id: json['id']! as String,
      requestedAt: DateTime.parse(json['requestedAt']! as String),
      customerId: customer['id']! as String,
      name: customer['name']! as String,
      phone: customer['phone']! as String,
      kind: CustomerKind.fromApi(customer['kind']),
      mergesIntoAppRecord: json['mergesIntoAppRecord'] == true,
    );
  }

  final String id;
  final DateTime requestedAt;
  final String customerId;
  final String name;
  final String phone;
  final CustomerKind kind;

  /// The person already orders here in the app: connecting merges the two.
  final bool mergesIntoAppRecord;
}

/// `/v1/shops/{shopId}/connect-requests` (CON-001). The API checks the
/// customers permission and that the request is this shop's. Throws
/// [ShopNotFound] or [ApiException].
abstract interface class ConnectRequestsRepository {
  Future<List<ConnectRequest>> list(String shopId);

  Future<void> answer(String shopId, String requestId, {required bool approve});
}

class ApiConnectRequestsRepository implements ConnectRequestsRepository {
  const ApiConnectRequestsRepository(this._api);

  final ApiClient _api;

  String _path(String shopId) =>
      '/v1/shops/${Uri.encodeComponent(shopId)}/connect-requests';

  @override
  Future<List<ConnectRequest>> list(String shopId) => _guard(() async {
    final json = await _api.getJson(_path(shopId));
    return [
      for (final item in json['items']! as List<Object?>)
        ConnectRequest.fromJson(item! as Map<String, Object?>),
    ];
  });

  @override
  Future<void> answer(
    String shopId,
    String requestId, {
    required bool approve,
  }) => _guard(() async {
    final path = '${_path(shopId)}/${Uri.encodeComponent(requestId)}';
    if (approve) {
      await _api.postJson('$path/approve', const {});
    } else {
      await _api.post('$path/decline', const {}); // 204
    }
  });

  Future<T> _guard<T>(Future<T> Function() call) async {
    try {
      return await call();
    } on ApiException catch (error) {
      if (error.code == 'shop_not_found') throw const ShopNotFound();
      rethrow;
    }
  }
}

/// Overridden in `main()` and in tests.
final connectRequestsRepositoryProvider = Provider<ConnectRequestsRepository>(
  (ref) => throw UnimplementedError(
    'connectRequestsRepositoryProvider is overridden',
  ),
);

final connectRequestsProvider = FutureProvider.autoDispose
    .family<List<ConnectRequest>, String>(
      (ref, shopId) =>
          ref.watch(connectRequestsRepositoryProvider).list(shopId),
      retry: noRetry,
    );
