import 'dart:math' as math;
import 'dart:ui' show Color;

import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

/// WCAG 2.x contrast ratio between two opaque colours.
double contrastRatio(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

/// WCAG AA minimum for normal-size body text.
const double wcagAaNormalText = 4.5;

void main() {
  // Text/background pairs the design system uses for readable text.
  // Disabled text is intentionally excluded (WCAG exempts inactive controls).
  final pairs = <String, (Color, Color)>{
    'text.primary on surface.default': (
      AppColors.textPrimary,
      AppColors.surfaceDefault,
    ),
    'text.primary on surface.subtle': (
      AppColors.textPrimary,
      AppColors.surfaceSubtle,
    ),
    'text.secondary on surface.default': (
      AppColors.textSecondary,
      AppColors.surfaceDefault,
    ),
    'text.secondary on surface.subtle': (
      AppColors.textSecondary,
      AppColors.surfaceSubtle,
    ),
    'white on brand.primary': (
      AppColors.surfaceDefault,
      AppColors.brandPrimary,
    ),
    'brand.primary on surface.default (links)': (
      AppColors.brandPrimary,
      AppColors.surfaceDefault,
    ),
    'brand.primaryStrong on brand.primarySoft': (
      AppColors.brandPrimaryStrong,
      AppColors.brandPrimarySoft,
    ),
    'text.primary on brand.accent': (
      AppColors.textPrimary,
      AppColors.brandAccent,
    ),
    'white on status.error': (AppColors.surfaceDefault, AppColors.statusError),
    'status.success on surface.default': (
      AppColors.statusSuccess,
      AppColors.surfaceDefault,
    ),
    'status.warning on surface.default': (
      AppColors.statusWarning,
      AppColors.surfaceDefault,
    ),
    'status.error on surface.default': (
      AppColors.statusError,
      AppColors.surfaceDefault,
    ),
    'status.info on surface.default': (
      AppColors.statusInfo,
      AppColors.surfaceDefault,
    ),
  };

  group('colour tokens meet WCAG AA contrast for normal text', () {
    pairs.forEach((name, pair) {
      test(name, () {
        final (foreground, background) = pair;
        expect(
          contrastRatio(foreground, background),
          greaterThanOrEqualTo(wcagAaNormalText),
        );
      });
    });
  });
}
