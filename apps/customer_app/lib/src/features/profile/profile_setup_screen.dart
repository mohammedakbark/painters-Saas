import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../profile/customer_profile.dart';
import '../../shops/shop_providers.dart';
import 'profile_form.dart';

/// First-time setup after the first sign-in: the name and the customer type
/// (D-036). Shown until both are saved; then the tabs appear in its place.
class ProfileSetupScreen extends ConsumerWidget {
  const ProfileSetupScreen({super.key, this.initial});

  final CustomerProfile? initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
                    alignment: AlignmentDirectional.centerEnd,
                    child: AppButton(
                      label: 'Sign out',
                      variant: AppButtonVariant.tertiary,
                      onPressed: () => signOut(ref),
                    ),
                  ),
                  const BrandMark(appName: AppBrand.customerAppName),
                  const SizedBox(height: AppSpacing.s24),
                  Semantics(
                    header: true,
                    child: Text(
                      'Tell us about you',
                      style: textTheme.headlineMedium,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s8),
                  Text(
                    'Shops see your name on your orders.',
                    style: textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s24),
                  ProfileForm(
                    initial: initial,
                    saveLabel: 'Continue',
                    // The shell shows the tabs once the profile is complete.
                    onSaved: (_) {},
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
