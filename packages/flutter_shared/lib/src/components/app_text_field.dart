import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_component_tokens.dart';
import '../tokens/app_spacing.dart';

OutlineInputBorder _border(Color color, {double width = 1}) =>
    OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppComponentTokens.controlRadius),
      borderSide: BorderSide(color: color, width: width),
    );

/// The label of a required field: the name and a red asterisk. Screen
/// readers hear the name and "required" instead of "star".
Widget appRequiredLabel(String label) => Text.rich(
  TextSpan(
    text: label,
    children: const [
      TextSpan(
        text: ' *',
        semanticsLabel: ', required',
        style: TextStyle(
          color: AppColors.statusError,
          fontWeight: FontWeight.w600,
        ),
      ),
    ],
  ),
);

/// The decoration every text field and dropdown uses (D-039): label always
/// visible (with a red asterisk when [isRequired]), helper and error text,
/// radius and colours from the tokens.
InputDecoration appInputDecoration({
  required String label,
  bool isRequired = false,
  String? hint,
  String? helper,
  String? error,
  String? prefixText,
  Widget? prefixIcon,
  Widget? suffixIcon,
  String? counterText,
}) => InputDecoration(
  labelText: isRequired ? null : label,
  label: isRequired ? appRequiredLabel(label) : null,
  hintText: hint,
  helperText: helper,
  helperMaxLines: 3,
  errorText: error,
  errorMaxLines: 3,
  prefixText: prefixText,
  prefixIcon: prefixIcon,
  suffixIcon: suffixIcon,
  counterText: counterText,
  filled: true,
  fillColor: AppComponentTokens.controlBackground,
  constraints: const BoxConstraints(
    minHeight: AppComponentTokens.controlMinHeight,
  ),
  border: _border(AppComponentTokens.controlBorder),
  enabledBorder: _border(AppComponentTokens.controlBorder),
  disabledBorder: _border(AppColors.borderDefault),
  focusedBorder: _border(AppColors.brandPrimary, width: 2),
  errorBorder: _border(AppComponentTokens.controlBorderError),
  focusedErrorBorder: _border(AppComponentTokens.controlBorderError, width: 2),
);

/// The project's text field (D-039). The label is always shown; the error
/// replaces the helper and is announced by screen readers.
class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    this.controller,
    this.hint,
    this.helper,
    this.error,
    this.prefixText,
    this.keyboardType,
    this.inputFormatters,
    this.maxLength,
    this.textInputAction,
    this.onSubmitted,
    this.onChanged,
    this.autofillHints,
    this.enabled = true,
    this.autofocus = false,
    this.isRequired = false,
  });

  final String label;
  final TextEditingController? controller;
  final String? hint;
  final String? helper;
  final String? error;

  /// Shown before the value, for example "+91 " or "₹ ".
  final String? prefixText;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;

  /// Limits the length without showing a counter.
  final int? maxLength;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final Iterable<String>? autofillHints;
  final bool enabled;
  final bool autofocus;

  /// Shows the required marker (a red asterisk) after the label.
  final bool isRequired;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      autofocus: autofocus,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      maxLength: maxLength,
      textInputAction: textInputAction,
      onSubmitted: onSubmitted,
      onChanged: onChanged,
      autofillHints: autofillHints,
      decoration: appInputDecoration(
        label: label,
        isRequired: isRequired,
        hint: hint,
        helper: helper,
        error: error,
        prefixText: prefixText,
        counterText: maxLength == null ? null : '',
      ),
    );
  }
}

/// A search field: a search icon, the search keyboard action and a clear
/// button once something is typed.
class AppSearchField extends StatelessWidget {
  const AppSearchField({
    super.key,
    required this.label,
    required this.controller,
    required this.onSubmitted,
    this.hint,
    this.maxLength = 60,
  });

  final String label;
  final TextEditingController controller;

  /// Called with the trimmed text when searching or clearing.
  final ValueChanged<String> onSubmitted;
  final String? hint;
  final int maxLength;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: controller,
      builder: (context, value, _) => TextField(
        controller: controller,
        maxLength: maxLength,
        textInputAction: TextInputAction.search,
        onSubmitted: (text) => onSubmitted(text.trim()),
        decoration: appInputDecoration(
          label: label,
          hint: hint,
          counterText: '',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: value.text.isEmpty
              ? null
              : IconButton(
                  tooltip: 'Clear search',
                  icon: const Icon(Icons.close),
                  onPressed: () {
                    controller.clear();
                    onSubmitted('');
                  },
                ),
        ),
      ),
    );
  }
}

/// One choice in an [AppDropdown], [AppRadioGroup] or [AppSegmentedControl].
class AppOption<T> {
  const AppOption(this.value, this.label);

  final T value;
  final String label;
}

/// The project's dropdown (D-039), with the same decoration as text fields.
///
/// It shows [value] when built; a new [value] from the parent replaces the
/// selection.
class AppDropdown<T> extends StatelessWidget {
  const AppDropdown({
    super.key,
    required this.label,
    required this.options,
    required this.value,
    required this.onChanged,
    this.helper,
    this.error,
    this.isRequired = false,
  });

  final String label;
  final List<AppOption<T>> options;
  final T? value;

  /// Null disables the dropdown.
  final ValueChanged<T?>? onChanged;
  final String? helper;
  final String? error;

  /// Shows the required marker (a red asterisk) after the label.
  final bool isRequired;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      // The form field keeps its own value; a new key applies a new [value].
      key: ValueKey<T?>(value),
      initialValue: value,
      isExpanded: true,
      onChanged: onChanged,
      borderRadius: BorderRadius.circular(AppComponentTokens.controlRadius),
      dropdownColor: AppComponentTokens.cardBackground,
      menuMaxHeight: AppSpacing.s64 * 6,
      decoration: appInputDecoration(
        label: label,
        isRequired: isRequired,
        helper: helper,
        error: error,
      ),
      items: [
        for (final option in options)
          DropdownMenuItem<T>(
            value: option.value,
            child: Text(option.label, overflow: TextOverflow.ellipsis),
          ),
      ],
    );
  }
}
