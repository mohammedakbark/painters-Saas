import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../bills/bill_models.dart';
import '../../bills/bill_providers.dart';
import '../../orders/order_labels.dart';
import '../orders/order_messages.dart';
import 'bill_labels.dart';
import 'bill_sheet.dart';

/// A customer's running bill on their page (BIL-001, D-062): who owes whom,
/// Record payment or refund ([canRecord]), billed by site for painters and
/// the entries, newest first, with older ones on request. Loads on its own
/// (D-044).
class BillSection extends ConsumerStatefulWidget {
  const BillSection({
    super.key,
    required this.billKey,
    required this.canRecord,
  });

  final BillKey billKey;
  final bool canRecord;

  @override
  ConsumerState<BillSection> createState() => _BillSectionState();
}

class _BillSectionState extends ConsumerState<BillSection> {
  bool _loadingOlder = false;

  Future<void> _record(Bill bill) async {
    final refund = bill.balancePaise < 0;
    final saved = await showBillMoneySheet(
      context,
      billKey: widget.billKey,
      refund: refund,
      maxPaise: bill.balancePaise.abs(),
    );
    if (saved != null && mounted) {
      showAppSnackBar(context, saved, tone: AppTone.success);
    }
  }

  Future<void> _older() async {
    setState(() => _loadingOlder = true);
    try {
      await ref.read(billProvider(widget.billKey).notifier).loadOlder();
    } on Object catch (error) {
      if (mounted) {
        showAppSnackBar(context, orderErrorMessage(error), tone: AppTone.error);
      }
    } finally {
      if (mounted) setState(() => _loadingOlder = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bill = ref.watch(billProvider(widget.billKey));
    return AppSection(
      title: 'Bill',
      child: bill.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(AppSpacing.s12),
          child: Center(child: AppSpinner()),
        ),
        error: (_, _) => AppInlineMessage(
          tone: AppTone.error,
          message: BillMessages.billFailed,
          action: Align(
            alignment: Alignment.centerLeft,
            child: AppButton(
              label: 'Try again',
              variant: AppButtonVariant.tertiary,
              onPressed: () => ref.invalidate(billProvider(widget.billKey)),
            ),
          ),
        ),
        data: (bill) => _BillBody(
          bill: bill,
          shopId: widget.billKey.shopId,
          canRecord: widget.canRecord,
          loadingOlder: _loadingOlder,
          onRecord: () => _record(bill),
          onOlder: _older,
        ),
      ),
    );
  }
}

class _BillBody extends StatelessWidget {
  const _BillBody({
    required this.bill,
    required this.shopId,
    required this.canRecord,
    required this.loadingOlder,
    required this.onRecord,
    required this.onOlder,
  });

  final Bill bill;
  final String shopId;
  final bool canRecord;
  final bool loadingOlder;
  final VoidCallback onRecord;
  final VoidCallback onOlder;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final secondary = textTheme.bodyMedium?.copyWith(
      color: AppColors.textSecondary,
    );
    final state = balanceState(bill.balancePaise);
    final amount = textTheme.titleMedium?.copyWith(
      fontWeight: FontWeight.w700,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: AppSpacing.s12,
          runSpacing: AppSpacing.s8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              formatRupees(bill.balancePaise.abs()),
              key: const Key('bill-balance'),
              style: textTheme.headlineSmall?.copyWith(
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            AppBadge(label: state.label, tone: state.tone),
          ],
        ),
        if (bill.balancePaise < 0) ...[
          const SizedBox(height: AppSpacing.s4),
          Text(BillMessages.shopOwes, style: secondary),
        ],
        if (canRecord && bill.balancePaise != 0) ...[
          const SizedBox(height: AppSpacing.s12),
          AppButton(
            key: const Key('record-bill-money'),
            label: bill.balancePaise > 0 ? 'Record payment' : 'Record refund',
            icon: Icons.payments_outlined,
            expand: true,
            onPressed: onRecord,
          ),
        ],
        if (bill.sites.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.s16),
          Text('Billed by site', style: textTheme.titleSmall),
          for (final site in bill.sites)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.s8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${site.label} · ${site.orderCount == 1 ? '1 order' : '${site.orderCount} orders'}',
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s8),
                  Text(formatRupees(site.billedPaise), style: amount),
                ],
              ),
            ),
          const SizedBox(height: AppSpacing.s4),
          Text(BillMessages.sitesNote, style: secondary),
        ],
        const SizedBox(height: AppSpacing.s16),
        Text('Entries', style: textTheme.titleSmall),
        if (bill.entries.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: AppSpacing.s8),
            child: AppInlineMessage(message: BillMessages.noEntries),
          ),
        for (final entry in bill.entries)
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.s8),
            child: _EntryRow(entry: entry, shopId: shopId, amount: amount),
          ),
        if (bill.hasMore) ...[
          const SizedBox(height: AppSpacing.s12),
          AppButton(
            label: 'Older entries',
            loadingLabel: 'Loading…',
            loading: loadingOlder,
            variant: AppButtonVariant.secondary,
            expand: true,
            onPressed: onOlder,
          ),
        ],
      ],
    );
  }
}

class _EntryRow extends StatelessWidget {
  const _EntryRow({
    required this.entry,
    required this.shopId,
    required this.amount,
  });

  final BillEntry entry;
  final String shopId;
  final TextStyle? amount;

  @override
  Widget build(BuildContext context) {
    final orderId = entry.orderId;
    final orderNumber = entry.orderNumber;
    final details = [
      formatOrderTime(entry.createdAt),
      ?entry.siteLabel,
      ?entry.note,
    ].join(' · ');
    return AppCard(
      key: ValueKey('bill-entry-${entry.id}'),
      padding: const EdgeInsets.all(AppSpacing.s12),
      onTap: orderId == null
          ? null
          : () => context.push('/shops/$shopId/orders/$orderId'),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  [
                    entry.kind.label,
                    if (orderNumber != null) orderNumberLabel(orderNumber),
                    if (entry.method case final method?)
                      paymentMethodLabel(method),
                  ].join(' · '),
                  style: Theme.of(context).textTheme.bodyLarge
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                Text(
                  details,
                  style: Theme.of(context).textTheme.bodyMedium
                      ?.copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.s8),
          Text(signedRupees(entry.amountPaise), style: amount),
        ],
      ),
    );
  }
}
