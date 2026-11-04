import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_component_tokens.dart';
import '../tokens/app_typography.dart';
import 'app_text_field.dart';

Text _title(String label, String? semanticLabel) =>
    Text(label, semanticsLabel: semanticLabel, style: AppTypography.bodyLarge);

Text? _subtitle(String? subtitle) => subtitle == null
    ? null
    : Text(
        subtitle,
        style: AppTypography.body.copyWith(color: AppColors.textSecondary),
      );

/// A labelled on/off switch row. The whole row is one touch target, and
/// [semanticLabel] (for example "4 L available") replaces the visible label
/// for screen readers when the label alone is ambiguous.
class AppSwitchRow extends StatelessWidget {
  const AppSwitchRow({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.subtitle,
    this.semanticLabel,
  });

  final String label;
  final bool value;

  /// Null disables the switch.
  final ValueChanged<bool>? onChanged;
  final String? subtitle;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      title: _title(label, semanticLabel),
      subtitle: _subtitle(subtitle),
      value: value,
      onChanged: onChanged,
      contentPadding: EdgeInsets.zero,
      minTileHeight: AppComponentTokens.controlMinHeight,
      activeThumbColor: AppComponentTokens.buttonPrimaryForeground,
      activeTrackColor: AppComponentTokens.buttonPrimaryBackground,
    );
  }
}

/// A labelled checkbox row; the whole row toggles it.
class AppCheckboxRow extends StatelessWidget {
  const AppCheckboxRow({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.subtitle,
    this.semanticLabel,
  });

  final String label;
  final bool value;

  /// Null disables the checkbox.
  final ValueChanged<bool>? onChanged;
  final String? subtitle;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final onChanged = this.onChanged;
    return CheckboxListTile(
      title: _title(label, semanticLabel),
      subtitle: _subtitle(subtitle),
      value: value,
      onChanged: onChanged == null
          ? null
          : (checked) => onChanged(checked ?? false),
      controlAffinity: ListTileControlAffinity.leading,
      contentPadding: EdgeInsets.zero,
      minTileHeight: AppComponentTokens.controlMinHeight,
      activeColor: AppComponentTokens.buttonPrimaryBackground,
    );
  }
}

/// Choose one of a few options, each a full-width row.
class AppRadioGroup<T> extends StatelessWidget {
  const AppRadioGroup({
    super.key,
    required this.label,
    required this.options,
    required this.value,
    required this.onChanged,
    this.error,
  });

  /// Spoken and shown above the options.
  final String label;
  final List<AppOption<T>> options;
  final T? value;
  final ValueChanged<T?> onChanged;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final error = this.error;
    return Semantics(
      container: true,
      label: label,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            label,
            style: AppTypography.body.copyWith(fontWeight: FontWeight.w500),
          ),
          RadioGroup<T>(
            groupValue: value,
            onChanged: onChanged,
            child: Column(
              children: [
                for (final option in options)
                  RadioListTile<T>(
                    value: option.value,
                    title: _title(option.label, null),
                    contentPadding: EdgeInsets.zero,
                    minTileHeight: AppComponentTokens.controlMinHeight,
                    activeColor: AppComponentTokens.buttonPrimaryBackground,
                  ),
              ],
            ),
          ),
          if (error != null)
            Semantics(
              liveRegion: true,
              child: Text(
                error,
                style: AppTypography.body.copyWith(
                  color: AppComponentTokens.controlBorderError,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// A row of two to four mutually exclusive options, such as Active/Archived.
class AppSegmentedControl<T> extends StatelessWidget {
  const AppSegmentedControl({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
  });

  final List<AppOption<T>> options;
  final T value;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<T>(
      segments: [
        for (final option in options)
          ButtonSegment<T>(value: option.value, label: Text(option.label)),
      ],
      selected: {value},
      onSelectionChanged: (selection) => onChanged(selection.first),
      showSelectedIcon: false,
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(
          Size.fromHeight(AppComponentTokens.controlMinHeight),
        ),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              AppComponentTokens.controlRadius,
            ),
          ),
        ),
        side: const WidgetStatePropertyAll(
          BorderSide(color: AppComponentTokens.controlBorder),
        ),
        backgroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? AppColors.brandPrimarySoft
              : AppComponentTokens.controlBackground,
        ),
        foregroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? AppColors.brandPrimaryStrong
              : AppColors.textPrimary,
        ),
        // From the theme, which adds the font family (see AppButton).
        textStyle: WidgetStatePropertyAll(
          Theme.of(context).textTheme.bodyMedium
              ?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
