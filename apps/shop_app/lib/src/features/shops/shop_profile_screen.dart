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
                  action: OutlinedButton(
                    onPressed: () => context.go('/shops'),
                    child: const Text('Go to your shops'),
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
        _Section(
          title: 'Address',
          lines: address?.lines ?? const [ShopProfileMessages.notAdded],
          muted: address == null,
        ),
        const SizedBox(height: AppSpacing.s16),
        _Section(
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
      return const _Section(
        title: 'Shop photo',
        lines: [ShopProfileMessages.notAdded],
        muted: true,
      );
    }
    final textTheme = Theme.of(context).textTheme;
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 4 / 3,
            child: Image.network(
              photo.url,
              fit: BoxFit.cover,
              semanticLabel: 'Shop photo',
              loadingBuilder: (context, child, progress) => progress == null
                  ? child
                  : const Center(child: CircularProgressIndicator()),
              errorBuilder: (context, error, stackTrace) => ColoredBox(
                color: AppColors.surfaceSubtle,
                child: Center(
                  child: Text(
                    ShopProfileMessages.photoFailed,
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.s16),
            child: Text('Shop photo', style: textTheme.titleMedium),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.lines,
    this.muted = false,
  });

  final String title;
  final List<String> lines;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.s16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: textTheme.titleMedium),
            const SizedBox(height: AppSpacing.s8),
            for (final line in lines)
              Text(
                line,
                style: textTheme.bodyLarge?.copyWith(
                  color: muted ? AppColors.textSecondary : null,
                ),
              ),
          ],
        ),
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
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Save this as the shop location?'),
        content: SingleChildScrollView(
          child: Column(
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
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Save location'),
          ),
        ],
      ),
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
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.s16),
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
              OutlinedButton.icon(
                onPressed: _busy ? null : _useCurrentLocation,
                icon: _busy
                    ? const SizedBox.square(
                        dimension: AppSpacing.s16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.my_location),
                label: Text(
                  _busy ? 'Finding your location…' : 'Use my current location',
                ),
              ),
            ],
            if (_message != null) ...[
              const SizedBox(height: AppSpacing.s12),
              Semantics(
                liveRegion: true,
                child: Text(
                  _message!,
                  style: textTheme.bodyMedium?.copyWith(
                    color: _isError
                        ? AppColors.statusError
                        : AppColors.statusSuccess,
                  ),
                ),
              ),
              switch (_fix) {
                _Fix.none => const SizedBox.shrink(),
                _Fix.retry => Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: _busy ? null : _useCurrentLocation,
                    child: const Text('Try again'),
                  ),
                ),
                _Fix.appSettings => Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: locationService.openAppSettings,
                    child: const Text('Open settings'),
                  ),
                ),
                _Fix.locationSettings => Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: locationService.openLocationSettings,
                    child: const Text('Turn on location'),
                  ),
                ),
              },
            ],
          ],
        ),
      ),
    );
  }
}
