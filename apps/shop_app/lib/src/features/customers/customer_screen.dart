import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../bills/bill_providers.dart';
import '../../customers/customer_models.dart';
import '../../customers/customer_providers.dart';
import '../../customers/shop_customers_repository.dart';
import '../../orders/order_labels.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../../shops/shop_permissions.dart';
import '../bills/bill_section.dart';
import '../catalogue/catalogue_parts.dart';
import '../orders/order_messages.dart';
import 'customer_labels.dart';
import 'customer_sheets.dart';

/// One customer of the shop (SHP-012): who they are, their latest orders
/// and, for painters the shop recorded, their sites (D-055).
class CustomerScreen extends ConsumerWidget {
  const CustomerScreen({
    super.key,
    required this.shopId,
    required this.customerId,
  });

  final String shopId;
  final String customerId;

  CustomerKey get _key => (shopId: shopId, customerId: customerId);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(customerProvider(_key));
    final shop = ref.watch(shopProvider(shopId)).value;
    final loaded = detail.value;
    final canRecord =
        shop?.status == 'ACTIVE' && shop!.can(ShopPermission.ordersRecord);

    Future<void> edit() async {
      final customer = loaded?.customer;
      if (customer == null) return;
      final saved = await showEditCustomerSheet(context, shopId, customer);
      if (saved == null || !context.mounted) return;
      ref
        ..invalidate(customerProvider(_key))
        ..invalidate(customerListProvider);
      showAppSnackBar(context, CustomerMessages.saved, tone: AppTone.success);
    }

    return AppScaffold(
      title: loaded?.customer.name ?? 'Customer',
      actions: [
        if (loaded != null)
          AppIconButton(
            icon: Icons.edit_outlined,
            tooltip: 'Edit customer',
            onPressed: edit,
          ),
      ],
      body: detail.when(
        loading: () => const LoadingView(message: 'Loading the customer…'),
        error: (error, _) => switch (error) {
          ShopNotFound() => const CatalogueShopNotFound(),
          CustomerNotFound() => MessageView(
            icon: Icons.person_off_outlined,
            title: CustomerMessages.notFound,
            message: CustomerMessages.notFoundMessage,
            action: AppButton(
              label: 'Go to your customers',
              variant: AppButtonVariant.secondary,
              onPressed: () => context.go('/shops/$shopId/customers'),
            ),
          ),
          _ => ErrorView(
            title: CustomerMessages.customerFailed,
            onRetry: () => ref.invalidate(customerProvider(_key)),
          ),
        },
        data: (detail) => RefreshIndicator(
          onRefresh: () async {
            ref
              ..invalidate(customerOrdersProvider(_key))
              ..invalidate(billProvider(_key));
            await ref.refresh(customerProvider(_key).future).then((_) {});
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            children: [
              _Header(customer: detail.customer),
              // The bill is money: payments or money figures (BIL-001).
              if ((shop?.can(ShopPermission.ordersPayments) ?? false) ||
                  (shop?.can(ShopPermission.reportsView) ?? false)) ...[
                const SizedBox(height: AppSpacing.s16),
                BillSection(
                  billKey: (shopId: shopId, customerId: customerId),
                  canRecord: shop!.can(ShopPermission.ordersPayments),
                ),
              ],
              if (shop?.can(ShopPermission.ordersHandle) ?? false) ...[
                const SizedBox(height: AppSpacing.s16),
                _LatestOrders(customerKey: _key),
              ],
              const SizedBox(height: AppSpacing.s16),
              _Sites(customerKey: _key, detail: detail),
            ],
          ),
        ),
      ),
      bottomBar: loaded != null && canRecord
          ? AppBottomActionBar(
              child: AppButton(
                label: 'New order',
                icon: Icons.add,
                expand: true,
                onPressed: () => context.push(
                  '/shops/$shopId/orders/new?customerId=$customerId',
                ),
              ),
            )
          : null,
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.customer});

  final ShopCustomer customer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    final secondary = textTheme.bodyMedium?.copyWith(
      color: AppColors.textSecondary,
    );

    Future<void> call() async {
      var opened = false;
      try {
        opened = await ref.read(linkOpenerProvider)(
          Uri(scheme: 'tel', path: customer.phone),
        );
      } on Object {
        opened = false;
      }
      if (!opened && context.mounted) {
        showAppSnackBar(context, OrderMessages.callFailed, tone: AppTone.error);
      }
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: AppSpacing.s12,
            runSpacing: AppSpacing.s8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Semantics(
                header: true,
                child: Text(customer.name, style: textTheme.headlineSmall),
              ),
              AppBadge(
                label: customer.kind.label,
                tone: kindTone(customer.kind),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          Text(sourceLabel(customer), style: secondary),
          const SizedBox(height: AppSpacing.s12),
          AppButton(
            label: 'Call ${formatPhone(customer.phone)}',
            icon: Icons.call_outlined,
            variant: AppButtonVariant.secondary,
            onPressed: call,
          ),
        ],
      ),
    );
  }
}

class _LatestOrders extends ConsumerWidget {
  const _LatestOrders({required this.customerKey});

  final CustomerKey customerKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(customerOrdersProvider(customerKey));
    return AppSection(
      title: 'Latest orders',
      child: orders.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(AppSpacing.s12),
          child: Center(child: AppSpinner()),
        ),
        error: (_, _) => AppInlineMessage(
          tone: AppTone.error,
          message: CustomerMessages.ordersFailed,
          action: Align(
            alignment: Alignment.centerLeft,
            child: AppButton(
              label: 'Try again',
              variant: AppButtonVariant.tertiary,
              onPressed: () =>
                  ref.invalidate(customerOrdersProvider(customerKey)),
            ),
          ),
        ),
        data: (orders) => orders.isEmpty
            ? const AppInlineMessage(message: CustomerMessages.noOrders)
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final (index, order) in orders.indexed) ...[
                    if (index > 0) const SizedBox(height: AppSpacing.s8),
                    AppNavRow(
                      icon: Icons.receipt_long_outlined,
                      title:
                          '${orderNumberLabel(order.number)} · '
                          '${orderStatusLabel(order.status)}',
                      subtitle:
                          '${formatOrderTime(order.placedAt)} · '
                          '${formatRupees(order.totalPaise)}',
                      onTap: () => context.push(
                        '/shops/${customerKey.shopId}/orders/${order.id}',
                      ),
                    ),
                  ],
                ],
              ),
      ),
    );
  }
}

/// Sites of a painter the shop recorded: add, edit, archive and restore.
class _Sites extends ConsumerStatefulWidget {
  const _Sites({required this.customerKey, required this.detail});

  final CustomerKey customerKey;
  final CustomerDetail detail;

  @override
  ConsumerState<_Sites> createState() => _SitesState();
}

class _SitesState extends ConsumerState<_Sites> {
  /// Sites being archived or restored; their buttons wait for the API.
  final Set<String> _busy = {};

  String get _shopId => widget.customerKey.shopId;
  String get _customerId => widget.customerKey.customerId;

  void _changed(String message) {
    ref
      ..invalidate(customerProvider(widget.customerKey))
      ..invalidate(customerListProvider);
    showAppSnackBar(context, message, tone: AppTone.success);
  }

  Future<void> _edit([CustomerSite? site]) async {
    final saved = await showSiteSheet(
      context,
      shopId: _shopId,
      customerId: _customerId,
      editing: site,
    );
    if (saved == null || !mounted) return;
    _changed(
      site == null ? CustomerMessages.siteAdded : CustomerMessages.saved,
    );
  }

  Future<void> _setArchived(CustomerSite site, {required bool archived}) async {
    if (archived) {
      final confirmed = await showAppConfirmDialog(
        context: context,
        title: 'Archive ${site.name}?',
        message:
            'New orders can no longer go to this site. Orders already '
            'placed keep it, and you can restore it later.',
        confirmLabel: 'Archive site',
      );
      if (!confirmed || !mounted) return;
    }
    setState(() => _busy.add(site.id));
    try {
      await ref
          .read(shopCustomersRepositoryProvider)
          .updateSite(_shopId, _customerId, site.id, archived: archived);
      if (!mounted) return;
      _changed(
        archived
            ? CustomerMessages.siteArchived
            : CustomerMessages.siteRestored,
      );
    } on Object catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, orderErrorMessage(error), tone: AppTone.error);
    } finally {
      if (mounted) setState(() => _busy.remove(site.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = widget.detail;
    final customer = detail.customer;
    if (customer.kind != CustomerKind.painter) return const SizedBox.shrink();
    if (!detail.canHaveSites) {
      return const AppSection(
        title: 'Sites',
        child: AppInlineMessage(message: CustomerMessages.sitesForAppPainters),
      );
    }
    final secondary = Theme.of(context).textTheme.bodyMedium
        ?.copyWith(color: AppColors.textSecondary);
    return AppSection(
      title: 'Sites',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (detail.sites.isEmpty)
            const AppInlineMessage(message: CustomerMessages.noSites),
          for (final site in detail.sites) ...[
            _SiteCard(
              site: site,
              secondary: secondary,
              actions: [
                AppButton(
                  label: 'Edit',
                  variant: AppButtonVariant.tertiary,
                  onPressed: _busy.contains(site.id) ? null : () => _edit(site),
                ),
                AppButton(
                  label: 'Archive',
                  loadingLabel: 'Archiving…',
                  variant: AppButtonVariant.tertiary,
                  loading: _busy.contains(site.id),
                  onPressed: () => _setArchived(site, archived: true),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.s8),
          ],
          const SizedBox(height: AppSpacing.s8),
          AppButton(
            label: 'Add site',
            icon: Icons.add_location_alt_outlined,
            variant: AppButtonVariant.secondary,
            onPressed: _edit,
          ),
          if (detail.archivedSites.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.s16),
            Text(
              'Archived sites (${detail.archivedSites.length})',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: AppSpacing.s8),
            for (final site in detail.archivedSites) ...[
              _SiteCard(
                site: site,
                secondary: secondary,
                actions: [
                  AppButton(
                    label: 'Restore',
                    loadingLabel: 'Restoring…',
                    variant: AppButtonVariant.tertiary,
                    loading: _busy.contains(site.id),
                    onPressed: () => _setArchived(site, archived: false),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.s8),
            ],
          ],
        ],
      ),
    );
  }
}

class _SiteCard extends StatelessWidget {
  const _SiteCard({
    required this.site,
    required this.secondary,
    required this.actions,
  });

  final CustomerSite site;
  final TextStyle? secondary;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final owner = site.ownerName;
    return AppCard(
      tone: site.archived ? AppCardTone.subtle : AppCardTone.normal,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(site.name, style: Theme.of(context).textTheme.titleMedium),
          if (owner != null) Text('Owner: $owner', style: secondary),
          Text(site.address, style: secondary),
          if (site.hasPin) Text(CustomerMessages.pinFromWeb, style: secondary),
          Wrap(
            alignment: WrapAlignment.end,
            spacing: AppSpacing.s8,
            children: actions,
          ),
        ],
      ),
    );
  }
}
