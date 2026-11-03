import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'auth_repository.dart';

/// [AuthRepository] on Supabase Auth. The session is persisted by
/// [SecureSessionStorage] (see `main.dart`).
class SupabaseAuthRepository extends ChangeNotifier implements AuthRepository {
  SupabaseAuthRepository(this._auth) {
    _subscription = _auth.onAuthStateChange.listen((_) => notifyListeners());
  }

  final GoTrueClient _auth;
  late final StreamSubscription<AuthState> _subscription;

  @override
  bool get isSignedIn => _auth.currentSession != null;

  @override
  String? get accessToken => _auth.currentSession?.accessToken;

  @override
  Future<void> requestCode(String phoneE164) async {
    try {
      // Login-only: never create an account from the Shop App.
      await _auth.signInWithOtp(phone: phoneE164, shouldCreateUser: false);
    } on AuthException catch (error) {
      throw AuthFailure(_requestFailure(error));
    } catch (_) {
      throw const AuthFailure(AuthFailureKind.unavailable);
    }
  }

  @override
  Future<void> verifyCode(String phoneE164, String code) async {
    try {
      final response = await _auth.verifyOTP(
        type: OtpType.sms,
        phone: phoneE164,
        token: code,
      );
      if (response.session == null) {
        throw const AuthFailure(AuthFailureKind.invalidCode);
      }
    } on AuthFailure {
      rethrow;
    } on AuthException catch (error) {
      throw AuthFailure(_verifyFailure(error));
    } catch (_) {
      throw const AuthFailure(AuthFailureKind.unavailable);
    }
  }

  @override
  Future<void> signOut() => _auth.signOut(scope: SignOutScope.local);

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    super.dispose();
  }
}

/// Maps a provider error by code and status only (messages are not shown).
@visibleForTesting
AuthFailureKind requestFailureFor({String? code, String? statusCode}) {
  if (code == 'otp_disabled' ||
      code == 'signup_disabled' ||
      code == 'user_not_found') {
    return AuthFailureKind.notRegistered;
  }
  if (code == 'over_sms_send_rate_limit' ||
      code == 'over_request_rate_limit' ||
      statusCode == '429') {
    return AuthFailureKind.rateLimited;
  }
  if (code == 'sms_send_failed') {
    return AuthFailureKind.sendFailed;
  }
  return AuthFailureKind.unavailable;
}

@visibleForTesting
AuthFailureKind verifyFailureFor({String? code, String? statusCode}) {
  if (code == 'otp_expired' || statusCode == '403') {
    return AuthFailureKind.invalidCode;
  }
  if (code == 'over_request_rate_limit' || statusCode == '429') {
    return AuthFailureKind.rateLimited;
  }
  return AuthFailureKind.unavailable;
}

AuthFailureKind _requestFailure(AuthException error) =>
    requestFailureFor(code: error.code, statusCode: error.statusCode);

AuthFailureKind _verifyFailure(AuthException error) =>
    verifyFailureFor(code: error.code, statusCode: error.statusCode);
