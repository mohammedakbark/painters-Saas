import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../orders/order_labels.dart';
import '../../orders/order_models.dart';
import '../../orders/order_providers.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../catalogue/catalogue_parts.dart';
import '../shops/sign_out_button.dart';
import 'order_messages.dart';

/// The shop's orders (SHP-007): a chip per step with its count, search,
/// filters and one next-step button per order. While it is open it checks
/// for new orders every 30 seconds.
class OrderListScreen extends ConsumerStatefulWidget {
  const OrderListScreen({
    super.key,
    required this.shopId,
    this.initialTab = OrderTab.open,
  });

  final String shopId;
  final OrderTab initialTab;

  @override
  ConsumerState<OrderListScreen> createState() => _OrderListScreenState();
}

class _OrderListScreenState extends ConsumerState<OrderListScreen>
    with WidgetsBindingObserver {
  final _search = TextEditingController();
  late OrderTab _tab = widget.initialTab;
  String _query = '';
  Fulfilment? _fulfilment;
  bool? _paid;

  /// Orders whose next step is being saved; their buttons wait for the API.
  final Set<String> _stepping = {};

  /// Counts of the last loaded tab, shown while another tab loads.
  Map<OrderTab, int> _counts = const {};
  Timer? _timer;
  bool _inForeground = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(
      ref.read(orderRefreshIntervalProvider),
      (_) => _checkForNewOrders(),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _search.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _inForeground = state == AppLifecycleState.resumed;
  }

  OrderListKey get _key => (
    shopId: widget.shopId,
    filter: (tab: _tab, query: _query, fulfilment: _fulfilment, paid: _paid),
  );

  int get _filterCount =>
      (_fulfilment == null ? 0 : 1) + (_paid == null ? 0 : 1);

  /// Only while this screen is in front: not behind an order or a sheet, and
  /// not while the app is in the background.
  Future<void> _checkForNewOrders() async {
    if (!mounted || !_inForeground || _stepping.isNotEmpty) return;
    if (ModalRoute.of(context)?.isCurrent != true) return;
    final added = await ref.read(orderListProvider(_key).notifier).refresh();
    if (!mounted || added == null || added == 0) return;
    ref.invalidate(orderSummaryProvider(widget.shopId));
    showAppSnackBar(
      context,
      OrderMessages.newOrders(added),
      tone: AppTone.info,
    );
  }

  Future<void> _pullToRefresh() async {
    await ref.read(orderListProvider(_key).notifier).refresh();
    ref.invalidate(orderSummaryProvider(widget.shopId));
  }

  Future<void> _step(OrderRow order, OrderStatus to) async {
    setState(() => _stepping.add(order.id));
    String message;
    var tone = AppTone.success;
    try {
      await ref
          .read(shopOrdersRepositoryProvider)
          .changeStatus(widget.shopId, order.id, to);
      message = '${orderNumberLabel(order.number)}: ${stepDoneMessage(to)}';
    } on Object catch (error) {
      message = orderErrorMessage(error);
      tone = AppTone.error;
    }
    if (!mounted) return;
    // The list is read again either way: after a refusal the order has
    // usually changed somewhere else.
    await ref.read(orderListProvider(_key).notifier).refresh();
    if (!mounted) return;
    ref.invalidate(orderSummaryProvider(widget.shopId));
    setState(() => _stepping.remove(order.id));
    showAppSnackBar(context, message, tone: tone);
  }

  Future<void> _openFilters() async {
    final chosen = await showAppBottomSheet<_Filters>(
      context: context,
      title: 'Filter orders',
      builder: (context) => _FilterForm(initial: _Filters(_fulfilment, _paid)),
    );
    if (chosen == null || !mounted) return;
    setState(() {
      _fulfilment = chosen.fulfilment;
      _paid = chosen.paid;
    });
  }

  @override
  Widget build(BuildContext context) {
    final orders = ref.watch(orderListProvider(_key));
    final loaded = orders.value;
    if (loaded != null) _counts = loaded.counts;

    final Widget body;
    if (orders.hasError && orders.error is ShopNotFound) {
      body = const CatalogueShopNotFound();
    } else {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.s12),
          AppChoiceChips<OrderTab>(
            label: 'Order step',
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenPadding,
            ),
            value: _tab,
            options: [
              for (final tab in OrderTab.values)
                AppChipOption(tab, orderTabLabel(tab), count: _counts[tab]),
            ],
            onChanged: (tab) => setState(() => _tab = tab),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.s12,
              AppSpacing.screenPadding,
              AppSpacing.s12,
            ),
            child: Row(
              children: [
                Expanded(
                  child: AppSearchField(
                    label: 'Search orders',
                    hint: 'Order number, name or mobile',
                    controller: _search,
                    onSubmitted: (query) => setState(() => _query = query),
                  ),
                ),
                const SizedBox(width: AppSpacing.s8),
                AppButton(
                  label: _filterCount == 0
                      ? 'Filter'
                      : 'Filter ($_filterCount)',
                  icon: Icons.tune,
                  variant: AppButtonVariant.secondary,
                  onPressed: _openFilters,
                ),
              ],
            ),
          ),
          Expanded(
            child: orders.when(
              loading: () => const LoadingView(message: 'Loading your orders…'),
              error: (error, _) => ErrorView(
                title: OrderMessages.listFailed,
                onRetry: () => ref.invalidate(orderListProvider(_key)),
              ),
              data: (page) => page.items.isEmpty
                  ? _empty(page)
                  : RefreshIndicator(
                      onRefresh: _pullToRefresh,
                      child: _OrderList(
                        page: page,
                        stepping: _stepping,
                        onOpen: (order) => context.go(
                          '/shops/${widget.shopId}/orders/${order.id}',
                        ),
                        onStep: _step,
                        onLoadMore: () => ref
                            .read(orderListProvider(_key).notifier)
                            .loadMore(),
                      ),
                    ),
            ),
          ),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        actions: const [SignOutButton()],
      ),
      body: SafeArea(child: body),
    );
  }

  Widget _empty(OrderListState page) {
    if (_query.isNotEmpty || _filterCount > 0) {
      return MessageView(
        icon: Icons.search_off,
        title: OrderMessages.noMatch,
        message: OrderMessages.noMatchMessage,
        action: _filterCount == 0
            ? null
            : AppButton(
                label: 'Clear filters',
                variant: AppButtonVariant.secondary,
                onPressed: () => setState(() {
                  _fulfilment = null;
                  _paid = null;
                }),
              ),
      );
    }
    if ((page.counts[OrderTab.all] ?? 0) == 0) {
      return const MessageView(
        icon: Icons.receipt_long_outlined,
        title: OrderMessages.noOrders,
        message: OrderMessages.noOrdersMessage,
      );
    }
    return const MessageView(
      icon: Icons.receipt_long_outlined,
      title: OrderMessages.nothingInStep,
      message: OrderMessages.nothingInStepMessage,
    );
  }
}

class _OrderList extends StatelessWidget {
  const _OrderList({
    required this.page,
    required this.stepping,
    required this.onOpen,
    required this.onStep,
    required this.onLoadMore,
  });

  final OrderListState page;
  final Set<String> stepping;
  final ValueChanged<OrderRow> onOpen;
  final void Function(OrderRow order, OrderStatus to) onStep;
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
        for (final order in page.items) ...[
          _OrderCard(
            key: ValueKey(order.id),
            order: order,
            stepping: stepping.contains(order.id),
            onOpen: () => onOpen(order),
            onStep: (to) => onStep(order, to),
          ),
          const SizedBox(height: AppSpacing.s12),
        ],
        if (page.loadMoreFailed)
          AppInlineMessage(
            tone: AppTone.error,
            message: OrderMessages.loadMoreFailed,
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

/// Money in tabular figures, so totals line up.
const _tabular = [FontFeature.tabularFigures()];

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    super.key,
    required this.order,
    required this.stepping,
    required this.onOpen,
    required this.onStep,
  });

  final OrderRow order;
  final bool stepping;
  final VoidCallback onOpen;
  final ValueChanged<OrderStatus> onStep;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final secondary = textTheme.bodyMedium?.copyWith(
      color: AppColors.textSecondary,
    );
    final next = nextStepFor(order.status, order.fulfilment);
    final site = order.siteLabel;
    return AppCard(
      onTap: onOpen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  orderNumberLabel(order.number),
                  style: textTheme.titleMedium?.copyWith(
                    fontFeatures: _tabular,
                  ),
                ),
              ),
              AppBadge(
                label: orderStatusLabel(order.status),
                tone: orderStatusTone(order.status),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          Text(
            '${formatOrderTime(order.placedAt)} · '
            '${fulfilmentLabel(order.fulfilment)}',
            style: secondary,
          ),
          const SizedBox(height: AppSpacing.s8),
          Text(order.customer.name, style: textTheme.bodyLarge),
          Text(
            [formatPhone(order.customer.phone), ?site].join(' · '),
            style: secondary,
          ),
          const SizedBox(height: AppSpacing.s8),
          Wrap(
            spacing: AppSpacing.s8,
            runSpacing: AppSpacing.s4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                formatRupees(order.totalPaise),
                style: textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  fontFeatures: _tabular,
                ),
              ),
              Text(itemCountLabel(order.itemCount), style: secondary),
              if (order.status != OrderStatus.cancelled)
                AppBadge(
                  label: order.paid ? 'Paid' : 'Unpaid',
                  tone: order.paid ? AppTone.success : AppTone.warning,
                ),
              if (order.notAvailableCount > 0)
                AppBadge(
                  label: '${order.notAvailableCount} not available',
                  tone: AppTone.warning,
                ),
            ],
          ),
          if (next != null) ...[
            const SizedBox(height: AppSpacing.s12),
            AppButton(
              label: stepActionLabel(next),
              loadingLabel: 'Saving…',
              variant: AppButtonVariant.secondary,
              loading: stepping,
              expand: true,
              onPressed: () => onStep(next),
            ),
          ],
        ],
      ),
    );
  }
}

class _Filters {
  const _Filters(this.fulfilment, this.paid);

  final Fulfilment? fulfilment;
  final bool? paid;
}

class _FilterForm extends StatefulWidget {
  const _FilterForm({required this.initial});

  final _Filters initial;

  @override
  State<_FilterForm> createState() => _FilterFormState();
}

class _FilterFormState extends State<_FilterForm> {
  late Fulfilment? _fulfilment = widget.initial.fulfilment;
  late bool? _paid = widget.initial.paid;

  @override
  Widget build(BuildContext context) {
    final label = Theme.of(context).textTheme.bodyMedium
        ?.copyWith(fontWeight: FontWeight.w500);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Pickup or delivery', style: label),
        const SizedBox(height: AppSpacing.s8),
        AppSegmentedControl<String>(
          value: _fulfilment?.apiValue ?? '',
          options: const [
            AppOption('', 'Both'),
            AppOption('PICKUP', 'Pickup'),
            AppOption('DELIVERY', 'Delivery'),
          ],
          onChanged: (value) => setState(
            () =>
                _fulfilment = value.isEmpty ? null : Fulfilment.fromApi(value),
          ),
        ),
        const SizedBox(height: AppSpacing.s16),
        Text('Payment', style: label),
        const SizedBox(height: AppSpacing.s8),
        AppSegmentedControl<String>(
          value: switch (_paid) {
            null => '',
            true => 'PAID',
            false => 'UNPAID',
          },
          options: const [
            AppOption('', 'Both'),
            AppOption('UNPAID', 'Unpaid'),
            AppOption('PAID', 'Paid'),
          ],
          onChanged: (value) =>
              setState(() => _paid = value.isEmpty ? null : value == 'PAID'),
        ),
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: 'Show orders',
          expand: true,
          onPressed: () =>
              Navigator.of(context).pop(_Filters(_fulfilment, _paid)),
        ),
        const SizedBox(height: AppSpacing.s8),
        AppButton(
          label: 'Clear filters',
          variant: AppButtonVariant.tertiary,
          expand: true,
          onPressed: () =>
              Navigator.of(context).pop(const _Filters(null, null)),
        ),
      ],
    );
  }
}
