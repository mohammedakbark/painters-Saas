import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../api/api_client.dart';
import '../../bills/bill_providers.dart';
import '../../orders/order_labels.dart';
import '../../orders/order_models.dart';
import '../orders/order_messages.dart';

/// Records a payment (or, with [refund], money paid back) on the running
/// bill (BIL-001, D-062), in a bottom sheet. The amount starts at what is
/// owed ([maxPaise]) and can be lowered; the API refuses more. Returns the
/// success message, or null when closed.
Future<String?> showBillMoneySheet(
  BuildContext context, {
  required BillKey billKey,
  required bool refund,
  required int maxPaise,
}) => showAppBottomSheet<String>(
  context: context,
  title: refund ? 'Record refund' : 'Record payment',
  builder: (context) =>
      _BillMoneyForm(billKey: billKey, refund: refund, maxPaise: maxPaise),
);

class _BillMoneyForm extends ConsumerStatefulWidget {
  const _BillMoneyForm({
    required this.billKey,
    required this.refund,
    required this.maxPaise,
  });

  final BillKey billKey;
  final bool refund;
  final int maxPaise;

  @override
  ConsumerState<_BillMoneyForm> createState() => _BillMoneyFormState();
}

class _BillMoneyFormState extends ConsumerState<_BillMoneyForm> {
  late final _amount = TextEditingController(
    text: paiseToInput(widget.maxPaise),
  );
  final _note = TextEditingController();

  /// One key for this sheet, kept across retries, so a lost answer never
  /// records twice.
  final _requestId = newRequestId();
  PaymentMethod _method = PaymentMethod.cash;
  bool _saving = false;
  String? _amountError;
  String? _formError;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final parsed = parseRupees(_amount.text, label: 'amount');
    final String? amountError = switch (parsed) {
      RupeesInvalid(:final message) => message,
      RupeesParsed(:final paise) when paise < 100 =>
        'The amount must be at least ₹1.',
      RupeesParsed(:final paise) when paise > widget.maxPaise =>
        'Enter at most ${formatRupees(widget.maxPaise)}.',
      _ => null,
    };
    setState(() {
      _amountError = amountError;
      _formError = null;
    });
    if (parsed is! RupeesParsed || amountError != null) return;
    setState(() => _saving = true);
    try {
      final note = _note.text.trim();
      await ref.read(billProvider(widget.billKey).notifier).record((
        amountPaise: parsed.paise,
        method: _method,
        note: note.isEmpty ? null : note,
        requestId: _requestId,
      ), refund: widget.refund);
      if (!mounted) return;
      Navigator.of(context).pop(
        widget.refund
            ? 'Refund of ${formatRupees(parsed.paise)} recorded.'
            : 'Payment of ${formatRupees(parsed.paise)} recorded.',
      );
    } on Object catch (error) {
      if (!mounted) return;
      final field = error is ApiException
          ? error.fieldErrors['amountPaise'] ??
                (error.status == 409 ? error.detail : null)
          : null;
      setState(() {
        _saving = false;
        _amountError = field;
        _formError = field == null ? orderErrorMessage(error) : null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final secondary = Theme.of(context).textTheme.bodyMedium
        ?.copyWith(color: AppColors.textSecondary);
    final formError = _formError;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          widget.refund
              ? 'You owe the customer ${formatRupees(widget.maxPaise)} after '
                    'a return.'
              : 'The customer owes ${formatRupees(widget.maxPaise)}. Any '
                    'amount up to that pays their oldest orders first.',
          style: secondary,
        ),
        const SizedBox(height: AppSpacing.s16),
        AppTextField(
          key: const Key('bill-amount'),
          label: 'Amount (₹)',
          controller: _amount,
          isRequired: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          enabled: !_saving,
          error: _amountError,
        ),
        const SizedBox(height: AppSpacing.s16),
        AppRadioGroup<PaymentMethod>(
          label: widget.refund ? 'Paid back by' : 'Paid by',
          isRequired: true,
          value: _method,
          options: [
            for (final method in PaymentMethod.values)
              AppOption(method, paymentMethodLabel(method)),
          ],
          onChanged: _saving
              ? (_) {}
              : (method) => setState(() => _method = method ?? _method),
        ),
        const SizedBox(height: AppSpacing.s16),
        AppTextField(
          key: const Key('bill-note'),
          label: 'Note',
          helper: 'Optional, for example a UPI reference.',
          controller: _note,
          maxLength: 300,
          enabled: !_saving,
        ),
        if (formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(tone: AppTone.error, message: formError),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          key: const Key('save-bill-money'),
          label: widget.refund ? 'Record refund' : 'Record payment',
          loadingLabel: 'Saving…',
          loading: _saving,
          expand: true,
          onPressed: _submit,
        ),
      ],
    );
  }
}
