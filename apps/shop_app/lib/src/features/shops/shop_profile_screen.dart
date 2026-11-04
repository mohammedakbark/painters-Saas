import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../location/location_service.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../../shops/shop_profile.dart';
import 'sign_out_button.dart';

/// User-facing messages of the profile screen (also used by tests).
abstract final class ShopProfileMessages {
  static const notAdded = 'Not added yet. Add it on the web portal.';
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
      'it, withdraw the submission on the web portal.';
  static const outsideIndia =
      'This location is outside India. Stand at the shop and try again.';
  static const saved = 'Shop location saved.';
  static const forbidden = 'Only the shop owner can change the location.';
  static const saveFailed = "We couldn't save the location. Try again.";
}

/// The shop's support mobile, address and map location (SHP-003). The owner
/// can set the location from the phone; the rest is edited on the web.
class ShopProfileScreen extends ConsumerWidget {
  const ShopProfileScreen({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(shopProfileProvider(shopId));
    final isOwner = ref.watch(shopProvider(shopId)).value?.myRole == 'MASTER';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shop profile'),
        actions: const [SignOutButton()],
      ),
      body: SafeArea(
        child: profile.when(
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
          data: (profile) =>
              _ProfileDetails(profile: profile, isOwner: isOwner),
        ),
      ),
    );
  }
}

class _ProfileDetails extends StatelessWidget {
  const _ProfileDetails({required this.profile, required this.isOwner});

  final ShopProfile profile;
  final bool isOwner;

  @override
  Widget build(BuildContext context) {
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
        const SizedBox(height: AppSpacing.s24),
        _PhotoSection(photo: profile.photo),
        const SizedBox(height: AppSpacing.s16),
        AppSection(
          title: 'Address',
          lines: address?.lines ?? const [ShopProfileMessages.notAdded],
          muted: address == null,
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
        ),
        const SizedBox(height: AppSpacing.s16),
        _LocationSection(profile: profile, isOwner: isOwner),
      ],
    );
  }
}

/// The shop photo, uploaded on the web portal (SHP-004).
class _PhotoSection extends StatelessWidget {
  const _PhotoSection({required this.photo});

  final ShopPhoto? photo;

  @override
  Widget build(BuildContext context) {
    final photo = this.photo;
    if (photo == null) {
      return const AppSection(
        title: 'Shop photo',
        lines: [ShopProfileMessages.notAdded],
        muted: true,
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
            child: Text(
              'Shop photo',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
        ],
      ),
    );
  }
}

/// The map, and "Use my current location" for the owner.
class _LocationSection extends ConsumerStatefulWidget {
  const _LocationSection({required this.profile, required this.isOwner});

  final ShopProfile profile;
  final bool isOwner;

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
          if (widget.isOwner) ...[
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
