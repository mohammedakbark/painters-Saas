import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../components/app_card.dart';
import '../tokens/app_colors.dart';
import '../tokens/app_spacing.dart';

/// "9.965812, 76.289877" (6 decimals, about 0.1 m), as stored by the API.
String formatCoordinates(double latitude, double longitude) =>
    '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';

/// OpenStreetMap's standard tiles (SHP-006, D-041). A free community service:
/// the attribution must be shown, and heavy use needs a hosted provider, which
/// is changed here and in the web portal's `lib/maps/openstreetmap.ts` (D-028).
const String osmTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/// Identifies the apps to the tile server, as its usage policy asks.
/// Update with the final app IDs (question 41).
const String osmUserAgentPackage = 'app.sevenpalette';

/// A shop's location on a map (D-027, D-041). Used by the Shop App profile
/// and, later, the Customer App's shop page.
///
/// The only place the apps draw a map, so the provider can be changed here
/// (D-028). When [mapsEnabled] is false (tests, or a build without network
/// maps) it shows the coordinates instead.
class ShopLocationMap extends StatelessWidget {
  const ShopLocationMap({
    super.key,
    required this.latitude,
    required this.longitude,
    this.mapsEnabled = true,
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
      label: shopName == null
          ? 'Map showing the shop location, $coordinates'
          : 'Map showing $shopName, $coordinates',
      child: AppCard(
        padding: EdgeInsets.zero,
        child: SizedBox(
          height: height,
          child: FlutterMap(
            options: MapOptions(
              initialCenter: position,
              initialZoom: 16,
              // A static preview: scrolling the page never pans it.
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.none,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: osmTileUrl,
                userAgentPackageName: osmUserAgentPackage,
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: position,
                    width: 28,
                    height: 28,
                    child: const _ShopPin(),
                  ),
                ],
              ),
              const SimpleAttributionWidget(
                source: Text('OpenStreetMap contributors'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The shop pin: a teal dot with a white ring, as on the web map.
class _ShopPin extends StatelessWidget {
  const _ShopPin();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.brandPrimary,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.surfaceDefault, width: 4),
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
