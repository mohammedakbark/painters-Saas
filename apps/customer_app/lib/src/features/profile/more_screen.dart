import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../profile/customer_profile.dart';
import '../../providers.dart';
import '../../shops/shop_providers.dart';
import 'profile_form.dart';

/// More (CUS-001): the person's profile with Edit profile, and Sign out.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(customerProfileProvider).value;
    final textTheme = Theme.of(context).textTheme;
    return AppScaffold(
      title: 'More',
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        children: [
          if (profile != null)
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile.displayName ?? '',
                    style: textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (profile.phone case final phone?) ...[
                    const SizedBox(height: AppSpacing.s4),
                    Text(
                      IndianMobileNumber.format(phone),
                      style: textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                  if (profile.customerType case final type?) ...[
                    const SizedBox(height: AppSpacing.s12),
                    AppBadge(label: type.label, tone: AppTone.info),
                  ],
                  const SizedBox(height: AppSpacing.s16),
                  AppButton(
                    key: const Key('edit-profile'),
                    label: 'Edit profile',
                    icon: Icons.edit_outlined,
                    variant: AppButtonVariant.secondary,
                    onPressed: () => _editProfile(context, profile),
                  ),
                ],
              ),
            ),
          const SizedBox(height: AppSpacing.s24),
          AppButton(
            key: const Key('sign-out'),
            label: 'Sign out',
            icon: Icons.logout,
            variant: AppButtonVariant.tertiary,
            onPressed: () => signOut(ref),
          ),
          const SizedBox(height: AppSpacing.s24),
          Text(
            'Powered by zero.byt',
            textAlign: TextAlign.center,
            style: textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _editProfile(
    BuildContext context,
    CustomerProfile profile,
  ) async {
    final saved = await showAppBottomSheet<CustomerProfile>(
      context: context,
      title: 'Edit profile',
      builder: (sheetContext) => ProfileForm(
        initial: profile,
        saveLabel: 'Save',
        onSaved: (saved) => Navigator.of(sheetContext).pop(saved),
      ),
    );
    if (saved != null && context.mounted) {
      showAppSnackBar(context, 'Profile saved.');
    }
  }
}
