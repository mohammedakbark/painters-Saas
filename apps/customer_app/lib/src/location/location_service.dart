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
  const LocationFound({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;
}

final class LocationUnavailable extends LocationResult {
  const LocationUnavailable(this.problem);

  final LocationProblem problem;
}

/// The phone's approximate position, asked for only when the person taps
/// "Near me" in Find shops (CUS-002). It is sent to the API only to sort
/// shops and is never saved. A port so widgets are testable.
abstract interface class LocationService {
  Future<LocationResult> currentLocation();

  Future<void> openAppSettings();
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

  /// Approximate is enough to sort shops. On Android the system location
  /// manager is used, as in the Shop App (no Google consent prompt).
  static LocationSettings get _settings {
    const timeLimit = Duration(seconds: 20);
    return defaultTargetPlatform == TargetPlatform.android
        ? AndroidSettings(
            accuracy: LocationAccuracy.low,
            timeLimit: timeLimit,
            forceLocationManager: true,
          )
        : const LocationSettings(
            accuracy: LocationAccuracy.low,
            timeLimit: timeLimit,
          );
  }

  @override
  Future<void> openAppSettings() => Geolocator.openAppSettings();
}
