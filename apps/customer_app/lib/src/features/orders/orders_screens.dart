import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../orders/checkout.dart';
import '../../orders/my_orders.dart';
import '../../routing/paths.dart';
import '../cart/cart_button.dart';

/// The badge tone for each step (DESIGN_SYSTEM §6, ORD-002).
AppTone orderTone(OrderStatus status) => switch (status) {
  OrderStatus.newOrder => AppTone.info,
  OrderStatus.packing => AppTone.warning,
  OrderStatus.readyForPickup || OrderStatus.outForDelivery => AppTone.success,
  OrderStatus.completed => AppTone.neutral,
  OrderStatus.cancelled => AppTone.error,
};

/// "20 Nov 2026, 9:58 am".
String formatPlacedAt(DateTime time) {
  final local = time.toLocal();
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final minute = local.minute.toString().padLeft(2, '0');
  final half = local.hour < 12 ? 'am' : 'pm';
  return '${local.day} ${months[local.month - 1]} ${local.year}, '
      '$hour:$minute $half';
}

/// The steps for the indicator: New, Packing, Ready for pickup or Out for
/// delivery, Completed. Empty for a cancelled order.
List<AppStep> orderSteps(OrderStatus status, Fulfilment fulfilment) {
  if (status == OrderStatus.cancelled) return const [];
  final steps = [
    OrderStatus.newOrder,
    OrderStatus.packing,
    if (fulfilment == Fulfilment.pickup)
      OrderStatus.readyForPickup
    else
      OrderStatus.outForDelivery,
    OrderStatus.completed,
  ];
  final at = steps.indexOf(status);
  return [
    for (final (index, step) in steps.indexed)
      AppStep(
        step.label,
        index < at || status == OrderStatus.completed
            ? AppStepState.done
            : index == at
            ? AppStepState.current
            : AppStepState.todo,
      ),
  ];
}

/// My Orders (CUS-006, design "Customer App › My Orders"): orders from every
/// shop, newest first, with Load more and pull to refresh.
class MyOrdersScreen extends ConsumerWidget {
  const MyOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(myOrdersProvider);
    return AppScaffold(
      title: 'My Orders',
      actions: const [CartButton()],
      body: orders.when(
        loading: () => const LoadingView(message: 'Loading your orders…'),
        error: (error, _) => ErrorView(
          title: "We couldn't load your orders",
          onRetry: () => ref.invalidate(myOrdersProvider),
        ),
        data: (state) => state.items.isEmpty
            ? const MessageView(
                icon: Icons.receipt_long_outlined,
                title: 'No orders yet',
                message: 'Orders you place with a shop will appear here.',
              )
            : RefreshIndicator(
                onRefresh: () => ref.refresh(myOrdersProvider.future),
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.screenPadding),
                  children: [
                    for (final order in state.items) ...[
                      _OrderCard(order: order),
                      const SizedBox(height: AppSpacing.s12),
                    ],
                    if (state.hasMore)
                      AppButton(
                        key: const Key('orders-load-more'),
                        label: 'Load more',
                        loadingLabel: 'Loading…',
                        loading: state.loadingMore,
                        variant: AppButtonVariant.secondary,
                        expand: true,
                        onPressed: () async {
                          try {
                            await ref
                                .read(myOrdersProvider.notifier)
                                .loadMore();
                          } on Object {
                            if (context.mounted) {
                              showAppSnackBar(
                                context,
                                "We couldn't load more orders. Try again.",
                                tone: AppTone.error,
                              );
                            }
                          }
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});

  final MyOrderSummary order;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final site = order.siteLabel;
    return AppCard(
      key: ValueKey('order-${order.id}'),
      onTap: () => context.push(orderPath(order.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  order.shopName,
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              AppBadge(
                label: order.status.label,
                tone: orderTone(order.status),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          Row(
            children: [
              Expanded(
                child: Text(
                  [
                    '#${order.number}',
                    formatPlacedAt(order.placedAt),
                    ?site,
                  ].join(' · '),
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              Text(
                formatRupees(order.totalPaise),
                style: textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          if (order.needsAnswer) ...[
            const SizedBox(height: AppSpacing.s8),
            const AppBadge(
              label: 'A substitute needs your answer',
              tone: AppTone.warning,
            ),
          ],
        ],
      ),
    );
  }
}

/// "Order placed" (design "Customer App › Order placed").
class OrderPlacedScreen extends StatelessWidget {
  const OrderPlacedScreen({
    super.key,
    required this.orderId,
    required this.number,
    this.siteName,
  });

  final String orderId;
  final int? number;

  /// The painter's site the order is for (CUS-007).
  final String? siteName;

  @override
  Widget build(BuildContext context) {
    final number = this.number;
    final siteName = this.siteName;
    return AppScaffold(
      title: 'Order placed',
      bottomBar: AppBottomActionBar(
        child: Row(
          children: [
            Expanded(
              child: AppButton(
                key: const Key('keep-shopping'),
                label: 'Keep shopping',
                variant: AppButtonVariant.secondary,
                expand: true,
                onPressed: () => context.go(homePath),
              ),
            ),
            const SizedBox(width: AppSpacing.s12),
            Expanded(
              child: AppButton(
                key: const Key('track-order'),
                label: 'Track order',
                expand: true,
                onPressed: () => context.pushReplacement(orderPath(orderId)),
              ),
            ),
          ],
        ),
      ),
      body: MessageView(
        icon: Icons.check_circle_outline,
        title: 'Order placed',
        message: number == null
            ? 'The shop starts packing it now. You pay at pickup or delivery.'
            : '#$number is with the shop. They start packing it now. You pay '
                  'at pickup or delivery.',
        action: siteName == null
            ? null
            : AppInlineMessage(
                key: const Key('added-to-site-spend'),
                message: "Added to $siteName's spend.",
              ),
      ),
    );
  }
}

/// One order (design "Customer App › Order tracking"): steps, substitutes
/// to answer (D-045), items, totals, payment and Cancel while it is new or
/// packing (D-047).
class OrderScreen extends ConsumerStatefulWidget {
  const OrderScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends ConsumerState<OrderScreen> {
  String? _busyItem;
  bool _cancelling = false;

  MyOrderNotifier get _notifier =>
      ref.read(myOrderProvider(widget.orderId).notifier);

  Future<void> _answer(String itemId, {required bool accept}) async {
    setState(() => _busyItem = itemId);
    try {
      await _notifier.answer(itemId, accept: accept);
      if (mounted) {
        showAppSnackBar(
          context,
          accept ? 'Substitute accepted.' : 'Substitute declined.',
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        showAppSnackBar(
          context,
          error.detail ?? "We couldn't send your answer. Try again.",
          tone: AppTone.error,
        );
        ref.invalidate(myOrderProvider(widget.orderId));
      }
    } finally {
      if (mounted) setState(() => _busyItem = null);
    }
  }

  Future<void> _cancel(MyOrder order) async {
    final confirmed = await showAppConfirmDialog(
      context: context,
      title: 'Cancel order #${order.number}?',
      message: '${order.shopName} will stop working on it.',
      confirmLabel: 'Cancel order',
      cancelLabel: 'Keep order',
      destructive: true,
    );
    if (!confirmed || !mounted) return;
    setState(() => _cancelling = true);
    try {
      await _notifier.cancel();
      if (mounted) showAppSnackBar(context, 'Order cancelled.');
    } on ApiException catch (error) {
      if (mounted) {
        showAppSnackBar(
          context,
          error.detail ?? "We couldn't cancel the order. Try again.",
          tone: AppTone.error,
        );
        ref.invalidate(myOrderProvider(widget.orderId));
      }
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = ref.watch(myOrderProvider(widget.orderId));
    return switch (order) {
      AsyncData(:final value) => _content(value),
      AsyncError(:final error) => AppScaffold(
        title: 'Order',
        body: error is ApiException && error.status == 404
            ? const MessageView(
                icon: Icons.search_off,
                title: 'Order not found',
                message: 'It may belong to another account.',
              )
            : ErrorView(
                title: "We couldn't load this order",
                onRetry: () => ref.invalidate(myOrderProvider(widget.orderId)),
              ),
      ),
      _ => const AppScaffold(title: 'Order', body: LoadingView()),
    };
  }

  Widget _content(MyOrder order) {
    final textTheme = Theme.of(context).textTheme;
    final steps = orderSteps(order.status, order.fulfilment);
    final site = order.siteLabel;
    final address = order.deliveryAddress;
    return AppScaffold(
      title: 'Order #${order.number}',
      subtitle: '${order.shopName} · ${formatPlacedAt(order.placedAt)}',
      bottomBar: order.canCancel
          ? AppBottomActionBar(
              child: AppButton(
                key: const Key('cancel-order'),
                label: 'Cancel order',
                loadingLabel: 'Cancelling…',
                loading: _cancelling,
                variant: AppButtonVariant.secondary,
                expand: true,
                onPressed: () => _cancel(order),
              ),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(myOrderProvider(widget.orderId).future),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            if (steps.isEmpty)
              AppInlineMessage(
                tone: AppTone.warning,
                message: order.cancelledByShop
                    ? 'The shop cancelled this order.'
                          '${order.cancelReason == null ? '' : ' Reason: ${order.cancelReason}'}'
                    : 'You cancelled this order.',
              )
            else
              AppCard(child: AppProgressSteps(steps: steps)),
            for (final open in order.openSubstitutes) ...[
              const SizedBox(height: AppSpacing.s12),
              AppInlineMessage(
                tone: AppTone.warning,
                message:
                    '${open.original?.productName ?? 'An item'} '
                    '${open.original?.packLabel ?? ''} is not available. '
                    'The shop suggests ${open.offer.quantity} × '
                    '${open.offer.productName} ${open.offer.packLabel}'
                    '${open.offer.shadeCode == null ? '' : ' (${open.offer.shadeCode})'}'
                    ' for ${formatRupees(open.offer.unitPricePaise * open.offer.quantity)}.',
                action: Row(
                  children: [
                    Expanded(
                      child: AppButton(
                        key: ValueKey('decline-${open.offer.id}'),
                        label: 'Decline',
                        variant: AppButtonVariant.secondary,
                        expand: true,
                        onPressed: _busyItem == null
                            ? () => _answer(open.offer.id, accept: false)
                            : null,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.s8),
                    Expanded(
                      child: AppButton(
                        key: ValueKey('accept-${open.offer.id}'),
                        label: 'Accept',
                        loadingLabel: 'Sending…',
                        loading: _busyItem == open.offer.id,
                        expand: true,
                        onPressed: _busyItem == null
                            ? () => _answer(open.offer.id, accept: true)
                            : null,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.s16),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    order.fulfilment == Fulfilment.pickup
                        ? 'Pickup at ${order.shopName}'
                        : 'Delivery',
                    style: textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (site != null) Text('Site: $site'),
                  if (address != null)
                    Text(
                      address,
                      style: textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.s16),
            Semantics(
              header: true,
              child: Text(
                'Items',
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.s8),
            AppCard(
              child: Column(
                children: [
                  for (final (index, item) in order.items.indexed) ...[
                    if (index > 0) const Divider(),
                    _ItemRow(item: item),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.s12),
            AppCard(
              child: Column(
                children: [
                  _total('Items', formatRupees(order.itemsPaise)),
                  _total(
                    order.fulfilment == Fulfilment.pickup
                        ? 'Pickup'
                        : 'Delivery',
                    order.deliveryPaise == 0
                        ? 'Free'
                        : formatRupees(order.deliveryPaise),
                  ),
                  const Divider(),
                  _total('Total', formatRupees(order.totalPaise), strong: true),
                  const SizedBox(height: AppSpacing.s4),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: AppBadge(
                      label: order.paid
                          ? 'Paid · ${_method(order.paymentMethod)}'
                          : order.fulfilment == Fulfilment.pickup
                          ? 'Pay at pickup'
                          : 'Pay at delivery',
                      tone: order.paid ? AppTone.success : AppTone.neutral,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _method(String? method) => switch (method) {
    'CASH' => 'Cash',
    'UPI' => 'UPI',
    'BANK_TRANSFER' => 'Bank transfer',
    _ => 'recorded by the shop',
  };

  Widget _total(String label, String value, {bool strong = false}) {
    final style = strong
        ? Theme.of(context).textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.w800)
        : Theme.of(context).textTheme.bodyLarge;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.s4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

class _ItemRow extends StatelessWidget {
  const _ItemRow({required this.item});

  final MyOrderItem item;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final counts = item.status == OrderItemStatus.ok;
    final shade = item.shadeCode;
    final note = item.shopNote;
    final (String? badge, AppTone tone) = switch (item.status) {
      OrderItemStatus.notAvailable => ('Not available', AppTone.warning),
      OrderItemStatus.substituted => ('Replaced', AppTone.neutral),
      OrderItemStatus.substituteOffered => ('Suggested', AppTone.info),
      OrderItemStatus.substituteDeclined => ('Declined', AppTone.neutral),
      OrderItemStatus.ok => (null, AppTone.neutral),
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.s4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  [
                    item.packLabel,
                    '${item.quantity} × ${formatRupees(item.unitPricePaise)}',
                    if (shade != null)
                      item.shadeName == null
                          ? shade
                          : '$shade ${item.shadeName}',
                  ].join(' · '),
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                if (badge != null) ...[
                  const SizedBox(height: AppSpacing.s4),
                  AppBadge(label: badge, tone: tone),
                ],
                if (note != null && item.status != OrderItemStatus.ok)
                  Text(
                    note,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
              ],
            ),
          ),
          Text(
            counts ? formatRupees(item.linePaise) : '—',
            style: textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
