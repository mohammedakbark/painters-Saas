import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../bills/bill_models.dart';
import '../../bills/bill_providers.dart';
import '../../orders/order_labels.dart';
import '../../shops/shop_access_repository.dart';
import '../catalogue/catalogue_parts.dart';
import '../customers/customer_labels.dart';
import 'bill_labels.dart';

/// Bills (BIL-001, D-062), from the side menu: what customers owe and what
/// the shop owes after returns, then customers with a bill, largest owed
/// first, with search, a balance filter and Load more. A customer opens
/// their page to record a payment.
class BillsScreen extends ConsumerStatefulWidget {
  const BillsScreen({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<BillsScreen> createState() => _BillsScreenState();
}

class _BillsScreenState extends ConsumerState<BillsScreen> {
  final _search = TextEditingController();
  String _query = '';

  /// Null is "All".
  BillStatus? _status;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  BillListKey get _key =>
      (shopId: widget.shopId, filter: (query: _query, status: _status));

  @override
  Widget build(BuildContext context) {
    final bills = ref.watch(billListProvider(_key));
    final Widget body;
    if (bills.hasError && bills.error is ShopNotFound) {
      body = const CatalogueShopNotFound();
    } else {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.s12,
              AppSpacing.screenPadding,
              AppSpacing.s12,
            ),
            child: AppSearchField(
              label: 'Search bills',
              hint: 'Name or mobile number',
              controller: _search,
              onSubmitted: (query) => setState(() => _query = query.trim()),
            ),
          ),
          AppChoiceChips<BillStatus?>(
            label: 'Balance',
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenPadding,
            ),
            value: _status,
            options: [
              const AppChipOption(null, 'All'),
              for (final status in BillStatus.values)
                AppChipOption(status, status.label),
            ],
            onChanged: (status) => setState(() => _status = status),
          ),
          const SizedBox(height: AppSpacing.s12),
          Expanded(
            child: bills.when(
              loading: () => const LoadingView(message: 'Loading bills…'),
              error: (_, _) => ErrorView(
                title: BillMessages.listFailed,
                onRetry: () => ref.invalidate(billListProvider(_key)),
              ),
              data: (state) => RefreshIndicator(
                onRefresh: () => ref.refresh(billListProvider(_key).future),
                child: _BillList(
                  state: state,
                  filtered: _query.isNotEmpty || _status != null,
                  onOpen: (item) => context.go(
                    '/shops/${widget.shopId}/customers/${item.customerId}',
                  ),
                  onLoadMore: () =>
                      ref.read(billListProvider(_key).notifier).loadMore(),
                ),
              ),
            ),
          ),
        ],
      );
    }
    return AppScaffold(title: 'Bills', body: body);
  }
}

class _BillList extends StatelessWidget {
  const _BillList({
    required this.state,
    required this.filtered,
    required this.onOpen,
    required this.onLoadMore,
  });

  final BillListState state;
  final bool filtered;
  final ValueChanged<BillListItem> onOpen;
  final VoidCallback onLoadMore;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenPadding,
        0,
        AppSpacing.screenPadding,
        AppSpacing.screenPadding,
      ),
      children: [
        Row(
          children: [
            Expanded(
              child: AppStatTile(
                key: const Key('bills-owing'),
                label: 'Customers owe you',
                value: formatRupees(state.first.owingPaise),
              ),
            ),
            const SizedBox(width: AppSpacing.s12),
            Expanded(
              child: AppStatTile(
                key: const Key('bills-shop-owes'),
                label: 'You owe after returns',
                value: formatRupees(state.first.shopOwesPaise),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.s16),
        if (state.items.isEmpty)
          MessageView(
            icon: filtered ? Icons.search_off : Icons.receipt_long_outlined,
            title: filtered ? 'No bills match' : 'No bills yet',
            message: filtered ? BillMessages.noMatch : BillMessages.noBills,
          ),
        for (final item in state.items) ...[
          _BillCard(
            key: ValueKey('bill-${item.customerId}'),
            item: item,
            onOpen: () => onOpen(item),
          ),
          const SizedBox(height: AppSpacing.s12),
        ],
        if (state.loadMoreFailed)
          AppInlineMessage(
            tone: AppTone.error,
            message: BillMessages.listFailed,
            action: Align(
              alignment: Alignment.centerLeft,
              child: AppButton(
                label: 'Try again',
                variant: AppButtonVariant.tertiary,
                onPressed: onLoadMore,
              ),
            ),
          )
        else if (state.hasMore)
          AppButton(
            label: 'Load more',
            loadingLabel: 'Loading…',
            variant: AppButtonVariant.secondary,
            loading: state.loadingMore,
            onPressed: onLoadMore,
          ),
      ],
    );
  }
}

class _BillCard extends StatelessWidget {
  const _BillCard({super.key, required this.item, required this.onOpen});

  final BillListItem item;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final state = balanceState(item.balancePaise);
    return AppCard(
      onTap: onOpen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text(item.name, style: textTheme.titleMedium)),
              const SizedBox(width: AppSpacing.s8),
              AppBadge(label: item.kind.label, tone: kindTone(item.kind)),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          Text(
            '${formatPhone(item.phone)} · last ${formatOrderTime(item.lastEntryAt)}',
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.s8),
          Wrap(
            spacing: AppSpacing.s8,
            runSpacing: AppSpacing.s4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                formatRupees(item.balancePaise.abs()),
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              AppBadge(label: state.label, tone: state.tone),
            ],
          ),
        ],
      ),
    );
  }
}
