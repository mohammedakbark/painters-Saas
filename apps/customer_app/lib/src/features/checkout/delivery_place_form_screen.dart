import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../delivery/delivery_locations.dart';
import '../shops/shop_screen.dart' show mapsEnabledProvider;
import '../sites/site_form_screen.dart';

/// Save a delivery place, such as Home (CUS-006, D-049, D-061): a name, the
/// house or business name and place, and an accurate map pin.
class DeliveryPlaceFormScreen extends ConsumerStatefulWidget {
  const DeliveryPlaceFormScreen({super.key});

  @override
  ConsumerState<DeliveryPlaceFormScreen> createState() =>
      _DeliveryPlaceFormScreenState();
}

class _DeliveryPlaceFormScreenState
    extends ConsumerState<DeliveryPlaceFormScreen> {
  final _label = TextEditingController(text: 'Home');
  final _address = TextEditingController();
  SitePin? _pin;
  bool _busy = false;
  String? _labelError;
  String? _addressError;
  String? _pinError;
  String? _formError;

  @override
  void dispose() {
    _label.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _choosePin() async {
    final pin = await Navigator.of(context).push<SitePin>(
      MaterialPageRoute(
        builder: (_) => SitePinScreen(
          initial: _pin,
          title: 'Delivery place on the map',
          subtitle: 'Move the map until the pin is on the place',
        ),
      ),
    );
    if (pin != null && mounted) {
      setState(() {
        _pin = pin;
        _pinError = null;
      });
    }
  }

  Future<void> _save() async {
    final label = _label.text.trim();
    final address = _address.text.trim();
    final pin = _pin;
    setState(() {
      _labelError = label.isEmpty
          ? 'Enter a name for this place, such as Home.'
          : null;
      _addressError = address.isEmpty
          ? 'Enter the house or business name and place.'
          : null;
      _pinError = pin == null ? 'Choose the place on the map.' : null;
      _formError = null;
    });
    if (label.isEmpty || address.isEmpty || pin == null) return;

    setState(() => _busy = true);
    try {
      final saved = await ref
          .read(deliveryLocationsProvider.notifier)
          .create(
            DeliveryLocationDraft(
              label: label,
              address: address,
              latitude: pin.latitude,
              longitude: pin.longitude,
            ),
          );
      if (!mounted) return;
      showAppSnackBar(context, '${saved.label} saved.');
      context.pop(saved.id);
    } on ApiException catch (error) {
      if (!mounted) return;
      final fields = error.fieldErrors;
      setState(() {
        _labelError = fields['label'];
        _addressError = fields['address'];
        _pinError = fields['pin'];
        _formError =
            _labelError == null && _addressError == null && _pinError == null
            ? (error.detail ??
                  "We couldn't save the place right now. Try again in a moment.")
            : null;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final pin = _pin;
    final pinError = _pinError;
    final formError = _formError;
    return AppScaffold(
      title: 'New delivery place',
      bottomBar: AppBottomActionBar(
        child: AppButton(
          key: const Key('save-place'),
          label: 'Save place',
          loadingLabel: 'Saving…',
          loading: _busy,
          expand: true,
          onPressed: _save,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        children: [
          Text(
            'Fields marked * are required.',
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.s16),
          AppTextField(
            key: const Key('place-label'),
            label: 'Name',
            hint: 'Home, Office, Mother’s house',
            isRequired: true,
            controller: _label,
            enabled: !_busy,
            maxLength: 40,
            textInputAction: TextInputAction.next,
            error: _labelError,
          ),
          const SizedBox(height: AppSpacing.s16),
          AppTextField(
            key: const Key('place-address'),
            label: 'House or business name and place',
            hint: 'Flat 3C, Lotus Apartments, Palarivattom',
            isRequired: true,
            controller: _address,
            enabled: !_busy,
            maxLength: 300,
            maxLines: 3,
            error: _addressError,
          ),
          const SizedBox(height: AppSpacing.s16),
          Semantics(header: true, child: appRequiredLabel('Map pin')),
          const SizedBox(height: AppSpacing.s4),
          Text(
            'Shops deliver by distance from their pin, so put the pin on the '
            'place itself.',
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.s8),
          if (pin != null) ...[
            ShopLocationMap(
              latitude: pin.latitude,
              longitude: pin.longitude,
              mapsEnabled: ref.watch(mapsEnabledProvider),
              height: 160,
            ),
            const SizedBox(height: AppSpacing.s8),
          ],
          AppButton(
            key: const Key('place-choose-pin'),
            label: pin == null ? 'Choose on the map' : 'Move the pin',
            icon: Icons.place_outlined,
            variant: AppButtonVariant.secondary,
            expand: true,
            onPressed: _busy ? null : _choosePin,
          ),
          if (pinError != null) ...[
            const SizedBox(height: AppSpacing.s8),
            AppInlineMessage(message: pinError, tone: AppTone.error),
          ],
          if (formError != null) ...[
            const SizedBox(height: AppSpacing.s16),
            AppInlineMessage(message: formError, tone: AppTone.error),
          ],
        ],
      ),
    );
  }
}
