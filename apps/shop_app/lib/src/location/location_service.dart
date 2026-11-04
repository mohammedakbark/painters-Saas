import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Why the device's location could not be read.
enum LocationProblem {
  /// Location services (GPS) are switched off on the device.
  serviceDisabled,

  /// The user declined the permission; asking again is possible.
  permissionDenied,

  /// The user declined permanently; only the system settings can change it.
  permissionDeniedForever,

  /// Timed out or failed for another reason.
  failed,
}

sealed class LocationResult {
  const LocationResult();
}

final class LocationFound extends LocationResult {
  const LocationFound({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
  });

  final double latitude;
  final double longitude;
  final double accuracyMeters;
}

final class LocationUnavailable extends LocationResult {
  const LocationUnavailable(this.problem);

  final LocationProblem problem;
}

/// The device's current location, asked for only when the owner taps
/// "Use my current location" (SHP-003). A port so widgets are testable.
abstract interface class LocationService {
  Future<LocationResult> currentLocation();

  Future<void> openAppSettings();

  Future<void> openLocationSettings();
}

class GeolocatorLocationService implements LocationService {
  const GeolocatorLocationService();

  @override
  Future<LocationResult> currentLocation() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return const LocationUnavailable(LocationProblem.serviceDisabled);
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    switch (permission) {
      case LocationPermission.denied:
        return const LocationUnavailable(LocationProblem.permissionDenied);
      case LocationPermission.deniedForever:
        return const LocationUnavailable(
          LocationProblem.permissionDeniedForever,
        );
      case LocationPermission.whileInUse:
      case LocationPermission.always:
      case LocationPermission.unableToDetermine:
        break;
    }
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: _settings,
      );
      return LocationFound(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
      );
    } on LocationServiceDisabledException {
      return const LocationUnavailable(LocationProblem.serviceDisabled);
    } on TimeoutException {
      return const LocationUnavailable(LocationProblem.failed);
    } on Exception catch (error) {
      // Debug builds only, and only the error type: never coordinates.
      if (kDebugMode) {
        debugPrint('Location request failed: ${error.runtimeType}');
      }
      return const LocationUnavailable(LocationProblem.failed);
    }
  }

  /// On Android the system LocationManager (GPS) is used instead of Google
  /// Play services' fused provider: the fused provider shows Google's
  /// "Location Accuracy" consent prompt, and when the owner declines it the
  /// request hangs until the time limit (seen on the emulator, SHP-003).
  /// The system provider needs no extra consent or Google dependency (D-028).
  /// GPS can take longer indoors, hence the longer limit.
  static LocationSettings get _settings {
    const timeLimit = Duration(seconds: 30);
    return defaultTargetPlatform == TargetPlatform.android
        ? AndroidSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: timeLimit,
            forceLocationManager: true,
          )
        : const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: timeLimit,
          );
  }

  @override
  Future<void> openAppSettings() => Geolocator.openAppSettings();

  @override
  Future<void> openLocationSettings() => Geolocator.openLocationSettings();
}

/// A device location less precise than this is not used as the shop pin.
/// Phones with GPS are usually within 5–50 m. Same limit as the web portal.
const maxLocationAccuracyMeters = 500.0;

/// Same bounding box as the API (initial market: India).
bool isInIndia(double latitude, double longitude) =>
    latitude >= 6 && latitude <= 38 && longitude >= 68 && longitude <= 98;
