import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../providers.dart';

/// The person's latest request to a shop to connect its records of their
/// mobile (CON-001, D-063). It never says whether the shop has any.
enum ConnectStatus {
  none('NONE'),
  pending('PENDING'),
  approved('APPROVED'),
  declined('DECLINED');

  const ConnectStatus(this.apiValue);

  final String apiValue;

  static ConnectStatus fromApi(Object? value) => ConnectStatus.values
      .firstWhere((status) => status.apiValue == value, orElse: () => none);
}

/// `/v1/me/shops/{shopId}/connect`. Throws [ApiException].
abstract class ConnectRepository {
  Future<ConnectStatus> status(String shopId);

  Future<ConnectStatus> ask(String shopId);
}

class ApiConnectRepository implements ConnectRepository {
  const ApiConnectRepository(this._api);

  final ApiClient _api;

  static String _path(String shopId) =>
      '/v1/me/shops/${Uri.encodeComponent(shopId)}/connect';

  @override
  Future<ConnectStatus> status(String shopId) async =>
      ConnectStatus.fromApi((await _api.getJson(_path(shopId)))['status']);

  @override
  Future<ConnectStatus> ask(String shopId) async => ConnectStatus.fromApi(
    (await _api.postJson(_path(shopId), const {}))['status'],
  );
}

/// Overridden in `main()` and in tests.
final connectRepositoryProvider = Provider<ConnectRepository>(
  (ref) => throw UnimplementedError('connectRepositoryProvider is overridden'),
);

final connectStatusProvider = FutureProvider.autoDispose
    .family<ConnectStatus, String>(
      (ref, shopId) => ref.watch(connectRepositoryProvider).status(shopId),
      retry: noRetry,
    );
