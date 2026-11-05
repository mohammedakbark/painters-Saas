import 'package:flutter/material.dart';

import '../tokens/app_component_tokens.dart';
import '../tokens/app_spacing.dart';
import 'app_spinner.dart';

/// How prominent a button is. One primary action per screen.
enum AppButtonVariant {
  /// The main action.
  primary,

  /// Other actions.
  secondary,

  /// Low-emphasis actions such as "Try again" (no background).
  tertiary,

  /// Removes or archives something.
  destructive,
}

/// Same as the web portal's `disabled:opacity-70`.
const double _disabledOpacity = 0.7;

class _ButtonColors {
  const _ButtonColors(
    this.background,
    this.hover,
    this.foreground,
    this.border,
  );

  final Color? background;
  final Color hover;
  final Color foreground;
  final Color? border;
}

_ButtonColors _colors(AppButtonVariant variant) => switch (variant) {
  AppButtonVariant.primary => const _ButtonColors(
    AppComponentTokens.buttonPrimaryBackground,
    AppComponentTokens.buttonPrimaryBackgroundHover,
    AppComponentTokens.buttonPrimaryForeground,
    null,
  ),
  AppButtonVariant.secondary => const _ButtonColors(
    AppComponentTokens.buttonSecondaryBackground,
    AppComponentTokens.buttonSecondaryBackgroundHover,
    AppComponentTokens.buttonSecondaryForeground,
    AppComponentTokens.buttonSecondaryBorder,
  ),
  AppButtonVariant.tertiary => const _ButtonColors(
    null,
    AppComponentTokens.buttonTertiaryBackgroundHover,
    AppComponentTokens.buttonTertiaryForeground,
    null,
  ),
  AppButtonVariant.destructive => const _ButtonColors(
    AppComponentTokens.buttonDestructiveBackground,
    AppComponentTokens.buttonDestructiveBackgroundHover,
    AppComponentTokens.buttonDestructiveForeground,
    null,
  ),
};

/// The project's button (D-039). Colours, radius and height come from
/// `AppComponentTokens`, so every button changes with the tokens.
///
/// While [loading] it shows a spinner and [loadingLabel], and ignores taps.
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.loading = false,
    this.loadingLabel,
    this.expand = false,
  });

  final String label;

  /// Null disables the button.
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool loading;
  final String? loadingLabel;

  /// Take the full available width.
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final colors = _colors(variant);
    final enabled = onPressed != null && !loading;
    final style = ButtonStyle(
      minimumSize: const WidgetStatePropertyAll(
        Size(
          AppComponentTokens.controlMinHeight,
          AppComponentTokens.controlMinHeight,
        ),
      ),
      padding: const WidgetStatePropertyAll(
        EdgeInsets.symmetric(horizontal: AppSpacing.s20),
      ),
      shape: WidgetStatePropertyAll(
        RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppComponentTokens.buttonRadius),
          side: colors.border == null
              ? BorderSide.none
              : BorderSide(color: colors.border!),
        ),
      ),
      backgroundColor: WidgetStatePropertyAll(colors.background),
      foregroundColor: WidgetStatePropertyAll(colors.foreground),
      overlayColor: WidgetStateProperty.resolveWith(
        (states) =>
            states.contains(WidgetState.hovered) ||
                states.contains(WidgetState.pressed) ||
                states.contains(WidgetState.focused)
            ? colors.hover
            : null,
      ),
      // From the theme, which adds the font family: a button's text style
      // replaces the inherited one instead of merging with it.
      textStyle: WidgetStatePropertyAll(
        Theme.of(context).textTheme.bodyLarge
            ?.copyWith(fontWeight: FontWeight.w600),
      ),
      tapTargetSize: MaterialTapTargetSize.padded,
    );

    final text = Text(loading ? (loadingLabel ?? label) : label);
    final leading = loading
        ? AppSpinner.small(color: colors.foreground)
        : icon == null
        ? null
        : Icon(icon, size: AppSpacing.s20);

    Widget button = TextButton(
      onPressed: enabled ? onPressed : null,
      style: style,
      child: leading == null
          ? text
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                leading,
                const SizedBox(width: AppSpacing.s8),
                Flexible(child: text),
              ],
            ),
    );
    if (!enabled) {
      button = Opacity(opacity: _disabledOpacity, child: button);
    }
    if (expand) {
      button = SizedBox(width: double.infinity, child: button);
    }
    return Semantics(liveRegion: loading, child: button);
  }
}
