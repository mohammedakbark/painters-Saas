import 'package:flutter/foundation.dart';

/// Why a sign-in step failed. The UI maps each kind to a message.
enum AuthFailureKind {
  /// Too many requests, or a new code requested within the cooldown.
  rateLimited,

  /// The SMS could not be sent.
  sendFailed,

  /// The code is wrong or has expired.
  invalidCode,

  /// Network or unexpected provider failure, or sign-up is switched off.
  unavailable,
}

class AuthFailure implements Exception {
  const AuthFailure(this.kind);

  final AuthFailureKind kind;

  @override
  String toString() => 'AuthFailure($kind)';
}

/// Sign-in and sign-up for painters and customers with a mobile OTP: the
/// first verified code for a new number creates the account (CUS-001).
/// Implementations must never log codes or tokens.
abstract class AuthRepository implements Listenable {
  bool get isSignedIn;

  /// The current access token for API calls, or null when signed out.
  String? get accessToken;

  /// Sends a code, creating the account for a new number. Throws
  /// [AuthFailure].
  Future<void> requestCode(String phoneE164);

  /// Verifies the code and starts a session. Throws [AuthFailure].
  Future<void> verifyCode(String phoneE164, String code);

  Future<void> signOut();
}
