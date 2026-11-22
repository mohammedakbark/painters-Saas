import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../customers/customer_models.dart';
import '../../customers/customer_providers.dart';
import '../../orders/order_labels.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../../shops/shop_permissions.dart';
import '../../shops/shop_review.dart';
import '../catalogue/catalogue_parts.dart';
import '../shell/shop_shell.dart';
import 'connect_requests_card.dart';
import 'customer_labels.dart';
import 'customer_sheets.dart';

/// The Customers tab (SHP-012): the shop's own customers and the people who
/// order from it in the app, with search, a type filter and Add customer.
class CustomerListScreen extends ConsumerStatefulWidget {
  const CustomerListScreen({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<CustomerListScreen> createState() => _CustomerListScreenState();
}

/// The type chips; empty is "All".
const _allKinds = '';

class _CustomerListScreenState extends ConsumerState<CustomerListScreen> {
  final _search = TextEditingController();
  String _query = '';
  String _kind = _allKinds;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  CustomerListKey get _key => (
    shopId: widget.shopId,
    filter: (
      query: _query,
      kind: _kind == _allKinds ? null : CustomerKind.fromApi(_kind),
    ),
  );

  Future<void> _add() async {
    final created = await showAddCustomerSheet(context, widget.shopId);
    if (created == null || !mounted) return;
    ref.invalidate(customerListProvider);
    showAppSnackBar(context, CustomerMessages.added, tone: AppTone.success);
    context.go('/shops/${widget.shopId}/customers/${created.customer.id}');
  }

  @override
  Widget build(BuildContext context) {
    final customers = ref.watch(customerListProvider(_key));
    final shop = ref.watch(shopProvider(widget.shopId)).value;

    final Widget body;
    if (customers.hasError && customers.error is ShopNotFound) {
      body = const CatalogueShopNotFound();
    } else {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // CON-002: answered by members who manage customers.
          if (shop?.can(ShopPermission.customersManage) ?? false)
            ConnectRequestsCard(shopId: widget.shopId),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.s12,
              AppSpacing.screenPadding,
              AppSpacing.s12,
            ),
            child: AppSearchField(
              label: 'Search customers',
              hint: 'Name or mobile number',
              controller: _search,
              onSubmitted: (query) => setState(() => _query = query.trim()),
            ),
          ),
          AppChoiceChips<String>(
            label: 'Type',
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenPadding,
            ),
            value: _kind,
            options: [
              const AppChipOption(_allKinds, 'All'),
              AppChipOption(CustomerKind.painter.apiValue, 'Painters'),
              AppChipOption(CustomerKind.customer.apiValue, 'Customers'),
            ],
            onChanged: (kind) => setState(() => _kind = kind),
          ),
          const SizedBox(height: AppSpacing.s12),
          Expanded(
            child: customers.when(
              loading: () =>
                  const LoadingView(message: 'Loading your customers…'),
              error: (error, _) => ErrorView(
                title: CustomerMessages.listFailed,
                onRetry: () => ref.invalidate(customerListProvider(_key)),
              ),
              data: (page) => page.items.isEmpty
                  ? _empty()
                  : RefreshIndicator(
                      onRefresh: () =>
                          ref.refresh(customerListProvider(_key).future),
                      child: _CustomerList(
                        page: page,
                        onOpen: (customer) => context.go(
                          '/shops/${widget.shopId}/customers/${customer.id}',
                        ),
                        onLoadMore: () => ref
                            .read(customerListProvider(_key).notifier)
                            .loadMore(),
                      ),
                    ),
            ),
          ),
        ],
      );
    }

    return AppScaffold(
      title: 'Customers',
      subtitle: shop?.name,
      drawer: ShopDrawer(shopId: widget.shopId),
      body: body,
      bottomBar: AppBottomActionBar(
        child: AppButton(
          label: 'Add customer',
          icon: Icons.person_add_alt_1_outlined,
          expand: true,
          onPressed: _add,
        ),
      ),
    );
  }

  Widget _empty() {
    if (_query.isNotEmpty || _kind != _allKinds) {
      return MessageView(
        icon: Icons.search_off,
        title: CustomerMessages.noMatch,
        message: CustomerMessages.noMatchMessage,
        action: AppButton(
          label: 'Show all customers',
          variant: AppButtonVariant.secondary,
          onPressed: () => setState(() {
            _search.clear();
            _query = '';
            _kind = _allKinds;
          }),
        ),
      );
    }
    return const MessageView(
      icon: Icons.people_outline,
      title: CustomerMessages.noCustomers,
      message: CustomerMessages.noCustomersMessage,
    );
  }
}

class _CustomerList extends StatelessWidget {
  const _CustomerList({
    required this.page,
    required this.onOpen,
    required this.onLoadMore,
  });

  final CustomerListState page;
  final ValueChanged<ShopCustomer> onOpen;
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
        for (final item in page.items) ...[
          _CustomerCard(
            key: ValueKey(item.customer.id),
            item: item,
            onOpen: () => onOpen(item.customer),
          ),
          const SizedBox(height: AppSpacing.s12),
        ],
        if (page.loadMoreFailed)
          AppInlineMessage(
            tone: AppTone.error,
            message: CustomerMessages.loadMoreFailed,
            action: Align(
              alignment: Alignment.centerLeft,
              child: AppButton(
                label: 'Try again',
                variant: AppButtonVariant.tertiary,
                onPressed: onLoadMore,
              ),
            ),
          )
        else if (page.hasMore)
          AppButton(
            label: 'Load more',
            loadingLabel: 'Loading…',
            variant: AppButtonVariant.secondary,
            loading: page.loadingMore,
            onPressed: onLoadMore,
          ),
      ],
    );
  }
}

class _CustomerCard extends StatelessWidget {
  const _CustomerCard({super.key, required this.item, required this.onOpen});

  final CustomerListItem item;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final secondary = textTheme.bodyMedium?.copyWith(
      color: AppColors.textSecondary,
    );
    final customer = item.customer;
    final lastOrder = item.lastOrderAt;
    final showsSites =
        customer.kind == CustomerKind.painter && !customer.hasApp;
    return AppCard(
      onTap: onOpen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(customer.name, style: textTheme.titleMedium),
              ),
              const SizedBox(width: AppSpacing.s8),
              AppBadge(
                label: customer.kind.label,
                tone: kindTone(customer.kind),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          Text(
            '${formatPhone(customer.phone)} · '
            '${sourceLabel(customer, short: true)}',
            style: secondary,
          ),
          const SizedBox(height: AppSpacing.s4),
          Text(
            [
              orderCountLabel(item.orderCount),
              if (lastOrder != null) 'last on ${formatIstDate(lastOrder)}',
              if (showsSites) siteCountLabel(item.siteCount),
            ].join(' · '),
            style: secondary,
          ),
        ],
      ),
    );
  }
}
