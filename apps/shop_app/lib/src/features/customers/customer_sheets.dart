import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../api/api_client.dart';
import '../../customers/customer_models.dart';
import '../../customers/shop_customers_repository.dart';
import '../../providers.dart';
import '../orders/order_messages.dart';

/// Opens the Add customer sheet; returns the saved customer.
Future<CustomerDetail?> showAddCustomerSheet(
  BuildContext context,
  String shopId,
) => showAppBottomSheet<CustomerDetail>(
  context: context,
  title: 'Add customer',
  builder: (context) => CustomerForm(shopId: shopId),
);

/// Opens the Edit customer sheet; returns the saved customer.
Future<CustomerDetail?> showEditCustomerSheet(
  BuildContext context,
  String shopId,
  ShopCustomer customer,
) => showAppBottomSheet<CustomerDetail>(
  context: context,
  title: 'Edit customer',
  builder: (context) => CustomerForm(shopId: shopId, editing: customer),
);

/// Opens the Add site or Edit site sheet; returns the saved site.
Future<CustomerSite?> showSiteSheet(
  BuildContext context, {
  required String shopId,
  required String customerId,
  CustomerSite? editing,
}) => showAppBottomSheet<CustomerSite>(
  context: context,
  title: editing == null ? 'Add site' : 'Edit site',
  builder: (context) =>
      SiteForm(shopId: shopId, customerId: customerId, editing: editing),
);

/// Field errors of a refused save, or a message for the whole form.
({Map<String, String> fields, String? form}) _refusal(Object error) {
  final fields = error is ApiException
      ? error.fieldErrors
      : const <String, String>{};
  return (
    fields: fields,
    form: fields.isEmpty ? orderErrorMessage(error) : null,
  );
}

/// Records a customer of the shop ([editing] null) or edits one. Pops with
/// the saved customer.
class CustomerForm extends ConsumerStatefulWidget {
  const CustomerForm({super.key, required this.shopId, this.editing});

  final String shopId;
  final ShopCustomer? editing;

  @override
  ConsumerState<CustomerForm> createState() => _CustomerFormState();
}

class _CustomerFormState extends ConsumerState<CustomerForm> {
  late final _name = TextEditingController(text: widget.editing?.name);
  late final _phone = TextEditingController(
    text: switch (widget.editing?.phone) {
      final String phone when phone.startsWith('+91') => phone.substring(3),
      final String phone => phone,
      null => null,
    },
  );
  late CustomerKind? _kind = widget.editing?.kind;
  bool _saving = false;
  Map<String, String> _errors = const {};
  String? _formError;

  /// The mobile of a customer who uses the app comes from their account.
  bool get _phoneLocked => widget.editing?.hasApp ?? false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    final phone = _phoneLocked ? null : IndianMobileNumber.parse(_phone.text);
    final kind = _kind;
    final errors = <String, String>{
      if (name.isEmpty) 'name': OrderMessages.nameRequired,
      if (!_phoneLocked && phone == null) 'phone': OrderMessages.phoneInvalid,
      if (kind == null) 'kind': 'Choose Painter or Customer.',
    };
    setState(() {
      _errors = errors;
      _formError = null;
    });
    if (errors.isNotEmpty) return;

    final editing = widget.editing;
    if (editing != null &&
        name == editing.name &&
        kind == editing.kind &&
        (phone == null || phone == editing.phone)) {
      Navigator.of(context).pop();
      return;
    }

    setState(() => _saving = true);
    final repository = ref.read(shopCustomersRepositoryProvider);
    try {
      final saved = editing == null
          ? await repository.create(
              widget.shopId,
              name: name,
              phone: phone!,
              kind: kind!,
            )
          : await repository.update(
              widget.shopId,
              editing.id,
              name: name == editing.name ? null : name,
              phone: phone == null || phone == editing.phone ? null : phone,
              kind: kind == editing.kind ? null : kind,
            );
      if (mounted) Navigator.of(context).pop(saved);
    } on Object catch (error) {
      if (!mounted) return;
      final refusal = _refusal(error);
      setState(() {
        _saving = false;
        _errors = refusal.fields;
        _formError = refusal.form;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final adding = widget.editing == null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (adding) ...[
          Text(
            "Only your shop sees this customer. They aren't told and no SMS "
            'is sent.',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.s16),
        ],
        AppTextField(
          label: 'Name',
          isRequired: true,
          controller: _name,
          enabled: !_saving,
          maxLength: 120,
          textInputAction: TextInputAction.next,
          error: _errors['name'],
        ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: 'Mobile number',
          isRequired: !_phoneLocked,
          controller: _phone,
          enabled: !_saving && !_phoneLocked,
          prefixText: '+91 ',
          keyboardType: TextInputType.phone,
          maxLength: 20,
          helper: _phoneLocked
              ? 'This customer uses the app; their mobile comes from their '
                    'account.'
              : null,
          error: _errors['phone'],
        ),
        const SizedBox(height: AppSpacing.s12),
        AppRadioGroup<CustomerKind>(
          label: 'Type',
          isRequired: true,
          value: _kind,
          options: [
            for (final kind in CustomerKind.values) AppOption(kind, kind.label),
          ],
          onChanged: _saving ? (_) {} : (kind) => setState(() => _kind = kind),
          error: _errors['kind'],
        ),
        if (_formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(tone: AppTone.error, message: _formError!),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: adding ? 'Add customer' : 'Save changes',
          loadingLabel: adding ? 'Adding…' : 'Saving…',
          loading: _saving,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}

/// Adds a site to a painter the shop recorded, or edits one. The map pin is
/// set on the web; editing here keeps it.
class SiteForm extends ConsumerStatefulWidget {
  const SiteForm({
    super.key,
    required this.shopId,
    required this.customerId,
    this.editing,
  });

  final String shopId;
  final String customerId;
  final CustomerSite? editing;

  @override
  ConsumerState<SiteForm> createState() => _SiteFormState();
}

class _SiteFormState extends ConsumerState<SiteForm> {
  late final _name = TextEditingController(text: widget.editing?.name);
  late final _owner = TextEditingController(text: widget.editing?.ownerName);
  late final _address = TextEditingController(text: widget.editing?.address);
  bool _saving = false;
  Map<String, String> _errors = const {};
  String? _formError;

  @override
  void dispose() {
    _name.dispose();
    _owner.dispose();
    _address.dispose();
    super.dispose();
  }

  /// The same limits as the API, so most mistakes show before saving.
  Map<String, String> _check(SiteFields fields) => {
    if (fields.name.length < 2)
      'name': fields.name.isEmpty
          ? 'Enter the site name.'
          : 'The site name needs at least 2 characters.',
    if (fields.address.length < 5)
      'address': fields.address.isEmpty
          ? 'Enter the address or place.'
          : 'Enter the house or business name and place.',
  };

  Future<void> _save() async {
    final owner = _owner.text.trim();
    final SiteFields fields = (
      name: _name.text.trim(),
      ownerName: owner.isEmpty ? null : owner,
      address: _address.text.trim(),
    );
    final errors = _check(fields);
    setState(() {
      _errors = errors;
      _formError = null;
    });
    if (errors.isNotEmpty) return;

    setState(() => _saving = true);
    final repository = ref.read(shopCustomersRepositoryProvider);
    final editing = widget.editing;
    try {
      final saved = editing == null
          ? await repository.createSite(
              widget.shopId,
              widget.customerId,
              fields,
            )
          : await repository.updateSite(
              widget.shopId,
              widget.customerId,
              editing.id,
              fields: fields,
            );
      if (mounted) Navigator.of(context).pop(saved);
    } on Object catch (error) {
      if (!mounted) return;
      final refusal = _refusal(error);
      setState(() {
        _saving = false;
        _errors = refusal.fields;
        _formError = refusal.form;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final adding = widget.editing == null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          label: 'Site name',
          hint: 'For example, Ravi house, Kakkanad',
          isRequired: true,
          controller: _name,
          enabled: !_saving,
          maxLength: 80,
          textInputAction: TextInputAction.next,
          error: _errors['name'],
        ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: 'Owner name',
          controller: _owner,
          enabled: !_saving,
          maxLength: 120,
          textInputAction: TextInputAction.next,
          error: _errors['ownerName'],
        ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: 'Address or place',
          isRequired: true,
          controller: _address,
          enabled: !_saving,
          maxLength: 300,
          maxLines: 3,
          helper: 'The map pin can be set on the web portal.',
          error: _errors['address'],
        ),
        if (_formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(tone: AppTone.error, message: _formError!),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: adding ? 'Add site' : 'Save changes',
          loadingLabel: adding ? 'Adding…' : 'Saving…',
          loading: _saving,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}
