import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_component_tokens.dart';
import '../tokens/app_spacing.dart';
import '../tokens/app_typography.dart';

/// One chip of an [AppChoiceChips] row.
class AppChipOption<T> {
  const AppChipOption(this.value, this.label, {this.count});

  final T value;
  final String label;

  /// Shown after the label, for example "New 3".
  final int? count;
}

/// A row of mutually exclusive chips that scrolls sideways when there are too
/// many for the width, such as the order steps with their counts. Use
/// `AppSegmentedControl` for two to four short options that always fit.
class AppChoiceChips<T> extends StatelessWidget {
  const AppChoiceChips({
    super.key,
    required this.label,
    required this.options,
    required this.value,
    required this.onChanged,
    this.padding = EdgeInsets.zero,
  });

  /// Spoken name of the group, for example "Order step".
  final String label;
  final List<AppChipOption<T>> options;
  final T value;
  final ValueChanged<T> onChanged;

  /// Space before the first and after the last chip, so the row can run to
  /// the screen edge while it scrolls.
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: label,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: padding,
        child: Row(
          children: [
            for (final (index, option) in options.indexed) ...[
              if (index > 0) const SizedBox(width: AppSpacing.s8),
              _Chip(
                option: option,
                selected: option.value == value,
                onTap: () => onChanged(option.value),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Chip<T> extends StatelessWidget {
  const _Chip({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final AppChipOption<T> option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final count = option.count;
    final foreground = selected
        ? AppColors.brandPrimaryStrong
        : AppColors.textPrimary;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppComponentTokens.badgeRadius),
      side: BorderSide(
        color: selected
            ? AppColors.brandPrimary
            : AppComponentTokens.controlBorder,
      ),
    );
    return Semantics(
      button: true,
      selected: selected,
      label: count == null ? option.label : '${option.label}, $count',
      excludeSemantics: true,
      child: Material(
        color: selected
            ? AppColors.brandPrimarySoft
            : AppComponentTokens.controlBackground,
        shape: shape,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              minHeight: AppComponentTokens.controlMinHeight,
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s16),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    option.label,
                    style: AppTypography.body.copyWith(
                      color: foreground,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (count != null) ...[
                    const SizedBox(width: AppSpacing.s8),
                    Text(
                      '$count',
                      style: AppTypography.body.copyWith(
                        color: selected
                            ? AppColors.brandPrimaryStrong
                            : AppColors.textSecondary,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
