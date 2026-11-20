import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_component_tokens.dart';
import '../tokens/app_spacing.dart';
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
    this.isRequired = false,
  });

  /// Spoken and shown above the options.
  final String label;
  final List<AppOption<T>> options;
  final T? value;
  final ValueChanged<T?> onChanged;
  final String? error;

  /// Shows the required marker (a red asterisk) after the label.
  final bool isRequired;

  @override
  Widget build(BuildContext context) {
    final error = this.error;
    return Semantics(
      container: true,
      label: isRequired ? '$label, required' : label,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DefaultTextStyle.merge(
            style: AppTypography.body.copyWith(fontWeight: FontWeight.w500),
            child: ExcludeSemantics(
              child: isRequired ? appRequiredLabel(label) : Text(label),
            ),
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
        minimumSize: WidgetStatePropertyAll(
          Size.fromHeight(AppComponentTokens.controlMinHeight),
        ),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              AppComponentTokens.controlRadius,
            ),
          ),
        ),
        side: WidgetStatePropertyAll(
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

/// One of a few options that each need a sentence, shown as a large card
/// with an icon, such as Painter/Contractor or Normal Customer (CUS-001).
/// Put two or three in a column; the selected one has the primary border.
class AppChoiceCard extends StatelessWidget {
  const AppChoiceCard({
    super.key,
    required this.title,
    required this.description,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String description;
  final IconData icon;
  final bool selected;

  /// Null disables the card, for example while saving.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final radius = BorderRadius.circular(AppComponentTokens.cardRadius);
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      button: true,
      enabled: onTap != null,
      label: '$title. $description',
      excludeSemantics: true,
      child: Material(
        color: selected
            ? AppColors.brandPrimarySoft
            : AppComponentTokens.cardBackground,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: BorderSide(
            color: selected
                ? AppColors.brandPrimary
                : AppComponentTokens.cardBorder,
            width: selected ? 2 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: AppComponentTokens.controlMinHeight,
            ),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.s16),
              child: Row(
                children: [
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: selected
                          ? AppComponentTokens.cardBackground
                          : AppColors.brandPrimarySoft,
                      borderRadius: BorderRadius.circular(
                        AppComponentTokens.panelRadius,
                      ),
                    ),
                    child: SizedBox.square(
                      dimension: AppSpacing.s48,
                      child: Icon(icon, color: AppColors.brandPrimary),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.s4),
                        Text(
                          description,
                          style: textTheme.bodyMedium?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s8),
                  Icon(
                    selected
                        ? Icons.radio_button_checked
                        : Icons.radio_button_unchecked,
                    color: selected
                        ? AppColors.brandPrimary
                        : AppColors.borderStrong,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
