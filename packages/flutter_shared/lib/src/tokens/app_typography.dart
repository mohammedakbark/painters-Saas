import 'package:flutter/material.dart';

/// Typography tokens from `docs/DESIGN_SYSTEM.md`.
///
/// Where the design system lists a weight range (for example 600/700), the
/// first value is used. The font family is applied by `AppTheme`, so these
/// styles deliberately leave `fontFamily` unset.
abstract final class AppTypography {
  /// Inter is bundled in this package (see `pubspec.yaml`).
  static const String fontFamily = 'Inter';
  static const String fontPackage = 'flutter_shared';

  static const TextStyle display = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.w700,
  );
  static const TextStyle heading1 = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
  );
  static const TextStyle heading2 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600,
  );
  static const TextStyle heading3 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
  );
  static const TextStyle title = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
  );
  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
  );
  static const TextStyle body = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
  );
  static const TextStyle caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
  );

  /// Maps the design tokens onto Material 3 text-theme slots so standard
  /// widgets use only token sizes. Material slots without a matching token
  /// (larger displays, titles, labels) reuse the closest token.
  static TextTheme get textTheme => TextTheme(
    displayLarge: display,
    displayMedium: display,
    displaySmall: display,
    headlineLarge: heading1,
    headlineMedium: heading2,
    headlineSmall: heading3,
    titleLarge: title,
    titleMedium: bodyLarge.copyWith(fontWeight: FontWeight.w500),
    titleSmall: body.copyWith(fontWeight: FontWeight.w500),
    bodyLarge: bodyLarge,
    bodyMedium: body,
    bodySmall: caption,
    labelLarge: body.copyWith(fontWeight: FontWeight.w500),
    labelMedium: caption.copyWith(fontWeight: FontWeight.w500),
    labelSmall: caption.copyWith(fontWeight: FontWeight.w500),
  );
}
