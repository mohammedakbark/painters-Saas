import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../api/api_client.dart';
import '../../providers.dart';
import '../../shops/indian_states.dart';
import '../../shops/shop_profile.dart';

/// Messages of the profile forms (SHP-013), in the web portal's words.
abstract final class ProfileFormMessages {
  static const saved = 'Profile saved';
  static const photoSaved = 'Shop photo saved';
  static const inReview =
      'Your shop is waiting for review, so its profile, photo and location are '
      'locked. To change them, withdraw the submission on the shop home.';
  static const forbidden = "You don't have permission to change the profile.";
  static const failed = "We couldn't save the profile. Try again.";
  static const phoneInvalid = 'Enter a 10-digit Indian mobile number.';
  static const postalCode = 'Enter the 6-digit PIN code.';
}

/// What a refused save means for the form.
String profileErrorMessage(Object error) => switch (error) {
  ShopInReview() => ProfileFormMessages.inReview,
  ShopProfileForbidden() => ProfileFormMessages.forbidden,
  ApiException(:final detail?, :final status)
      when status == 400 || status == 409 || status == 413 =>
    detail,
  _ => ProfileFormMessages.failed,
};

/// Opens the support mobile sheet; returns the saved profile.
Future<ShopProfile?> showSupportPhoneSheet(
  BuildContext context,
  ShopProfile profile,
) => showAppBottomSheet<ShopProfile>(
  context: context,
  title: 'Support mobile',
  builder: (context) => SupportPhoneForm(profile: profile),
);

/// Opens the address sheet; returns the saved profile.
Future<ShopProfile?> showAddressSheet(
  BuildContext context,
  ShopProfile profile,
) => showAppBottomSheet<ShopProfile>(
  context: context,
  title: 'Shop address',
  builder: (context) => AddressForm(profile: profile),
);

/// The number customers can call. Saving keeps the address as it is.
class SupportPhoneForm extends ConsumerStatefulWidget {
  const SupportPhoneForm({super.key, required this.profile});

  final ShopProfile profile;

  @override
  ConsumerState<SupportPhoneForm> createState() => _SupportPhoneFormState();
}

class _SupportPhoneFormState extends ConsumerState<SupportPhoneForm> {
  late final _phone = TextEditingController(
    text: switch (widget.profile.supportPhone) {
      final String phone when phone.startsWith('+91') => phone.substring(3),
      final String phone => phone,
      null => null,
    },
  );
  bool _saving = false;
  String? _error;
  String? _formError;

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final phone = IndianMobileNumber.parse(_phone.text);
    if (phone == null) {
      setState(() => _error = ProfileFormMessages.phoneInvalid);
      return;
    }
    if (phone == widget.profile.supportPhone) {
      Navigator.of(context).pop();
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
      _formError = null;
    });
    try {
      final saved = await ref
          .read(shopProfileRepositoryProvider)
          .saveDetails(
            widget.profile.shopId,
            supportPhone: phone,
            address: widget.profile.address,
          );
      if (mounted) Navigator.of(context).pop(saved);
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = error is ApiException
            ? error.fieldErrors['supportPhone']
            : null;
        _formError = _error == null ? profileErrorMessage(error) : null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          label: 'Support mobile',
          helper: 'Customers will call this number about their orders.',
          isRequired: true,
          controller: _phone,
          enabled: !_saving,
          prefixText: '+91 ',
          keyboardType: TextInputType.phone,
          maxLength: 20,
          error: _error,
        ),
        if (_formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(tone: AppTone.error, message: _formError!),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: 'Save',
          loadingLabel: 'Saving…',
          loading: _saving,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}

/// The shop address, all or nothing (SHP-003). Saving keeps the support
/// mobile and the map location as they are.
class AddressForm extends ConsumerStatefulWidget {
  const AddressForm({super.key, required this.profile});

  final ShopProfile profile;

  @override
  ConsumerState<AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends ConsumerState<AddressForm> {
  late final ShopAddress? _initial = widget.profile.address;
  late final _line1 = TextEditingController(text: _initial?.line1);
  late final _line2 = TextEditingController(text: _initial?.line2);
  late final _landmark = TextEditingController(text: _initial?.landmark);
  late final _city = TextEditingController(text: _initial?.city);
  late final _district = TextEditingController(text: _initial?.district);
  late final _postalCode = TextEditingController(text: _initial?.postalCode);
  late String _stateCode = _initial?.stateCode ?? defaultStateCode;
  bool _saving = false;
  Map<String, String> _errors = const {};
  String? _formError;

  @override
  void dispose() {
    for (final controller in [
      _line1,
      _line2,
      _landmark,
      _city,
      _district,
      _postalCode,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  String? _optional(TextEditingController controller) {
    final text = controller.text.trim();
    return text.isEmpty ? null : text;
  }

  /// The API's rules, checked first so most mistakes show before saving.
  Map<String, String> _check(ShopAddress address) => {
    if (address.line1.isEmpty)
      'line1': 'Enter the shop number, building and street.',
    if (address.city.isEmpty) 'city': 'Enter the city or town.',
    if (address.district.isEmpty) 'district': 'Enter the district.',
    if (!RegExp(r'^[1-9]\d{5}$').hasMatch(address.postalCode))
      'postalCode': ProfileFormMessages.postalCode,
  };

  Future<void> _save() async {
    final address = ShopAddress(
      line1: _line1.text.trim(),
      line2: _optional(_line2),
      landmark: _optional(_landmark),
      city: _city.text.trim(),
      district: _district.text.trim(),
      stateCode: _stateCode,
      stateName: indianStates
          .firstWhere((state) => state.code == _stateCode)
          .name,
      postalCode: _postalCode.text.trim(),
    );
    final errors = _check(address);
    setState(() {
      _errors = errors;
      _formError = null;
    });
    if (errors.isNotEmpty) return;

    setState(() => _saving = true);
    try {
      final saved = await ref
          .read(shopProfileRepositoryProvider)
          .saveDetails(
            widget.profile.shopId,
            supportPhone: widget.profile.supportPhone,
            address: address,
          );
      if (mounted) Navigator.of(context).pop(saved);
    } on Object catch (error) {
      if (!mounted) return;
      final fields = <String, String>{
        if (error is ApiException)
          for (final MapEntry(:key, :value) in error.fieldErrors.entries)
            if (key.startsWith('address.')) key.substring(8): value,
      };
      setState(() {
        _saving = false;
        _errors = fields;
        _formError = fields.isEmpty ? profileErrorMessage(error) : null;
      });
    }
  }

  Widget _field(
    String key,
    String label,
    TextEditingController controller, {
    bool required = false,
    int maxLength = 200,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.s12),
    child: AppTextField(
      label: label,
      isRequired: required,
      controller: controller,
      enabled: !_saving,
      maxLength: maxLength,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      textInputAction: TextInputAction.next,
      error: _errors[key],
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _field(
          'line1',
          'Shop number, building and street',
          _line1,
          required: true,
        ),
        _field('line2', 'Area or locality', _line2),
        _field('landmark', 'Landmark', _landmark, maxLength: 120),
        _field('city', 'City or town', _city, required: true, maxLength: 80),
        _field(
          'district',
          'District',
          _district,
          required: true,
          maxLength: 80,
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.s12),
          child: AppDropdown<String>(
            label: 'State',
            isRequired: true,
            value: _stateCode,
            options: [
              for (final state in indianStates)
                AppOption(state.code, state.name),
            ],
            onChanged: _saving
                ? null
                : (code) => setState(() => _stateCode = code ?? _stateCode),
            error: _errors['stateCode'],
          ),
        ),
        _field(
          'postalCode',
          'PIN code',
          _postalCode,
          required: true,
          maxLength: 6,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        ),
        if (_formError != null) ...[
          const SizedBox(height: AppSpacing.s4),
          AppInlineMessage(tone: AppTone.error, message: _formError!),
        ],
        const SizedBox(height: AppSpacing.s16),
        AppButton(
          label: 'Save address',
          loadingLabel: 'Saving…',
          loading: _saving,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}
