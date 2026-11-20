import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Why the phone's position could not be read.
enum LocationProblem {
  /// Location services are switched off on the phone.
  serviceDisabled,

  /// The person declined the permission; asking again is possible.
  permissionDenied,

  /// Declined permanently; only the system settings can change it.
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
    this.accuracyMeters = 0,
  });

  final double latitude;
  final double longitude;

  /// How far off the point may be (the phone's estimate).
  final double accuracyMeters;
}

final class LocationUnavailable extends LocationResult {
  const LocationUnavailable(this.problem);

  final LocationProblem problem;
}

/// The phone's position, asked for only when the person taps "Near me" in
/// Find shops (CUS-002, approximate, never saved) or "My location" when
/// pinning a site (CUS-005, [precise]). A port so widgets are testable.
abstract interface class LocationService {
  Future<LocationResult> currentLocation({bool precise = false});

  Future<void> openAppSettings();
}

class GeolocatorLocationService implements LocationService {
  const GeolocatorLocationService();

  @override
  Future<LocationResult> currentLocation({bool precise = false}) async {
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
        locationSettings: _settings(precise),
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

  /// Approximate is enough to sort shops; a site pin needs GPS. On Android
  /// the system location manager is used, as in the Shop App (no Google
  /// consent prompt).
  static LocationSettings _settings(bool precise) {
    final accuracy = precise ? LocationAccuracy.high : LocationAccuracy.low;
    final timeLimit = Duration(seconds: precise ? 30 : 20);
    return defaultTargetPlatform == TargetPlatform.android
        ? AndroidSettings(
            accuracy: accuracy,
            timeLimit: timeLimit,
            forceLocationManager: true,
          )
        : LocationSettings(accuracy: accuracy, timeLimit: timeLimit);
  }

  @override
  Future<void> openAppSettings() => Geolocator.openAppSettings();
}
