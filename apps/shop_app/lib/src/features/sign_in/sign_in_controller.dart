import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../auth/auth_repository.dart';
import '../../providers.dart';

enum SignInStep { phone, code }

/// State of the two-step mobile OTP sign-in.
class SignInState {
  const SignInState({
    this.step = SignInStep.phone,
    this.phone,
    this.busy = false,
    this.error,
    this.notice,
  });

  final SignInStep step;

  /// E.164 number the code was sent to (code step only).
  final String? phone;
  final bool busy;
  final String? error;
  final String? notice;
}

abstract final class SignInMessages {
  static const invalidPhone = 'Enter a 10-digit Indian mobile number.';
  static const invalidCode = 'Enter the 6-digit code.';
  static const notRegistered =
      "This number isn't registered. Register your shop on the web portal first.";
  static const waitBeforeResend =
      'Wait a minute before requesting another code.';
  static const tooManyAttempts =
      'Too many attempts. Wait a few minutes and try again.';
  static const sendFailed =
      "We couldn't send a code to this number. Check it and try again.";
  static const wrongCode = 'That code is incorrect or has expired.';
  static const unavailable =
      "We couldn't sign you in right now. Try again in a moment.";
}

final RegExp _sixDigits = RegExp(r'^\d{6}$');

class SignInController extends Notifier<SignInState> {
  @override
  SignInState build() => const SignInState();

  AuthRepository get _auth => ref.read(authRepositoryProvider);

  Future<void> requestCode(String input) async {
    final phone = IndianMobileNumber.parse(input);
    if (phone == null) {
      state = const SignInState(error: SignInMessages.invalidPhone);
      return;
    }
    state = const SignInState(busy: true);
    try {
      await _auth.requestCode(phone);
      state = SignInState(
        step: SignInStep.code,
        phone: phone,
        notice:
            'We sent a 6-digit code to ${IndianMobileNumber.format(phone)}.',
      );
    } on AuthFailure catch (failure) {
      state = SignInState(error: _requestMessage(failure.kind));
    }
  }

  Future<void> resendCode() async {
    final phone = state.phone;
    if (phone == null) {
      return;
    }
    state = SignInState(step: SignInStep.code, phone: phone, busy: true);
    try {
      await _auth.requestCode(phone);
      state = SignInState(
        step: SignInStep.code,
        phone: phone,
        notice: 'We sent a new code to ${IndianMobileNumber.format(phone)}.',
      );
    } on AuthFailure catch (failure) {
      state = SignInState(
        step: SignInStep.code,
        phone: phone,
        error: _requestMessage(failure.kind),
      );
    }
  }

  Future<void> verifyCode(String input) async {
    final phone = state.phone;
    if (phone == null) {
      return;
    }
    final code = input.trim();
    if (!_sixDigits.hasMatch(code)) {
      state = SignInState(
        step: SignInStep.code,
        phone: phone,
        error: SignInMessages.invalidCode,
      );
      return;
    }
    state = SignInState(step: SignInStep.code, phone: phone, busy: true);
    try {
      await _auth.verifyCode(phone, code);
      // Signed in: the router leaves the sign-in screen. Reset for next time.
      state = const SignInState();
    } on AuthFailure catch (failure) {
      state = SignInState(
        step: SignInStep.code,
        phone: phone,
        error: _verifyMessage(failure.kind),
      );
    }
  }

  void changeNumber() => state = const SignInState();
}

String _requestMessage(AuthFailureKind kind) => switch (kind) {
  AuthFailureKind.notRegistered => SignInMessages.notRegistered,
  AuthFailureKind.rateLimited => SignInMessages.waitBeforeResend,
  AuthFailureKind.sendFailed => SignInMessages.sendFailed,
  AuthFailureKind.invalidCode ||
  AuthFailureKind.unavailable => SignInMessages.unavailable,
};

String _verifyMessage(AuthFailureKind kind) => switch (kind) {
  AuthFailureKind.invalidCode => SignInMessages.wrongCode,
  AuthFailureKind.rateLimited => SignInMessages.tooManyAttempts,
  AuthFailureKind.notRegistered ||
  AuthFailureKind.sendFailed ||
  AuthFailureKind.unavailable => SignInMessages.unavailable,
};

final signInControllerProvider =
    NotifierProvider<SignInController, SignInState>(SignInController.new);
