import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../api/api_client.dart';
import '../../profile/customer_profile.dart';
import '../../providers.dart';

abstract final class ProfileMessages {
  static const nameLabel = 'Your name';
  static const typeLabel = 'How will you use SevenPalette?';
  static const chooseType = 'Choose Painter/Contractor or Normal Customer.';
  static const enterName = 'Enter your name.';
  static const painterDescription =
      'Order paint for the sites you work on and keep each site separate.';
  static const customerDescription =
      'Buy paint and supplies for your own home or project.';
  static const confirmationNote =
      'You can change this at any time. Each shop confirms its painters '
      'itself before it shows painter prices or offers.';
  static const saveFailed =
      "We couldn't save your profile right now. Try again in a moment.";
}

/// Name and customer type (D-036). Used for the first-time setup and in
/// the Edit profile sheet. Calls [onSaved] after a successful save.
class ProfileForm extends ConsumerStatefulWidget {
  const ProfileForm({
    super.key,
    this.initial,
    required this.saveLabel,
    required this.onSaved,
  });

  final CustomerProfile? initial;
  final String saveLabel;
  final ValueChanged<CustomerProfile> onSaved;

  @override
  ConsumerState<ProfileForm> createState() => _ProfileFormState();
}

class _ProfileFormState extends ConsumerState<ProfileForm> {
  late final _name = TextEditingController(
    text: widget.initial?.displayName ?? '',
  );
  late CustomerType? _type = widget.initial?.customerType;
  bool _busy = false;
  String? _nameError;
  String? _typeError;
  String? _formError;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    final type = _type;
    setState(() {
      _nameError = name.isEmpty ? ProfileMessages.enterName : null;
      _typeError = type == null ? ProfileMessages.chooseType : null;
      _formError = null;
    });
    if (name.isEmpty || type == null) return;

    setState(() => _busy = true);
    try {
      final saved = await ref
          .read(customerProfileProvider.notifier)
          .save(displayName: name, customerType: type);
      if (!mounted) return;
      widget.onSaved(saved);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _nameError = error.fieldErrors['displayName'];
        _typeError = error.fieldErrors['customerType'];
        _formError = _nameError == null && _typeError == null
            ? (error.detail ?? ProfileMessages.saveFailed)
            : null;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final typeError = _typeError;
    final formError = _formError;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        AppTextField(
          key: const Key('name-field'),
          label: ProfileMessages.nameLabel,
          isRequired: true,
          controller: _name,
          enabled: !_busy,
          maxLength: 100,
          autofillHints: const [AutofillHints.name],
          textInputAction: TextInputAction.next,
          error: _nameError,
        ),
        const SizedBox(height: AppSpacing.s16),
        Semantics(
          header: true,
          child: appRequiredLabel(ProfileMessages.typeLabel),
        ),
        const SizedBox(height: AppSpacing.s12),
        AppChoiceCard(
          key: const Key('type-painter'),
          title: CustomerType.painter.label,
          description: ProfileMessages.painterDescription,
          icon: Icons.format_paint_outlined,
          selected: _type == CustomerType.painter,
          onTap: _busy
              ? null
              : () => setState(() {
                  _type = CustomerType.painter;
                  _typeError = null;
                }),
        ),
        const SizedBox(height: AppSpacing.s12),
        AppChoiceCard(
          key: const Key('type-customer'),
          title: CustomerType.customer.label,
          description: ProfileMessages.customerDescription,
          icon: Icons.home_outlined,
          selected: _type == CustomerType.customer,
          onTap: _busy
              ? null
              : () => setState(() {
                  _type = CustomerType.customer;
                  _typeError = null;
                }),
        ),
        if (typeError != null) ...[
          const SizedBox(height: AppSpacing.s8),
          AppInlineMessage(message: typeError, tone: AppTone.error),
        ],
        const SizedBox(height: AppSpacing.s12),
        Text(
          ProfileMessages.confirmationNote,
          style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        if (formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(message: formError, tone: AppTone.error),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          key: const Key('save-profile'),
          label: widget.saveLabel,
          loadingLabel: 'Saving…',
          loading: _busy,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}
