import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final theme = AppTheme.light();

  group('AppTheme.light', () {
    test('uses the brand colour scheme in light mode', () {
      expect(theme.useMaterial3, isTrue);
      expect(theme.brightness, Brightness.light);
      expect(theme.colorScheme.primary, AppColors.brandPrimary);
      expect(theme.colorScheme.onSurface, AppColors.textPrimary);
      expect(theme.colorScheme.error, AppColors.statusError);
      expect(theme.scaffoldBackgroundColor, AppColors.surfaceSubtle);
    });

    test('does not tint elevated surfaces', () {
      expect(theme.colorScheme.surfaceTint.a, 0);
    });

    test('uses the bundled Inter font from flutter_shared', () {
      expect(
        theme.textTheme.bodyMedium?.fontFamily,
        'packages/flutter_shared/Inter',
      );
      expect(
        theme.textTheme.headlineLarge?.fontFamily,
        'packages/flutter_shared/Inter',
      );
    });

    test('maps text styles to the design-system sizes', () {
      final textTheme = theme.textTheme;
      expect(textTheme.displaySmall?.fontSize, 32);
      expect(textTheme.headlineLarge?.fontSize, 28);
      expect(textTheme.headlineMedium?.fontSize, 24);
      expect(textTheme.headlineSmall?.fontSize, 20);
      expect(textTheme.titleLarge?.fontSize, 18);
      expect(textTheme.bodyLarge?.fontSize, 16);
      expect(textTheme.bodyMedium?.fontSize, 14);
      expect(textTheme.bodySmall?.fontSize, 12);
    });

    test('never uses a text size outside the token scale', () {
      final tokenSizes = {32.0, 28.0, 24.0, 20.0, 18.0, 16.0, 14.0, 12.0};
      final textTheme = theme.textTheme;
      final styles = [
        textTheme.displayLarge,
        textTheme.displayMedium,
        textTheme.displaySmall,
        textTheme.headlineLarge,
        textTheme.headlineMedium,
        textTheme.headlineSmall,
        textTheme.titleLarge,
        textTheme.titleMedium,
        textTheme.titleSmall,
        textTheme.bodyLarge,
        textTheme.bodyMedium,
        textTheme.bodySmall,
        textTheme.labelLarge,
        textTheme.labelMedium,
        textTheme.labelSmall,
      ];
      for (final style in styles) {
        expect(tokenSizes, contains(style?.fontSize));
      }
    });

    test('uses radius tokens for cards and buttons', () {
      final cardShape = theme.cardTheme.shape! as RoundedRectangleBorder;
      expect(cardShape.borderRadius, BorderRadius.circular(AppRadius.large));
      final buttonShape =
          theme.filledButtonTheme.style!.shape!.resolve({})!
              as RoundedRectangleBorder;
      expect(buttonShape.borderRadius, BorderRadius.circular(AppRadius.pill));
    });
  });
}
