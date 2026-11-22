import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../bills/my_bills.dart';
import '../../routing/paths.dart';
import '../../sites/sites.dart';
import '../orders/orders_screens.dart';

/// "3 shops · 5 orders", or null before the first order.
String? spendDetail(int shopCount, int orderCount) {
  if (orderCount == 0) return null;
  final shops = shopCount == 1 ? '1 shop' : '$shopCount shops';
  final orders = orderCount == 1 ? '1 order' : '$orderCount orders';
  return '$shops · $orders';
}

/// A site's page (design "Customer App › Site spend", CUS-007, D-008): the
/// total spent on the site across shops, then each shop's total and orders,
/// kept separate. Cancelled orders are left out (the server adds up).
class SiteSpendScreen extends ConsumerWidget {
  const SiteSpendScreen({super.key, required this.siteId});

  final String siteId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final spend = ref.watch(siteSpendProvider(siteId));
    return switch (spend) {
      AsyncData(:final value) => _SiteSpendView(spend: value),
      AsyncError(:final error) => AppScaffold(
        title: 'Site',
        body: error is ApiException && error.status == 404
            ? const MessageView(
                icon: Icons.search_off,
                title: 'Site not found',
                message: 'It may have been removed from your sites.',
              )
            : ErrorView(
                title: "We couldn't load this site",
                message: error is ApiException ? error.detail : null,
                onRetry: () => ref.invalidate(siteSpendProvider(siteId)),
              ),
      ),
      _ => const AppScaffold(
        title: 'Site',
        body: LoadingView(message: 'Loading the site…'),
      ),
    };
  }
}

class _SiteSpendView extends ConsumerWidget {
  const _SiteSpendView({required this.spend});

  final SiteSpend spend;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    // Each shop's whole bill (BIL-003); the page works without it.
    final bills = {
      for (final bill
          in ref.watch(myBillsProvider).value ?? const <MyBillSummary>[])
        bill.shopId: bill,
    };
    return AppScaffold(
      title: spend.siteName,
      subtitle: spend.archived ? 'Archived site' : 'Site spend',
      actions: [
        if (!spend.archived)
          AppMenuButton(
            items: [
              AppMenuItem(
                label: 'Edit site',
                icon: Icons.edit_outlined,
                onSelected: () => context.push(editSitePath(spend.siteId)),
              ),
            ],
          ),
      ],
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(siteSpendProvider(spend.siteId).future),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            AppTotalBanner(
              key: const Key('site-total'),
              caption: 'Total spent on this site',
              value: formatRupees(spend.totalPaise),
              detail: spendDetail(spend.shops.length, spend.orderCount),
            ),
            if (spend.shops.isEmpty)
              const MessageView(
                icon: Icons.receipt_long_outlined,
                title: 'No orders for this site yet',
                message:
                    'Choose this site at checkout. Its orders from every shop '
                    'add up here.',
              )
            else ...[
              const SizedBox(height: AppSpacing.s24),
              Text(
                'By shop',
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                "Each shop's orders stay separate. Cancelled orders are not "
                'counted.',
                style: textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              for (final shop in spend.shops) ...[
                const SizedBox(height: AppSpacing.s16),
                _ShopSpend(shop: shop, bill: bills[shop.shopId]),
              ],
              if (spend.ordersTruncated) ...[
                const SizedBox(height: AppSpacing.s16),
                const AppInlineMessage(
                  message:
                      'Only the latest orders are listed. The totals include '
                      'every order.',
                ),
              ],
              const SizedBox(height: AppSpacing.s16),
              // BIL-003: what the painter owes each shop, all sites together.
              AppNavRow(
                key: const Key('site-bills'),
                icon: Icons.receipt_long_outlined,
                title: 'Your bills with these shops',
                subtitle: 'What you owe each shop, for all your sites',
                onTap: () => context.push(myBillsPath),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// One shop: its name and total, then its orders, newest first.
class _ShopSpend extends StatelessWidget {
  const _ShopSpend({required this.shop, this.bill});

  final SiteShopSpend shop;

  /// The painter's whole bill with this shop (BIL-003), when loaded.
  final MyBillSummary? bill;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final amount = textTheme.titleMedium?.copyWith(
      fontWeight: FontWeight.w700,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
    return Column(
      key: ValueKey('shop-spend-${shop.shopId}'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                shop.shopName,
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.s12),
            Text(formatRupees(shop.totalPaise), style: amount),
          ],
        ),
        if (bill case final bill? when bill.balancePaise != 0)
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.s4),
            child: Text(
              bill.balancePaise > 0
                  ? 'Your bill with this shop: you owe '
                        '${formatRupees(bill.balancePaise)} for all sites.'
                  : 'This shop owes you ${formatRupees(-bill.balancePaise)}.',
              key: ValueKey('site-shop-bill-${shop.shopId}'),
              style: textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        for (final order in shop.orders) ...[
          const SizedBox(height: AppSpacing.s8),
          AppCard(
            key: ValueKey('site-order-${order.id}'),
            padding: const EdgeInsets.all(AppSpacing.s12),
            onTap: () => context.push(orderPath(order.id)),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '#${order.number}',
                        style: textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        formatPlacedAt(order.placedAt),
                        style: textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                AppBadge(
                  label: order.status.label,
                  tone: orderTone(order.status),
                ),
                const SizedBox(width: AppSpacing.s12),
                Text(
                  formatRupees(order.totalPaise),
                  style: textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
