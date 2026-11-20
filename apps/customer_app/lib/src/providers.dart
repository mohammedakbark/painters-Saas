import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth/auth_repository.dart';
import 'profile/customer_profile.dart';

/// Overridden in `main()` (and in tests) with the real or a fake implementation.
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => throw UnimplementedError('authRepositoryProvider is overridden'),
);

/// The Customer App profile API (CUS-001).
final customerProfileRepositoryProvider = Provider<CustomerProfileRepository>(
  (ref) => throw UnimplementedError(
    'customerProfileRepositoryProvider is overridden',
  ),
);

/// No automatic retries: failures show an error view with a "Try again" action.
Duration? noRetry(int retryCount, Object error) => null;

/// The signed-in person's profile. Loaded once while signed in; a save
/// replaces it with the saved profile, so nothing reloads (D-044). It is
/// dropped on sign-out because nothing watches it any more.
final customerProfileProvider =
    AsyncNotifierProvider.autoDispose<CustomerProfileNotifier, CustomerProfile>(
      CustomerProfileNotifier.new,
      retry: noRetry,
    );

class CustomerProfileNotifier extends AsyncNotifier<CustomerProfile> {
  @override
  Future<CustomerProfile> build() =>
      ref.read(customerProfileRepositoryProvider).fetch();

  /// Saves and keeps the saved profile. Throws `ApiException`; the caller
  /// shows the field messages and the profile stays as it was.
  Future<CustomerProfile> save({
    required String displayName,
    required CustomerType customerType,
  }) async {
    final saved = await ref
        .read(customerProfileRepositoryProvider)
        .save(displayName: displayName, customerType: customerType);
    state = AsyncData(saved);
    return saved;
  }
}
