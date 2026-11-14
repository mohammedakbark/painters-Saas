import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_component_tokens.dart';
import '../tokens/app_spacing.dart';
import '../tokens/app_typography.dart';

/// Background of an [AppCard].
enum AppCardTone {
  /// The card background.
  normal,

  /// A muted placeholder, such as "Map not available".
  subtle,
}

/// The standard bordered surface (D-039). Radius, border and background come
/// from `AppComponentTokens.card*`. Content is clipped to the rounded shape,
/// so images and maps can sit flush inside with `padding: EdgeInsets.zero`.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.s16),
    this.onTap,
    this.tone = AppCardTone.normal,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  /// Makes the whole card one touch target.
  final VoidCallback? onTap;
  final AppCardTone tone;

  @override
  Widget build(BuildContext context) {
    final content = Padding(padding: padding, child: child);
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      color: tone == AppCardTone.subtle
          ? AppColors.surfaceSubtle
          : AppComponentTokens.cardBackground,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppComponentTokens.cardRadius),
        side: const BorderSide(color: AppComponentTokens.cardBorder),
      ),
      child: onTap == null ? content : InkWell(onTap: onTap, child: content),
    );
  }
}

/// A card with a title and either text [lines] or a [child].
class AppSection extends StatelessWidget {
  const AppSection({
    super.key,
    required this.title,
    this.lines = const [],
    this.muted = false,
    this.child,
  });

  final String title;
  final List<String> lines;

  /// Show the lines in the secondary text colour (for "Not added yet").
  final bool muted;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final child = this.child;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text(
              title,
              style: AppTypography.bodyLarge.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.s8),
          for (final line in lines)
            Text(
              line,
              style: AppTypography.bodyLarge.copyWith(
                color: muted ? AppColors.textSecondary : null,
              ),
            ),
          ?child,
        ],
      ),
    );
  }
}

/// One figure on a dashboard, such as "New 3": a small label over a large
/// value. With [onTap] the whole tile opens the list behind the figure.
class AppStatTile extends StatelessWidget {
  const AppStatTile({
    super.key,
    required this.label,
    required this.value,
    this.onTap,
  });

  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: onTap != null,
      label: '$label: $value',
      excludeSemantics: true,
      child: AppCard(
        onTap: onTap,
        padding: const EdgeInsets.all(AppSpacing.s12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: AppTypography.body.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.s4),
            Text(
              value,
              style: AppTypography.heading3.copyWith(
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A card that opens another screen: optional icon, title, subtitle and a
/// chevron.
class AppNavRow extends StatelessWidget {
  const AppNavRow({
    super.key,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.icon,
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final subtitle = this.subtitle;
    return AppCard(
      padding: EdgeInsets.zero,
      child: ListTile(
        minTileHeight: AppComponentTokens.controlMinHeight + AppSpacing.s16,
        leading: icon == null
            ? null
            : Icon(icon, color: AppColors.textSecondary),
        title: Text(
          title,
          style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.w500),
        ),
        subtitle: subtitle == null
            ? null
            : Text(
                subtitle,
                style: AppTypography.body.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
