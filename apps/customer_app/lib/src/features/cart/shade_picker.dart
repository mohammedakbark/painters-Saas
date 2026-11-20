import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../cart/cart_models.dart';
import '../../providers.dart';
import '../../storefront/storefront_providers.dart';

/// Opens the shade picker for a product; returns the chosen or typed shade.
Future<CartShade?> showShadePicker(
  BuildContext context, {
  required String shopId,
  required String productId,
}) => showAppBottomSheet<CartShade>(
  context: context,
  title: 'Choose a shade',
  builder: (context) => ShadePicker(shopId: shopId, productId: productId),
);

final _shadesProvider = FutureProvider.autoDispose
    .family<ShadeOptions, (String, String, String)>(
      (ref, key) => ref
          .watch(storefrontRepositoryProvider)
          .shades(key.$1, key.$2, query: key.$3),
      retry: noRetry,
    );

/// Search the shade card and the shop's own codes, or type a code that is
/// not listed (owner, 2026-11-20). Colours on screens are indicative only.
class ShadePicker extends ConsumerStatefulWidget {
  const ShadePicker({super.key, required this.shopId, required this.productId});

  final String shopId;
  final String productId;

  @override
  ConsumerState<ShadePicker> createState() => _ShadePickerState();
}

class _ShadePickerState extends ConsumerState<ShadePicker> {
  final _search = TextEditingController();
  final _code = TextEditingController();
  final _name = TextEditingController();
  String _query = '';
  String? _codeError;

  @override
  void dispose() {
    _search.dispose();
    _code.dispose();
    _name.dispose();
    super.dispose();
  }

  void _useTyped() {
    final code = _code.text.trim().toUpperCase();
    if (code.isEmpty) {
      setState(() => _codeError = 'Enter the shade code.');
      return;
    }
    final name = _name.text.trim();
    Navigator.of(context)
        .pop(CartShade(code: code, name: name.isEmpty ? null : name));
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final shades = ref.watch(
      _shadesProvider((widget.shopId, widget.productId, _query)),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        AppSearchField(
          label: 'Search shade code or name',
          controller: _search,
          onSubmitted: (query) => setState(() => _query = query),
        ),
        const SizedBox(height: AppSpacing.s12),
        switch (shades) {
          AsyncData(:final value) when value.items.isEmpty => Text(
            _query.isEmpty
                ? 'This shop has no shade card for this product. Type the code below.'
                : 'No shade matches "$_query". Type the code below.',
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          AsyncData(:final value) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final shade in value.items) ...[
                _ShadeRow(
                  shade: shade,
                  onTap: () => Navigator.of(context).pop(shade.toCartShade()),
                ),
                const SizedBox(height: AppSpacing.s8),
              ],
              if (value.more)
                Text(
                  'More shades match. Search to narrow the list.',
                  style: textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
            ],
          ),
          AsyncError() => AppInlineMessage(
            message:
                "We couldn't load the shades. You can type the code below.",
            tone: AppTone.warning,
          ),
          _ => const LoadingView(message: 'Loading shades…'),
        },
        const SizedBox(height: AppSpacing.s16),
        Semantics(
          header: true,
          child: Text(
            'Not listed? Type the shade code',
            style: textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(height: AppSpacing.s8),
        AppTextField(
          key: const Key('shade-code'),
          label: 'Shade code',
          isRequired: true,
          controller: _code,
          maxLength: 40,
          hint: 'For example 7842',
          inputFormatters: [UpperCaseTextFormatter()],
          error: _codeError,
          onChanged: (_) {
            if (_codeError != null) setState(() => _codeError = null);
          },
        ),
        const SizedBox(height: AppSpacing.s8),
        AppTextField(
          key: const Key('shade-name'),
          label: 'Shade name (optional)',
          controller: _name,
          maxLength: 80,
        ),
        const SizedBox(height: AppSpacing.s12),
        AppButton(
          key: const Key('use-typed-shade'),
          label: 'Use this code',
          variant: AppButtonVariant.secondary,
          expand: true,
          onPressed: _useTyped,
        ),
        const SizedBox(height: AppSpacing.s8),
        Text(
          'Colours on screens are only a guide. Check the shade card at the shop.',
          style: textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _ShadeRow extends StatelessWidget {
  const _ShadeRow({required this.shade, required this.onTap});

  final ShadeOption shade;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return AppCard(
      key: ValueKey('shade-${shade.code}'),
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.s12),
      child: Row(
        children: [
          AppColorSwatch(hex: shade.previewHex),
          const SizedBox(width: AppSpacing.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  shade.code,
                  style: textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(shade.name, style: textTheme.bodyMedium),
              ],
            ),
          ),
          if (shade.favourite)
            const AppBadge(label: "Shop's pick", tone: AppTone.info),
        ],
      ),
    );
  }
}

/// Shade codes are upper case, as on the shade card.
class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) => newValue.copyWith(text: newValue.text.toUpperCase());
}
