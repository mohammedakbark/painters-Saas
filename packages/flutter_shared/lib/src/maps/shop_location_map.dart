import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../components/app_card.dart';
import '../tokens/app_colors.dart';
import '../tokens/app_spacing.dart';

/// "9.965812, 76.289877" (6 decimals, about 0.1 m), as stored by the API.
String formatCoordinates(double latitude, double longitude) =>
    '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';

/// A shop's location on a map (D-027). Used by the Shop App profile and,
/// later, the Customer App's shop page.
///
/// The only place the apps use Google Maps, so the map provider can be
/// changed here (D-028). When the build has no Maps key ([mapsEnabled] is
/// false) it shows the coordinates instead of a blank map.
class ShopLocationMap extends StatelessWidget {
  const ShopLocationMap({
    super.key,
    required this.latitude,
    required this.longitude,
    required this.mapsEnabled,
    this.shopName,
    this.height = 200,
  });

  final double latitude;
  final double longitude;
  final bool mapsEnabled;
  final String? shopName;
  final double height;

  @override
  Widget build(BuildContext context) {
    final coordinates = formatCoordinates(latitude, longitude);
    if (!mapsEnabled) {
      return _MapUnavailable(coordinates: coordinates, height: height);
    }
    final position = LatLng(latitude, longitude);
    return Semantics(
      label: 'Map showing the shop location, $coordinates',
      child: AppCard(
        padding: EdgeInsets.zero,
        child: SizedBox(
          height: height,
          child: GoogleMap(
            initialCameraPosition: CameraPosition(target: position, zoom: 16),
            markers: {
              Marker(
                markerId: const MarkerId('shop'),
                position: position,
                infoWindow: InfoWindow(title: shopName),
              ),
            },
            // A static preview: cheaper, and scrolling the page never pans it.
            liteModeEnabled: true,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            myLocationButtonEnabled: false,
          ),
        ),
      ),
    );
  }
}

class _MapUnavailable extends StatelessWidget {
  const _MapUnavailable({required this.coordinates, required this.height});

  final String coordinates;
  final double height;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: height / 2),
      child: AppCard(
        tone: AppCardTone.subtle,
        child: Row(
          children: [
            const Icon(Icons.map_outlined, color: AppColors.textSecondary),
            const SizedBox(width: AppSpacing.s12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Map not available in this build',
                    style: textTheme.titleSmall,
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  Text(
                    'Pin: $coordinates',
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
