import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import 'sign_in_controller.dart';

/// Mobile OTP sign-in for shop owners and staff (login-only, D-013).
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _phone = TextEditingController();
  final _code = TextEditingController();

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  SignInController get _controller =>
      ref.read(signInControllerProvider.notifier);

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(signInControllerProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Shop owners and staff',
                    style: textTheme.labelLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s8),
                  Semantics(
                    header: true,
                    child: Text('Sign in', style: textTheme.headlineMedium),
                  ),
                  const SizedBox(height: AppSpacing.s8),
                  Text(
                    'Use the mobile number your shop account is registered with.',
                    style: textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s24),
                  if (state.step == SignInStep.phone)
                    ..._phoneStep(state)
                  else
                    ..._codeStep(state),
                  const SizedBox(height: AppSpacing.s32),
                  Text(
                    'New shop? Register it on the web portal, then sign in here.',
                    textAlign: TextAlign.center,
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _phoneStep(SignInState state) => [
    TextField(
      key: const Key('phone-field'),
      controller: _phone,
      enabled: !state.busy,
      keyboardType: TextInputType.phone,
      autofillHints: const [AutofillHints.telephoneNumberNational],
      textInputAction: TextInputAction.done,
      onSubmitted: (_) => _controller.requestCode(_phone.text),
      decoration: InputDecoration(
        labelText: 'Mobile number',
        hintText: '98765 43210',
        prefixText: '+91 ',
        helperText: 'We will send you a 6-digit code.',
        helperMaxLines: 2,
        errorText: state.error,
        errorMaxLines: 3,
      ),
    ),
    const SizedBox(height: AppSpacing.s16),
    _PrimaryButton(
      label: 'Send code',
      busyLabel: 'Sending code…',
      busy: state.busy,
      onPressed: () => _controller.requestCode(_phone.text),
    ),
  ];

  List<Widget> _codeStep(SignInState state) => [
    // Always say where the code went, also after an error replaced the notice.
    Semantics(
      liveRegion: true,
      child: Text(
        state.notice ??
            'Enter the code sent to '
                '${IndianMobileNumber.format(state.phone ?? '')}.',
        style: Theme.of(context).textTheme.bodyLarge,
      ),
    ),
    const SizedBox(height: AppSpacing.s16),
    TextField(
      key: const Key('code-field'),
      controller: _code,
      enabled: !state.busy,
      keyboardType: TextInputType.number,
      autofillHints: const [AutofillHints.oneTimeCode],
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(6),
      ],
      textInputAction: TextInputAction.done,
      onSubmitted: (_) => _controller.verifyCode(_code.text),
      decoration: InputDecoration(
        labelText: '6-digit code',
        errorText: state.error,
        errorMaxLines: 3,
      ),
    ),
    const SizedBox(height: AppSpacing.s16),
    _PrimaryButton(
      label: 'Sign in',
      busyLabel: 'Checking…',
      busy: state.busy,
      onPressed: () => _controller.verifyCode(_code.text),
    ),
    const SizedBox(height: AppSpacing.s8),
    Wrap(
      alignment: WrapAlignment.center,
      spacing: AppSpacing.s8,
      children: [
        TextButton(
          onPressed: state.busy ? null : _controller.resendCode,
          child: const Text('Resend code'),
        ),
        TextButton(
          onPressed: state.busy
              ? null
              : () {
                  _code.clear();
                  _controller.changeNumber();
                },
          child: const Text('Use a different number'),
        ),
      ],
    ),
  ];
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({
    required this.label,
    required this.busyLabel,
    required this.busy,
    required this.onPressed,
  });

  final String label;
  final String busyLabel;
  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: busy ? null : onPressed,
      child: busy
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox.square(
                  dimension: AppSpacing.s16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: AppSpacing.s8),
                Text(busyLabel),
              ],
            )
          : Text(label),
    );
  }
}
