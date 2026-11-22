import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../bills/my_bills.dart';
import '../../routing/paths.dart';
import '../orders/orders_screens.dart';

/// Who owes whom, from the person's side, with its own tone each (BIL-003).
({String label, AppTone tone}) myBalanceState(int balancePaise) {
  if (balancePaise > 0) return (label: 'You owe', tone: AppTone.warning);
  if (balancePaise < 0) return (label: 'Shop owes you', tone: AppTone.info);
  return (label: 'Settled', tone: AppTone.success);
}

/// "+₹1,000" adds to what you owe, "−₹500" takes from it.
String signedRupees(int paise) =>
    '${paise < 0 ? '−' : '+'}${formatRupees(paise.abs())}';

abstract final class MyBillMessages {
  static const payAtShop =
      'Pay the shop in cash, by UPI or bank transfer. The shop records it '
      'here.';
}

/// My bills (BIL-003, D-062): the person's running bill with each shop they
/// buy from, most owed first. Each shop's bill stays separate.
class MyBillsScreen extends ConsumerWidget {
  const MyBillsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bills = ref.watch(myBillsProvider);
    return AppScaffold(
      title: 'Bills',
      subtitle: 'What you owe each shop',
      body: bills.when(
        loading: () => const LoadingView(message: 'Loading your bills…'),
        error: (error, _) => ErrorView(
          title: "We couldn't load your bills",
          message: error is ApiException ? error.detail : null,
          onRetry: () => ref.invalidate(myBillsProvider),
        ),
        data: (list) => list.isEmpty
            ? const MessageView(
                icon: Icons.receipt_long_outlined,
                title: 'No bills yet',
                message:
                    'A shop starts your bill when it completes your first '
                    'order.',
              )
            : RefreshIndicator(
                onRefresh: () => ref.refresh(myBillsProvider.future),
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.screenPadding),
                  children: [
                    for (final bill in list) ...[
                      _BillCard(
                        bill: bill,
                        onTap: () => context.push(myBillPath(bill.shopId)),
                      ),
                      const SizedBox(height: AppSpacing.s12),
                    ],
                    Text(
                      MyBillMessages.payAtShop,
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _BillCard extends StatelessWidget {
  const _BillCard({required this.bill, required this.onTap});

  final MyBillSummary bill;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final state = myBalanceState(bill.balancePaise);
    return AppCard(
      key: ValueKey('my-bill-${bill.shopId}'),
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  bill.shopName,
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.s4),
                Wrap(
                  spacing: AppSpacing.s8,
                  runSpacing: AppSpacing.s4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      formatRupees(bill.balancePaise.abs()),
                      style: textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    AppBadge(label: state.label, tone: state.tone),
                  ],
                ),
                Text(
                  'Last change ${formatPlacedAt(bill.lastEntryAt)}',
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: AppColors.textSecondary),
        ],
      ),
    );
  }
}

/// One shop's bill: what you owe (or the shop owes you after a return),
/// what each site was billed for painters, and every entry, newest first.
class MyBillScreen extends ConsumerStatefulWidget {
  const MyBillScreen({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<MyBillScreen> createState() => _MyBillScreenState();
}

class _MyBillScreenState extends ConsumerState<MyBillScreen> {
  bool _loadingOlder = false;

  Future<void> _older() async {
    setState(() => _loadingOlder = true);
    try {
      await ref.read(myBillProvider(widget.shopId).notifier).loadOlder();
    } on ApiException catch (error) {
      if (mounted) {
        showAppSnackBar(
          context,
          error.detail ?? "We couldn't load older entries. Try again.",
          tone: AppTone.error,
        );
      }
    } finally {
      if (mounted) setState(() => _loadingOlder = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bill = ref.watch(myBillProvider(widget.shopId));
    return switch (bill) {
      AsyncData(:final value) => _view(context, value),
      AsyncError(:final error) => AppScaffold(
        title: 'Bill',
        body: error is ApiException && error.status == 404
            ? const MessageView(
                icon: Icons.receipt_long_outlined,
                title: 'No bill with this shop',
                message: 'It starts when the shop completes your first order.',
              )
            : ErrorView(
                title: "We couldn't load this bill",
                message: error is ApiException ? error.detail : null,
                onRetry: () => ref.invalidate(myBillProvider(widget.shopId)),
              ),
      ),
      _ => const AppScaffold(
        title: 'Bill',
        body: LoadingView(message: 'Loading the bill…'),
      ),
    };
  }

  Widget _view(BuildContext context, MyBill bill) {
    final textTheme = Theme.of(context).textTheme;
    final secondary = textTheme.bodyMedium?.copyWith(
      color: AppColors.textSecondary,
    );
    final state = myBalanceState(bill.balancePaise);
    final amount = textTheme.bodyLarge?.copyWith(
      fontWeight: FontWeight.w700,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
    return AppScaffold(
      title: bill.shopName,
      subtitle: 'Your bill',
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(myBillProvider(widget.shopId).future),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            AppTotalBanner(
              key: const Key('my-bill-total'),
              caption: state.label,
              value: formatRupees(bill.balancePaise.abs()),
              detail: bill.balancePaise < 0
                  ? 'After a return. The shop pays it back or it pays your '
                        'next orders.'
                  : null,
            ),
            const SizedBox(height: AppSpacing.s8),
            Text(MyBillMessages.payAtShop, style: secondary),
            if (bill.sites.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.s24),
              Text(
                'Billed by site',
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
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
              Text(
                'Your payments go against the one bill, not a site.',
                style: secondary,
              ),
            ],
            const SizedBox(height: AppSpacing.s24),
            Text(
              'Entries',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            for (final entry in bill.entries)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.s8),
                child: _EntryCard(entry: entry, amount: amount),
              ),
            if (bill.hasMore) ...[
              const SizedBox(height: AppSpacing.s12),
              AppButton(
                label: 'Older entries',
                loadingLabel: 'Loading…',
                loading: _loadingOlder,
                variant: AppButtonVariant.secondary,
                expand: true,
                onPressed: _older,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EntryCard extends StatelessWidget {
  const _EntryCard({required this.entry, required this.amount});

  final MyBillEntry entry;
  final TextStyle? amount;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final orderId = entry.orderId;
    return AppCard(
      key: ValueKey('my-bill-entry-${entry.id}'),
      padding: const EdgeInsets.all(AppSpacing.s12),
      onTap: orderId == null ? null : () => context.push(orderPath(orderId)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  [
                    entry.kind.label,
                    if (entry.orderNumber case final number?) '#$number',
                    if (entry.method case final method?)
                      paymentMethodLabel(method),
                  ].join(' · '),
                  style: textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  [
                    formatPlacedAt(entry.createdAt),
                    ?entry.siteLabel,
                  ].join(' · '),
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
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
