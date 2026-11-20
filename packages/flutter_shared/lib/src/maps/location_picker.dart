import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_spacing.dart';
import '../tokens/app_typography.dart';
import 'shop_location_map.dart';

/// Where the map opens when nothing is chosen yet: Kerala, the first market.
const double defaultPickerLatitude = 10.5;
const double defaultPickerLongitude = 76.2;

/// Choose a point by moving the map under a fixed pin (CUS-005, D-049), for
/// example a painter's site. Fills its parent; use it on a full screen so the
/// map's drags never fight a scrolling page. When the parent passes a new
/// [latitude] and [longitude] (such as the phone's location) the map moves
/// there. With [mapsEnabled] false it shows the coordinates only.
class AppLocationPicker extends StatefulWidget {
  const AppLocationPicker({
    super.key,
    required this.latitude,
    required this.longitude,
    required this.onChanged,
    this.mapsEnabled = true,
  });

  /// Null opens the map over [defaultPickerLatitude], zoomed out.
  final double? latitude;
  final double? longitude;

  /// The point under the pin, after each move of the map.
  final void Function(double latitude, double longitude) onChanged;
  final bool mapsEnabled;

  @override
  State<AppLocationPicker> createState() => _AppLocationPickerState();
}

class _AppLocationPickerState extends State<AppLocationPicker> {
  final _map = MapController();
  LatLng? _lastEmitted;

  LatLng? get _given {
    final latitude = widget.latitude;
    final longitude = widget.longitude;
    return latitude == null || longitude == null
        ? null
        : LatLng(latitude, longitude);
  }

  @override
  void didUpdateWidget(AppLocationPicker old) {
    super.didUpdateWidget(old);
    final given = _given;
    // A point from outside (not one this map reported): move there.
    if (widget.mapsEnabled && given != null && given != _lastEmitted) {
      _map.move(given, 17);
    }
  }

  @override
  Widget build(BuildContext context) {
    final given = _given;
    if (!widget.mapsEnabled) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.s24),
          child: Text(
            given == null
                ? 'Map not available in this build.'
                : 'Pin: ${formatCoordinates(given.latitude, given.longitude)}',
            textAlign: TextAlign.center,
            style: AppTypography.bodyLarge.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
      );
    }
    return Semantics(
      label:
          'Map. Move it until the pin is on the place.'
          '${given == null ? '' : ' Pin at ${formatCoordinates(given.latitude, given.longitude)}.'}',
      child: Stack(
        alignment: Alignment.center,
        children: [
          FlutterMap(
            mapController: _map,
            options: MapOptions(
              initialCenter:
                  given ??
                  const LatLng(defaultPickerLatitude, defaultPickerLongitude),
              initialZoom: given == null ? 7 : 17,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
              ),
              onPositionChanged: (camera, hasGesture) {
                if (!hasGesture) return;
                _lastEmitted = camera.center;
                widget.onChanged(
                  camera.center.latitude,
                  camera.center.longitude,
                );
              },
            ),
            children: [
              TileLayer(
                urlTemplate: osmTileUrl,
                userAgentPackageName: osmUserAgentPackage,
              ),
              const SimpleAttributionWidget(
                source: Text('OpenStreetMap contributors'),
              ),
            ],
          ),
          // The pin's point sits on the centre of the map.
          IgnorePointer(
            child: Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.s40),
              child: Icon(
                Icons.location_on,
                size: AppSpacing.s48,
                color: AppColors.brandPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
