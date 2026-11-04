import 'package:flutter/material.dart';

import '../tokens/app_component_tokens.dart';
import '../tokens/app_spacing.dart';
import '../tokens/app_typography.dart';
import 'app_button.dart';

/// Opens a bottom sheet with a drag handle and a [title] (D-039). The content
/// scrolls and moves above the keyboard, so forms fit on small phones.
/// Returns the value passed to `Navigator.pop`, or null when dismissed.
Future<T?> showAppBottomSheet<T>({
  required BuildContext context,
  required String title,
  required WidgetBuilder builder,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: AppComponentTokens.sheetBackground,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(AppComponentTokens.sheetRadius),
      ),
    ),
    builder: (context) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.screenPadding,
          0,
          AppSpacing.screenPadding,
          AppSpacing.s24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(title, style: AppTypography.title),
            ),
            const SizedBox(height: AppSpacing.s16),
            builder(context),
          ],
        ),
      ),
    ),
  );
}

/// Opens a dialog with a [title], custom [content] and [actions] (usually
/// [AppButton]s that call `Navigator.pop`).
Future<T?> showAppDialog<T>({
  required BuildContext context,
  required String title,
  required Widget content,
  required List<Widget> actions,
}) {
  return showDialog<T>(
    context: context,
    builder: (context) => AlertDialog(
      backgroundColor: AppComponentTokens.dialogBackground,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppComponentTokens.dialogRadius),
      ),
      title: Text(title, style: AppTypography.title),
      content: SingleChildScrollView(child: content),
      actionsOverflowButtonSpacing: AppSpacing.s8,
      actions: actions,
    ),
  );
}

/// Asks the user to confirm an action. Returns true only when they confirm;
/// dismissing the dialog counts as cancelling.
Future<bool> showAppConfirmDialog({
  required BuildContext context,
  required String title,
  required String message,
  required String confirmLabel,
  String cancelLabel = 'Cancel',
  bool destructive = false,
}) async {
  final confirmed = await showAppDialog<bool>(
    context: context,
    title: title,
    content: Text(message, style: AppTypography.bodyLarge),
    actions: [
      Builder(
        builder: (context) => AppButton(
          label: cancelLabel,
          variant: AppButtonVariant.tertiary,
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ),
      Builder(
        builder: (context) => AppButton(
          label: confirmLabel,
          variant: destructive
              ? AppButtonVariant.destructive
              : AppButtonVariant.primary,
          onPressed: () => Navigator.of(context).pop(true),
        ),
      ),
    ],
  );
  return confirmed ?? false;
}
