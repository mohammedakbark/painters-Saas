import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_component_tokens.dart';
import '../tokens/app_spacing.dart';
import '../tokens/app_typography.dart';
import 'app_spinner.dart';
import 'app_tone.dart';

/// A short status label, such as "Live" or "Unavailable". The text carries
/// the meaning; the colour only supports it.
class AppBadge extends StatelessWidget {
  const AppBadge({super.key, required this.label, this.tone = AppTone.neutral});

  final String label;
  final AppTone tone;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppComponentTokens.badgeBackground,
        borderRadius: BorderRadius.circular(AppComponentTokens.badgeRadius),
        border: Border.all(color: tone.borderColor),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s12,
          vertical: AppSpacing.s4,
        ),
        child: Text(
          label,
          style: AppTypography.caption.copyWith(
            color: tone.color,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

/// An inline message box, like the web portal's `Alert`: a coloured edge, an
/// optional title and the message. It is announced when it appears.
class AppInlineMessage extends StatelessWidget {
  const AppInlineMessage({
    super.key,
    required this.message,
    this.tone = AppTone.info,
    this.title,
    this.action,
  });

  final String message;
  final AppTone tone;
  final String? title;

  /// For example a "Try again" button.
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final title = this.title;
    final action = this.action;
    return Semantics(
      liveRegion: true,
      container: true,
      label: '${tone.label}.',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppComponentTokens.inlineMessageBackground,
          borderRadius: BorderRadius.circular(
            AppComponentTokens.inlineMessageRadius,
          ),
          border: Border.all(color: AppComponentTokens.inlineMessageBorder),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(
            AppComponentTokens.inlineMessageRadius,
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ColoredBox(
                  color: tone.borderColor,
                  child: const SizedBox(width: AppSpacing.s4),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.s16,
                      vertical: AppSpacing.s12,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (title != null) ...[
                          Text(
                            title,
                            style: AppTypography.body.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.s4),
                        ],
                        Text(message, style: AppTypography.body),
                        ?action,
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Shows a short confirmation at the bottom of the screen, replacing any
/// current one. Use [AppInlineMessage] for errors the user must act on.
void showAppSnackBar(
  BuildContext context,
  String message, {
  AppTone tone = AppTone.success,
  String? actionLabel,
  VoidCallback? onAction,
}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppComponentTokens.snackbarBackground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(
            AppComponentTokens.snackbarRadius,
          ),
        ),
        content: Row(
          children: [
            Icon(
              tone.icon,
              color: AppComponentTokens.snackbarForeground,
              semanticLabel: tone.label,
            ),
            const SizedBox(width: AppSpacing.s12),
            Expanded(
              child: Text(
                message,
                style: AppTypography.body.copyWith(
                  color: AppComponentTokens.snackbarForeground,
                ),
              ),
            ),
          ],
        ),
        action: actionLabel == null || onAction == null
            ? null
            : SnackBarAction(
                label: actionLabel,
                textColor: AppComponentTokens.snackbarAction,
                onPressed: onAction,
              ),
      ),
    );
}

/// A network image with loading and error states. Used for shop and product
/// photos (pre-sized WebP from object storage).
class AppNetworkImage extends StatelessWidget {
  const AppNetworkImage({
    super.key,
    required this.url,
    required this.semanticLabel,
    this.errorMessage = "The image couldn't be loaded.",
    this.fit = BoxFit.cover,
    this.rounded = false,
  });

  final String url;
  final String semanticLabel;
  final String errorMessage;
  final BoxFit fit;

  /// Round the corners with the image radius (for thumbnails outside a card).
  final bool rounded;

  @override
  Widget build(BuildContext context) {
    final image = Image.network(
      url,
      fit: fit,
      semanticLabel: semanticLabel,
      loadingBuilder: (context, child, progress) =>
          progress == null ? child : const Center(child: AppSpinner()),
      errorBuilder: (context, error, stackTrace) => ColoredBox(
        color: AppColors.surfaceSubtle,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.s8),
            child: Text(
              errorMessage,
              textAlign: TextAlign.center,
              style: AppTypography.body.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ),
      ),
    );
    return rounded
        ? ClipRRect(
            borderRadius: BorderRadius.circular(AppComponentTokens.imageRadius),
            child: image,
          )
        : image;
  }
}
