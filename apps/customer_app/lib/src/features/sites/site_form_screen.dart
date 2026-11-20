import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../location/location_service.dart';
import '../../shops/shop_providers.dart';
import '../../sites/sites.dart';
import '../shops/shop_screen.dart' show mapsEnabledProvider;

abstract final class SiteMessages {
  static const enterName = 'Enter the site name.';
  static const enterAddress = 'Enter the house or business name and place.';
  static const choosePin = 'Choose the site on the map.';
  static const saveFailed =
      "We couldn't save the site right now. Try again in a moment.";
  static const locationOff =
      'Location is off on this phone. Turn it on, or move the map by hand.';
  static const locationDenied =
      'Allow location to use My location, or move the map by hand.';
  static const locationBlocked =
      'Location is blocked for SevenPalette. Allow it in Settings, or move '
      'the map by hand.';
  static const locationFailed =
      "We couldn't find your location. Move the map by hand.";
}

/// A point on the map.
typedef SitePin = ({double latitude, double longitude});

/// Add or change a painter's site (CUS-005, D-049): name, owner (optional),
/// house or business name and place, and an accurate map pin. With
/// [siteId] the site is edited and can be archived.
class SiteFormScreen extends ConsumerStatefulWidget {
  const SiteFormScreen({super.key, this.siteId});

  final String? siteId;

  @override
  ConsumerState<SiteFormScreen> createState() => _SiteFormScreenState();
}

class _SiteFormScreenState extends ConsumerState<SiteFormScreen> {
  final _name = TextEditingController();
  final _owner = TextEditingController();
  final _address = TextEditingController();
  SitePin? _pin;
  CustomerSite? _site;
  bool _busy = false;
  String? _nameError;
  String? _addressError;
  String? _pinError;
  String? _formError;

  @override
  void initState() {
    super.initState();
    final id = widget.siteId;
    if (id == null) return;
    final site = ref
        .read(sitesProvider)
        .value
        ?.where((item) => item.id == id)
        .firstOrNull;
    if (site != null) _fill(site);
  }

  void _fill(CustomerSite site) {
    _site = site;
    _name.text = site.name;
    _owner.text = site.ownerName ?? '';
    _address.text = site.address;
    _pin = (latitude: site.latitude, longitude: site.longitude);
  }

  @override
  void dispose() {
    _name.dispose();
    _owner.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _choosePin() async {
    final pin = await Navigator.of(context).push<SitePin>(
      MaterialPageRoute(builder: (_) => SitePinScreen(initial: _pin)),
    );
    if (pin != null && mounted) {
      setState(() {
        _pin = pin;
        _pinError = null;
      });
    }
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    final address = _address.text.trim();
    final pin = _pin;
    setState(() {
      _nameError = name.isEmpty ? SiteMessages.enterName : null;
      _addressError = address.isEmpty ? SiteMessages.enterAddress : null;
      _pinError = pin == null ? SiteMessages.choosePin : null;
      _formError = null;
    });
    if (name.isEmpty || address.isEmpty || pin == null) return;

    final draft = SiteDraft(
      name: name,
      ownerName: _owner.text.trim(),
      address: address,
      latitude: pin.latitude,
      longitude: pin.longitude,
    );
    setState(() => _busy = true);
    try {
      final notifier = ref.read(sitesProvider.notifier);
      final site = _site;
      final saved = site == null
          ? await notifier.create(draft)
          : await notifier.save(site.id, draft);
      if (!mounted) return;
      showAppSnackBar(
        context,
        site == null ? '${saved.name} added.' : '${saved.name} saved.',
      );
      context.pop();
    } on ApiException catch (error) {
      if (!mounted) return;
      final fields = error.fieldErrors;
      setState(() {
        _nameError = fields['name'];
        _addressError = fields['address'];
        _pinError = fields['pin'] ?? fields['pin.latitude'];
        _formError =
            _nameError == null && _addressError == null && _pinError == null
            ? (error.detail ?? SiteMessages.saveFailed)
            : null;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _archive() async {
    final site = _site;
    if (site == null) return;
    final confirmed = await showAppConfirmDialog(
      context: context,
      title: 'Archive ${site.name}?',
      message:
          'It leaves your Sites list. You can restore it from Archived '
          'sites at any time.',
      confirmLabel: 'Archive',
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(sitesProvider.notifier).archive(site.id);
      if (!mounted) return;
      showAppSnackBar(context, '${site.name} archived.');
      context.pop();
    } on ApiException catch (error) {
      if (mounted) {
        setState(() => _formError = error.detail ?? SiteMessages.saveFailed);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final editing = widget.siteId != null;
    if (editing && _site == null) {
      return const AppScaffold(
        title: 'Site',
        body: MessageView(
          icon: Icons.search_off,
          title: 'Site not found',
          message: 'It may have been archived. Check Archived sites.',
        ),
      );
    }
    final textTheme = Theme.of(context).textTheme;
    final pin = _pin;
    final pinError = _pinError;
    final formError = _formError;
    return AppScaffold(
      title: editing ? 'Edit site' : 'Add site',
      actions: [
        if (editing)
          AppMenuButton(
            items: [
              AppMenuItem(
                label: 'Archive site',
                icon: Icons.inventory_2_outlined,
                destructive: true,
                onSelected: _archive,
              ),
            ],
          ),
      ],
      bottomBar: AppBottomActionBar(
        child: AppButton(
          key: const Key('save-site'),
          label: editing ? 'Save site' : 'Add site',
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
            key: const Key('site-name'),
            label: 'Site name',
            hint: 'For example Rahman Villa',
            isRequired: true,
            controller: _name,
            enabled: !_busy,
            maxLength: 80,
            textInputAction: TextInputAction.next,
            error: _nameError,
          ),
          const SizedBox(height: AppSpacing.s16),
          AppTextField(
            key: const Key('site-owner'),
            label: 'Owner name (optional)',
            controller: _owner,
            enabled: !_busy,
            maxLength: 120,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: AppSpacing.s16),
          AppTextField(
            key: const Key('site-address'),
            label: 'House or business name and place',
            hint: 'Rahman Villa, near the mosque, Edappally',
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
            'Shops deliver by distance from their pin, so put the pin on '
            'the site itself.',
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
            key: const Key('choose-pin'),
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

/// Put the site's pin on the map: move the map under the pin, or use the
/// phone's precise location (asked only on tap). Returns the point.
class SitePinScreen extends ConsumerStatefulWidget {
  const SitePinScreen({
    super.key,
    this.initial,
    this.title = 'Site on the map',
    this.subtitle = 'Move the map until the pin is on the site',
  });

  final SitePin? initial;
  final String title;
  final String subtitle;

  @override
  ConsumerState<SitePinScreen> createState() => _SitePinScreenState();
}

class _SitePinScreenState extends ConsumerState<SitePinScreen> {
  late SitePin? _pin = widget.initial;
  bool _locating = false;

  Future<void> _myLocation() async {
    setState(() => _locating = true);
    final result = await ref
        .read(locationServiceProvider)
        .currentLocation(precise: true);
    if (!mounted) return;
    setState(() => _locating = false);
    switch (result) {
      case LocationFound(:final latitude, :final longitude):
        setState(() => _pin = (latitude: latitude, longitude: longitude));
      case LocationUnavailable(:final problem):
        showAppSnackBar(
          context,
          switch (problem) {
            LocationProblem.serviceDisabled => SiteMessages.locationOff,
            LocationProblem.permissionDenied => SiteMessages.locationDenied,
            LocationProblem.permissionDeniedForever =>
              SiteMessages.locationBlocked,
            LocationProblem.failed => SiteMessages.locationFailed,
          },
          tone: AppTone.warning,
          actionLabel: problem == LocationProblem.permissionDeniedForever
              ? 'Settings'
              : null,
          onAction: problem == LocationProblem.permissionDeniedForever
              ? () => ref.read(locationServiceProvider).openAppSettings()
              : null,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final pin = _pin;
    return AppScaffold(
      title: widget.title,
      subtitle: widget.subtitle,
      bottomBar: AppBottomActionBar(
        child: Row(
          children: [
            Expanded(
              child: AppButton(
                key: const Key('my-location'),
                label: 'My location',
                loadingLabel: 'Finding…',
                loading: _locating,
                icon: Icons.my_location,
                variant: AppButtonVariant.secondary,
                expand: true,
                onPressed: _myLocation,
              ),
            ),
            const SizedBox(width: AppSpacing.s12),
            Expanded(
              child: AppButton(
                key: const Key('use-pin'),
                label: 'Use this point',
                expand: true,
                onPressed: pin == null
                    ? null
                    : () => Navigator.of(context).pop(pin),
              ),
            ),
          ],
        ),
      ),
      body: AppLocationPicker(
        latitude: pin?.latitude,
        longitude: pin?.longitude,
        mapsEnabled: ref.watch(mapsEnabledProvider),
        onChanged: (latitude, longitude) =>
            setState(() => _pin = (latitude: latitude, longitude: longitude)),
      ),
    );
  }
}
