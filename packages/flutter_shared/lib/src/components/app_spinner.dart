import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_spacing.dart';

/// Loading indicator. Pair it with visible text (see `LoadingView`).
class AppSpinner extends StatelessWidget {
  const AppSpinner({super.key, this.color}) : _small = false;

  /// The 16 px size used inside buttons.
  const AppSpinner.small({super.key, this.color}) : _small = true;

  /// Defaults to `AppColors.brandPrimary`.
  final Color? color;
  final bool _small;

  @override
  Widget build(BuildContext context) {
    final indicator = CircularProgressIndicator(
      color: color ?? AppColors.brandPrimary,
      strokeWidth: _small ? 2 : 4,
    );
    return _small
        ? SizedBox.square(dimension: AppSpacing.s16, child: indicator)
        : indicator;
  }
}
