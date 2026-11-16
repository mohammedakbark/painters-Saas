import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../catalogue/product_photo_picker.dart';
import '../../location/location_service.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../../shops/shop_permissions.dart';
import '../../shops/shop_profile.dart';
import 'profile_sheets.dart';

/// User-facing messages of the profile screen (also used by tests).
abstract final class ShopProfileMessages {
  static const notAdded = 'Not added yet.';
  static const photoFailed = "The photo couldn't be loaded.";
  static const noLocation = 'No location yet.';
  static const serviceDisabled =
      'Location is turned off on this phone. Turn it on, then try again.';
  static const permissionDenied =
      'The app needs location permission to use your current location.';
  static const permissionDeniedForever =
      'Location permission is turned off for this app. Allow it in Settings, '
      'then try again.';
  static const failed =
      "We couldn't get your location. Try again, ideally near a door or "
      'window.';
  static String inaccurate(double meters) =>
      'This phone could only find its location to within about '
      '${meters >= 1000 ? '${(meters / 1000).round()} km' : '${meters.round()} m'}, '
      'which is too rough for a shop pin. Go outside or near a door, then '
      'try again.';
  static const inReview =
      'Your shop is waiting for review, so its location is locked. To change '
      'it, withdraw the submission on the shop home.';
  static const outsideIndia =
      'This location is outside India. Stand at the shop and try again.';
  static const saved = 'Shop location saved.';
  static const forbidden = 'Only the shop owner can change the location.';
  static const saveFailed = "We couldn't save the location. Try again.";
}

/// The shop's photo, support mobile, address and map location (SHP-003,
/// SHP-004). With `shop.profile` the owner changes them here (SHP-013);
/// while the shop waits for review they are locked (D-033).
class ShopProfileScreen extends ConsumerWidget {
  const ShopProfileScreen({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(shopProfileProvider(shopId));
    final canEdit =
        ref
            .watch(shopProvider(shopId))
            .value
            ?.can(ShopPermission.shopProfile) ??
        false;
    final inReview =
        ref.watch(shopReviewProvider(shopId)).value?.status == 'PENDING_REVIEW';
    return AppScaffold(
      title: 'Shop profile',
      body: profile.when(
        loading: () => const LoadingView(message: 'Loading the profile…'),
        error: (error, _) => error is ShopNotFound
            ? MessageView(
                icon: Icons.search_off,
                title: 'Shop not found',
                message:
                    "This shop doesn't exist, or your account doesn't have "
                    'access to it.',
                action: AppButton(
                  label: 'Go to your shops',
                  variant: AppButtonVariant.secondary,
                  onPressed: () => context.go('/shops'),
                ),
              )
            : ErrorView(
                title: "We couldn't load the profile",
                onRetry: () => ref.invalidate(shopProfileProvider(shopId)),
              ),
        data: (profile) => _ProfileDetails(
          profile: profile,
          canEdit: canEdit,
          locked: canEdit && inReview,
        ),
      ),
    );
  }
}

class _ProfileDetails extends ConsumerStatefulWidget {
  const _ProfileDetails({
    required this.profile,
    required this.canEdit,
    required this.locked,
  });

  final ShopProfile profile;
  final bool canEdit;

  /// Waiting for review: shown, not changeable.
  final bool locked;

  @override
  ConsumerState<_ProfileDetails> createState() => _ProfileDetailsState();
}

class _ProfileDetailsState extends ConsumerState<_ProfileDetails> {
  PhotoSource? _uploadingFrom;

  bool get _editable => widget.canEdit && !widget.locked;

  String get _shopId => widget.profile.shopId;

  /// The profile and the checklist on the home read again.
  void _saved(String message) {
    ref
      ..invalidate(shopProfileProvider(_shopId))
      ..invalidate(shopReviewProvider(_shopId));
    showAppSnackBar(context, message, tone: AppTone.success);
  }

  Future<void> _edit(
    Future<ShopProfile?> Function(BuildContext, ShopProfile) open,
  ) async {
    final saved = await open(context, widget.profile);
    if (saved != null && mounted) _saved(ProfileFormMessages.saved);
  }

  Future<void> _replacePhoto(PhotoSource source) async {
    final PickedPhoto? photo;
    try {
      photo = await ref.read(productPhotoPickerProvider).pick(source);
    } on Object {
      if (!mounted) return;
      showAppSnackBar(
        context,
        source == PhotoSource.camera
            ? "The camera couldn't be opened."
            : "The photos couldn't be opened.",
        tone: AppTone.error,
      );
      return;
    }
    if (photo == null || !mounted) return;
    setState(() => _uploadingFrom = source);
    try {
      await ref
          .read(shopProfileRepositoryProvider)
          .replacePhoto(_shopId, photo);
      if (mounted) _saved(ProfileFormMessages.photoSaved);
    } on Object catch (error) {
      if (mounted) {
        showAppSnackBar(
          context,
          profileErrorMessage(error),
          tone: AppTone.error,
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingFrom = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    final address = profile.address;
    final phone = profile.supportPhone;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        Semantics(
          header: true,
          child: Text(
            profile.shopName,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
        ),
        if (widget.locked) ...[
          const SizedBox(height: AppSpacing.s16),
          const AppInlineMessage(
            tone: AppTone.info,
            message: ProfileFormMessages.inReview,
          ),
        ],
        const SizedBox(height: AppSpacing.s24),
        _PhotoSection(
          photo: profile.photo,
          editable: _editable,
          uploadingFrom: _uploadingFrom,
          onPick: _replacePhoto,
        ),
        const SizedBox(height: AppSpacing.s16),
        AppSection(
          title: 'Address',
          lines: address?.lines ?? const [ShopProfileMessages.notAdded],
          muted: address == null,
          child: _editable
              ? _EditButton(
                  label: address == null ? 'Add address' : 'Edit address',
                  onPressed: () => _edit(showAddressSheet),
                )
              : null,
        ),
        const SizedBox(height: AppSpacing.s16),
        AppSection(
          title: 'Support mobile',
          lines: [
            if (phone == null)
              ShopProfileMessages.notAdded
            else
              IndianMobileNumber.format(phone),
          ],
          muted: phone == null,
          child: _editable
              ? _EditButton(
                  label: phone == null
                      ? 'Add support mobile'
                      : 'Edit support mobile',
                  onPressed: () => _edit(showSupportPhoneSheet),
                )
              : null,
        ),
        const SizedBox(height: AppSpacing.s16),
        _LocationSection(profile: profile, canEdit: _editable),
      ],
    );
  }
}

class _EditButton extends StatelessWidget {
  const _EditButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: AppSpacing.s12),
    child: Align(
      alignment: Alignment.centerLeft,
      child: AppButton(
        label: label,
        icon: Icons.edit_outlined,
        variant: AppButtonVariant.secondary,
        onPressed: onPressed,
      ),
    ),
  );
}

/// The shop photo (SHP-004): taken or chosen here, or on the web portal.
class _PhotoSection extends StatelessWidget {
  const _PhotoSection({
    required this.photo,
    required this.editable,
    required this.uploadingFrom,
    required this.onPick,
  });

  final ShopPhoto? photo;
  final bool editable;
  final PhotoSource? uploadingFrom;
  final ValueChanged<PhotoSource> onPick;

  @override
  Widget build(BuildContext context) {
    final photo = this.photo;
    final busy = uploadingFrom != null;
    final buttons = Wrap(
      spacing: AppSpacing.s12,
      runSpacing: AppSpacing.s8,
      children: [
        AppButton(
          label: 'Take photo',
          loadingLabel: 'Uploading…',
          icon: Icons.photo_camera_outlined,
          variant: AppButtonVariant.secondary,
          loading: uploadingFrom == PhotoSource.camera,
          onPressed: busy ? null : () => onPick(PhotoSource.camera),
        ),
        AppButton(
          label: 'Choose from gallery',
          loadingLabel: 'Uploading…',
          icon: Icons.photo_library_outlined,
          variant: AppButtonVariant.secondary,
          loading: uploadingFrom == PhotoSource.gallery,
          onPressed: busy ? null : () => onPick(PhotoSource.gallery),
        ),
      ],
    );
    if (photo == null) {
      return AppSection(
        title: 'Shop photo',
        lines: const [ShopProfileMessages.notAdded],
        muted: true,
        child: editable
            ? Padding(
                padding: const EdgeInsets.only(top: AppSpacing.s12),
                child: buttons,
              )
            : null,
      );
    }
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 4 / 3,
            child: AppNetworkImage(
              url: photo.url,
              semanticLabel: 'Shop photo',
              errorMessage: ShopProfileMessages.photoFailed,
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.s16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Shop photo',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (editable) ...[
                  const SizedBox(height: AppSpacing.s12),
                  buttons,
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The map, and "Use my current location" for the owner.
class _LocationSection extends ConsumerStatefulWidget {
  const _LocationSection({required this.profile, required this.canEdit});

  final ShopProfile profile;
  final bool canEdit;

  @override
  ConsumerState<_LocationSection> createState() => _LocationSectionState();
}

enum _Fix { none, retry, appSettings, locationSettings }

class _LocationSectionState extends ConsumerState<_LocationSection> {
  bool _busy = false;
  String? _message;
  bool _isError = false;
  _Fix _fix = _Fix.none;

  void _show(String message, {bool error = true, _Fix fix = _Fix.none}) {
    setState(() {
      _message = message;
      _isError = error;
      _fix = fix;
    });
  }

  Future<void> _useCurrentLocation() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    final result = await ref.read(locationServiceProvider).currentLocation();
    if (!mounted) return;
    setState(() => _busy = false);

    switch (result) {
      case LocationUnavailable(:final problem):
        switch (problem) {
          case LocationProblem.serviceDisabled:
            _show(
              ShopProfileMessages.serviceDisabled,
              fix: _Fix.locationSettings,
            );
          case LocationProblem.permissionDenied:
            _show(ShopProfileMessages.permissionDenied, fix: _Fix.retry);
          case LocationProblem.permissionDeniedForever:
            _show(
              ShopProfileMessages.permissionDeniedForever,
              fix: _Fix.appSettings,
            );
          case LocationProblem.failed:
            _show(ShopProfileMessages.failed, fix: _Fix.retry);
        }
      case LocationFound(
        :final latitude,
        :final longitude,
        :final accuracyMeters,
      ):
        if (accuracyMeters > maxLocationAccuracyMeters) {
          _show(
            ShopProfileMessages.inaccurate(accuracyMeters),
            fix: _Fix.retry,
          );
          return;
        }
        if (!isInIndia(latitude, longitude)) {
          _show(ShopProfileMessages.outsideIndia);
          return;
        }
        final confirmed = await _confirm(latitude, longitude, accuracyMeters);
        if (confirmed == true && mounted) {
          await _save(latitude, longitude);
        }
    }
  }

  Future<bool?> _confirm(double latitude, double longitude, double accuracy) {
    final mapsEnabled = ref.read(mapsEnabledProvider);
    return showAppDialog<bool>(
      context: context,
      title: 'Save this as the shop location?',
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShopLocationMap(
            latitude: latitude,
            longitude: longitude,
            mapsEnabled: mapsEnabled,
            shopName: widget.profile.shopName,
            height: 160,
          ),
          const SizedBox(height: AppSpacing.s12),
          Text(
            'Accurate to about ${accuracy.round().clamp(1, 100000)} m. '
            'Make sure you are at the shop.',
          ),
        ],
      ),
      actions: [
        Builder(
          builder: (context) => AppButton(
            label: 'Cancel',
            variant: AppButtonVariant.tertiary,
            onPressed: () => Navigator.of(context).pop(false),
          ),
        ),
        Builder(
          builder: (context) => AppButton(
            label: 'Save location',
            onPressed: () => Navigator.of(context).pop(true),
          ),
        ),
      ],
    );
  }

  Future<void> _save(double latitude, double longitude) async {
    final shopId = widget.profile.shopId;
    setState(() => _busy = true);
    try {
      await ref
          .read(shopProfileRepositoryProvider)
          .saveDeviceLocation(shopId, latitude: latitude, longitude: longitude);
      if (!mounted) return;
      setState(() => _busy = false);
      _show(ShopProfileMessages.saved, error: false);
      ref.invalidate(shopProfileProvider(shopId));
    } on ShopProfileForbidden {
      if (!mounted) return;
      setState(() => _busy = false);
      _show(ShopProfileMessages.forbidden);
    } on ShopInReview {
      if (!mounted) return;
      setState(() => _busy = false);
      _show(ShopProfileMessages.inReview);
    } on ShopNotFound {
      if (!mounted) return;
      setState(() => _busy = false);
      _show(ShopProfileMessages.saveFailed, fix: _Fix.retry);
    } on ApiException {
      if (!mounted) return;
      setState(() => _busy = false);
      _show(ShopProfileMessages.saveFailed, fix: _Fix.retry);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final location = widget.profile.location;
    final locationService = ref.read(locationServiceProvider);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Map location', style: textTheme.titleMedium),
          const SizedBox(height: AppSpacing.s8),
          if (location == null)
            Text(
              ShopProfileMessages.noLocation,
              style: textTheme.bodyLarge?.copyWith(
                color: AppColors.textSecondary,
              ),
            )
          else ...[
            ShopLocationMap(
              latitude: location.latitude,
              longitude: location.longitude,
              mapsEnabled: ref.watch(mapsEnabledProvider),
              shopName: widget.profile.shopName,
            ),
            const SizedBox(height: AppSpacing.s8),
            Text(
              location.source == ShopLocationSource.deviceGps
                  ? 'Set from a phone or browser location.'
                  : 'Placed on the map.',
              style: textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
          if (widget.canEdit) ...[
            const SizedBox(height: AppSpacing.s16),
            AppButton(
              label: 'Use my current location',
              loadingLabel: 'Finding your location…',
              variant: AppButtonVariant.secondary,
              icon: Icons.my_location,
              loading: _busy,
              onPressed: _useCurrentLocation,
            ),
          ],
          if (_message != null) ...[
            const SizedBox(height: AppSpacing.s12),
            AppInlineMessage(
              message: _message!,
              tone: _isError ? AppTone.error : AppTone.success,
              action: switch (_fix) {
                _Fix.none => null,
                _Fix.retry => _FixButton(
                  label: 'Try again',
                  onPressed: _busy ? null : _useCurrentLocation,
                ),
                _Fix.appSettings => _FixButton(
                  label: 'Open settings',
                  onPressed: locationService.openAppSettings,
                ),
                _Fix.locationSettings => _FixButton(
                  label: 'Turn on location',
                  onPressed: locationService.openLocationSettings,
                ),
              },
            ),
          ],
        ],
      ),
    );
  }
}

/// The action that fixes a location problem, inside the message.
class _FixButton extends StatelessWidget {
  const _FixButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: AppButton(
      label: label,
      variant: AppButtonVariant.tertiary,
      onPressed: onPressed,
    ),
  );
}
