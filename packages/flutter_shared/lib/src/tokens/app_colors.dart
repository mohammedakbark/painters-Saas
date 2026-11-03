import 'package:flutter/painting.dart';

/// Colour tokens from `docs/DESIGN_SYSTEM.md` (provisional).
///
/// Keep in sync with `apps/admin_web/src/app/globals.css`. Paint shade colours
/// are catalogue data and must never be added here.
abstract final class AppColors {
  static const Color brandPrimary = Color(0xFF1F4B7A);
  static const Color brandPrimaryStrong = Color(0xFF163A5F);
  static const Color brandPrimarySoft = Color(0xFFEAF1F8);

  /// Limited highlights and offers only; always use dark text on it.
  static const Color brandAccent = Color(0xFFF5B544);

  static const Color surfaceDefault = Color(0xFFFFFFFF);
  static const Color surfaceSubtle = Color(0xFFF7F9FC);
  static const Color surfaceRaised = Color(0xFFFFFFFF);

  static const Color textPrimary = Color(0xFF17212F);
  static const Color textSecondary = Color(0xFF667085);
  static const Color textDisabled = Color(0xFF98A2B3);

  static const Color borderDefault = Color(0xFFE4E7EC);
  static const Color borderStrong = Color(0xFFCBD5E1);

  // Status colours must always be paired with text or an icon.
  static const Color statusSuccess = Color(0xFF15803D);
  static const Color statusWarning = Color(0xFFB45309);
  static const Color statusError = Color(0xFFB42318);
  static const Color statusInfo = Color(0xFF2563EB);
}
