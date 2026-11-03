import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_radius.dart';
import '../tokens/app_typography.dart';

/// Material 3 theme built only from design-system tokens.
///
/// Light theme only for now (see `docs/DESIGN_SYSTEM.md`). Component themes
/// set shape and colour defaults; they do not define product components.
abstract final class AppTheme {
  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.brandPrimary,
    onPrimary: AppColors.surfaceDefault,
    primaryContainer: AppColors.brandPrimarySoft,
    onPrimaryContainer: AppColors.brandPrimaryStrong,
    secondary: AppColors.brandAccent,
    onSecondary: AppColors.textPrimary,
    // Selected/highlight backgrounds use primarySoft, not the accent.
    secondaryContainer: AppColors.brandPrimarySoft,
    onSecondaryContainer: AppColors.brandPrimaryStrong,
    error: AppColors.statusError,
    onError: AppColors.surfaceDefault,
    surface: AppColors.surfaceDefault,
    onSurface: AppColors.textPrimary,
    onSurfaceVariant: AppColors.textSecondary,
    outline: AppColors.borderStrong,
    outlineVariant: AppColors.borderDefault,
    // Material 3 tints elevated surfaces with `primary` by default. The design
    // system prefers flat surfaces with subtle borders, so disable the tint.
    surfaceTint: Color(0x00000000),
  );

  static ThemeData light() {
    final controlShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.medium),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: lightColorScheme,
      fontFamily: AppTypography.fontFamily,
      package: AppTypography.fontPackage,
      textTheme: AppTypography.textTheme,
      scaffoldBackgroundColor: AppColors.surfaceSubtle,
      disabledColor: AppColors.textDisabled,
      dividerTheme: const DividerThemeData(
        color: AppColors.borderDefault,
        space: 1,
        thickness: 1,
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceRaised,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.large),
          side: const BorderSide(color: AppColors.borderDefault),
        ),
      ),
      inputDecorationTheme: InputDecorationThemeData(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.medium),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(shape: controlShape),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(shape: controlShape),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(shape: controlShape),
      ),
    );
  }
}
