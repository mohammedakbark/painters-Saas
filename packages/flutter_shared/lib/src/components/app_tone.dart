import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';

/// The meaning of a badge, inline message or snack bar. Always paired with
/// text; colour only supports it.
enum AppTone {
  neutral,
  info,
  success,
  warning,
  error;

  /// Text and border colour for this tone on a light surface.
  Color get color => switch (this) {
    AppTone.neutral => AppColors.textSecondary,
    AppTone.info => AppColors.statusInfo,
    AppTone.success => AppColors.statusSuccess,
    AppTone.warning => AppColors.statusWarning,
    AppTone.error => AppColors.statusError,
  };

  /// Border colour; the neutral tone uses the strong border.
  Color get borderColor =>
      this == AppTone.neutral ? AppColors.borderStrong : color;

  IconData get icon => switch (this) {
    AppTone.neutral || AppTone.info => Icons.info_outline,
    AppTone.success => Icons.check_circle_outline,
    AppTone.warning => Icons.warning_amber_outlined,
    AppTone.error => Icons.error_outline,
  };

  /// Spoken before the message, so the tone is never colour-only.
  String get label => switch (this) {
    AppTone.neutral || AppTone.info => 'Information',
    AppTone.success => 'Success',
    AppTone.warning => 'Warning',
    AppTone.error => 'Error',
  };
}
