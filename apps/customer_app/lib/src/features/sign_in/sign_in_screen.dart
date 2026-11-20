import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import 'package:go_router/go_router.dart';

import '../../routing/paths.dart';
import 'sign_in_controller.dart';

/// Mobile OTP sign-in and sign-up for painters and customers (CUS-001). A
/// new number gets an account when its code is verified.
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

    return AppPlainScaffold(
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                maxWidth: AppLayout.formMaxWidth,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: AppIconButton(
                      icon: Icons.arrow_back,
                      tooltip: 'Back',
                      onPressed: state.busy
                          ? null
                          : () {
                              if (state.step == SignInStep.code) {
                                _code.clear();
                                _controller.changeNumber();
                              } else {
                                context.go(welcomePath);
                              }
                            },
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s16),
                  const BrandMark(appName: AppBrand.customerAppName),
                  const SizedBox(height: AppSpacing.s24),
                  Semantics(
                    header: true,
                    child: Text(
                      state.step == SignInStep.phone
                          ? 'Sign in or sign up'
                          : 'Enter the code',
                      style: textTheme.headlineMedium,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s8),
                  if (state.step == SignInStep.phone)
                    Text(
                      'Use your mobile number. New here? Your account is '
                      'created when you enter the code.',
                      style: textTheme.bodyLarge?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  const SizedBox(height: AppSpacing.s24),
                  if (state.step == SignInStep.phone)
                    ..._phoneStep(state)
                  else
                    ..._codeStep(state),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _phoneStep(SignInState state) => [
    AppTextField(
      key: const Key('phone-field'),
      label: 'Mobile number',
      isRequired: true,
      controller: _phone,
      enabled: !state.busy,
      keyboardType: TextInputType.phone,
      autofillHints: const [AutofillHints.telephoneNumberNational],
      textInputAction: TextInputAction.done,
      onSubmitted: (_) => _controller.requestCode(_phone.text),
      hint: '98765 43210',
      prefixText: '+91 ',
      helper: 'We will send you a 6-digit code.',
      error: state.error,
    ),
    const SizedBox(height: AppSpacing.s16),
    AppButton(
      label: 'Send code',
      loadingLabel: 'Sending code…',
      loading: state.busy,
      expand: true,
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
    AppTextField(
      key: const Key('code-field'),
      label: '6-digit code',
      isRequired: true,
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
      error: state.error,
    ),
    const SizedBox(height: AppSpacing.s16),
    AppButton(
      label: 'Continue',
      loadingLabel: 'Checking…',
      loading: state.busy,
      expand: true,
      onPressed: () => _controller.verifyCode(_code.text),
    ),
    const SizedBox(height: AppSpacing.s8),
    Wrap(
      alignment: WrapAlignment.center,
      spacing: AppSpacing.s8,
      children: [
        AppButton(
          label: 'Resend code',
          variant: AppButtonVariant.tertiary,
          onPressed: state.busy ? null : _controller.resendCode,
        ),
        AppButton(
          label: 'Use a different number',
          variant: AppButtonVariant.tertiary,
          onPressed: state.busy
              ? null
              : () {
                  _code.clear();
                  _controller.changeNumber();
                },
        ),
      ],
    ),
  ];
}
