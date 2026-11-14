import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../orders/order_labels.dart';
import '../../orders/order_models.dart';
import '../../orders/order_providers.dart';
import '../../orders/shop_orders_repository.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../catalogue/catalogue_parts.dart';
import '../shops/sign_out_button.dart';
import 'order_messages.dart';
import 'order_sheets.dart';

/// One order (SHP-007): the next step, items with not available, substitute
/// and return, totals, the customer, pickup or delivery, payment and the
/// timeline. Payments and returns are for the owner (D-053).
class OrderScreen extends ConsumerWidget {
  const OrderScreen({super.key, required this.shopId, required this.orderId});

  final String shopId;
  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = (shopId: shopId, orderId: orderId);
    final order = ref.watch(orderProvider(key));
    final isOwner = ref.watch(shopProvider(shopId)).value?.myRole == 'MASTER';
    return Scaffold(
      appBar: AppBar(
        title: Text(
          order.value == null
              ? 'Order'
              : 'Order ${orderNumberLabel(order.value!.number)}',
        ),
        actions: const [SignOutButton()],
      ),
      body: SafeArea(
        child: order.when(
          loading: () => const LoadingView(message: 'Loading the order…'),
          error: (error, _) => switch (error) {
            ShopNotFound() => const CatalogueShopNotFound(),
            OrderNotFound() => MessageView(
              icon: Icons.search_off,
              title: OrderMessages.orderNotFound,
              message: OrderMessages.orderNotFoundMessage,
              action: AppButton(
                label: 'Go to your orders',
                variant: AppButtonVariant.secondary,
                onPressed: () => context.go('/shops/$shopId/orders'),
              ),
            ),
            _ => ErrorView(
              title: OrderMessages.orderFailed,
              onRetry: () => ref.invalidate(orderProvider(key)),
            ),
          },
          data: (order) =>
              _OrderDetails(orderKey: key, order: order, isOwner: isOwner),
        ),
      ),
    );
  }
}

/// Money in tabular figures, so amounts line up.
const _tabular = [FontFeature.tabularFigures()];

class _OrderDetails extends ConsumerStatefulWidget {
  const _OrderDetails({
    required this.orderKey,
    required this.order,
    required this.isOwner,
  });

  final OrderKey orderKey;
  final OrderDetail order;
  final bool isOwner;

  @override
  ConsumerState<_OrderDetails> createState() => _OrderDetailsState();
}

class _OrderDetailsState extends ConsumerState<_OrderDetails> {
  bool _stepping = false;

  OrderDetail get _order => widget.order;

  void _tell(String message, {AppTone tone = AppTone.success}) {
    if (mounted) showAppSnackBar(context, message, tone: tone);
  }

  Future<void> _step(OrderStatus to) async {
    setState(() => _stepping = true);
    try {
      await ref
          .read(orderProvider(widget.orderKey).notifier)
          .apply(
            (repository, shopId, orderId) =>
                repository.changeStatus(shopId, orderId, to),
          );
      _tell(stepDoneMessage(to));
    } on Object catch (error) {
      _tell(orderErrorMessage(error), tone: AppTone.error);
    } finally {
      if (mounted) setState(() => _stepping = false);
    }
  }

  Future<void> _cancel() async {
    if (await showCancelOrderSheet(context, orderKey: widget.orderKey)) {
      _tell(stepDoneMessage(OrderStatus.cancelled));
    }
  }

  Future<void> _notAvailable(OrderItem item) async {
    if (await showNotAvailableSheet(
      context,
      orderKey: widget.orderKey,
      item: item,
    )) {
      _tell(OrderMessages.notAvailableSaved);
    }
  }

  Future<void> _substitute(OrderItem item) async {
    if (await showSubstituteSheet(
      context,
      orderKey: widget.orderKey,
      item: item,
    )) {
      _tell(OrderMessages.substituteSaved);
    }
  }

  Future<void> _return(OrderItem item) async {
    if (await showReturnSheet(context, orderKey: widget.orderKey, item: item)) {
      _tell(OrderMessages.returnSaved);
    }
  }

  Future<void> _pay() async {
    if (await showPaymentSheet(
      context,
      orderKey: widget.orderKey,
      totalPaise: _order.totalPaise,
    )) {
      _tell(OrderMessages.paymentSaved);
    }
  }

  Future<void> _open(Uri link, String failure) async {
    var opened = false;
    try {
      opened = await ref.read(linkOpenerProvider)(link);
    } on Object {
      opened = false;
    }
    if (!opened) _tell(failure, tone: AppTone.error);
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final textTheme = Theme.of(context).textTheme;
    final secondary = textTheme.bodyMedium?.copyWith(
      color: AppColors.textSecondary,
    );
    final next = order.nextStep;
    final cancelReason = order.cancelReason;
    return RefreshIndicator(
      onRefresh: () => ref.refresh(orderProvider(widget.orderKey).future),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        children: [
          Wrap(
            spacing: AppSpacing.s12,
            runSpacing: AppSpacing.s8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Semantics(
                header: true,
                child: Text(
                  'Order ${orderNumberLabel(order.number)}',
                  style: textTheme.headlineSmall,
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
            '${fulfilmentLabel(order.fulfilment)} · '
            '${formatOrderTime(order.placedAt)}',
            style: secondary,
          ),
          if (order.status == OrderStatus.cancelled) ...[
            const SizedBox(height: AppSpacing.s12),
            AppInlineMessage(
              tone: AppTone.error,
              title: order.cancelledByCustomer == true
                  ? 'Cancelled by the customer'
                  : 'Cancelled by the shop',
              message: cancelReason ?? 'No reason was given.',
            ),
          ],
          if (next != null) ...[
            const SizedBox(height: AppSpacing.s16),
            AppButton(
              label: stepActionLabel(next),
              loadingLabel: 'Saving…',
              loading: _stepping,
              expand: true,
              onPressed: () => _step(next),
            ),
          ],
          if (order.canCancel) ...[
            const SizedBox(height: AppSpacing.s8),
            AppButton(
              label: 'Cancel order',
              variant: AppButtonVariant.tertiary,
              expand: true,
              onPressed: _stepping ? null : _cancel,
            ),
          ],
          const SizedBox(height: AppSpacing.s16),
          AppSection(
            title: 'Items',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (order.canEditItems)
                  Text(OrderMessages.editItemsHint, style: secondary),
                for (final item in order.items.where(
                  (item) => item.substituteForId == null,
                )) ...[
                  const SizedBox(height: AppSpacing.s12),
                  _ItemLine(
                    item: item,
                    canEdit: order.canEditItems,
                    canReturn: order.canReturnItems && widget.isOwner,
                    onNotAvailable: () => _notAvailable(item),
                    onSubstitute: () => _substitute(item),
                    onReturn: () => _return(item),
                  ),
                  for (final substitute in order.items.where(
                    (other) => other.substituteForId == item.id,
                  ))
                    Padding(
                      padding: const EdgeInsets.only(
                        left: AppSpacing.s16,
                        top: AppSpacing.s8,
                      ),
                      child: _ItemLine(
                        item: substitute,
                        isSubstitute: true,
                        canEdit: false,
                        canReturn: order.canReturnItems && widget.isOwner,
                        onNotAvailable: () {},
                        onSubstitute: () {},
                        onReturn: () => _return(substitute),
                      ),
                    ),
                ],
                const SizedBox(height: AppSpacing.s16),
                _AmountRow(label: 'Items', paise: order.itemsPaise),
                if (order.fulfilment == Fulfilment.delivery)
                  _AmountRow(
                    label: 'Delivery',
                    paise: order.deliveryChargePaise,
                    zeroLabel: 'Free',
                  ),
                _AmountRow(
                  label: 'Total',
                  paise: order.totalPaise,
                  strong: true,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s12),
          AppSection(
            title: 'Customer',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(order.customer.name, style: textTheme.bodyLarge),
                Text(
                  order.recordedByShop
                      ? OrderMessages.recordedByShop
                      : OrderMessages.ordersInApp,
                  style: secondary,
                ),
                if (order.siteLabel case final site?)
                  Text('Site: $site', style: secondary),
                const SizedBox(height: AppSpacing.s8),
                AppButton(
                  label: 'Call ${formatPhone(order.customer.phone)}',
                  icon: Icons.call_outlined,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => _open(
                    Uri(scheme: 'tel', path: order.customer.phone),
                    OrderMessages.callFailed,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s12),
          _FulfilmentSection(order: order, onOpenMap: _open),
          const SizedBox(height: AppSpacing.s12),
          AppSection(
            title: 'Payment',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppBadge(
                  label: order.paid ? 'Paid' : 'Unpaid',
                  tone: order.paid ? AppTone.success : AppTone.warning,
                ),
                const SizedBox(height: AppSpacing.s8),
                if (order.paid)
                  Text(
                    [
                      if (order.paymentMethod case final method?)
                        paymentMethodLabel(method),
                      if (order.paidAt case final at?) formatOrderTime(at),
                    ].join(' · '),
                    style: textTheme.bodyLarge,
                  )
                else if (order.canRecordPayment && widget.isOwner)
                  AppButton(
                    label: 'Record payment',
                    variant: AppButtonVariant.secondary,
                    onPressed: _pay,
                  )
                else if (order.status != OrderStatus.cancelled)
                  Text(
                    order.canRecordPayment
                        ? OrderMessages.ownerRecordsPayment
                        : OrderMessages.payWhenReady,
                    style: secondary,
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s12),
          AppSection(
            title: 'Timeline',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final event in order.events.reversed)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.s8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(eventSentence(event), style: textTheme.bodyLarge),
                        Text(
                          formatOrderTime(event.createdAt),
                          style: secondary,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemLine extends StatelessWidget {
  const _ItemLine({
    required this.item,
    required this.canEdit,
    required this.canReturn,
    required this.onNotAvailable,
    required this.onSubstitute,
    required this.onReturn,
    this.isSubstitute = false,
  });

  final OrderItem item;
  final bool canEdit;
  final bool canReturn;
  final VoidCallback onNotAvailable;
  final VoidCallback onSubstitute;
  final VoidCallback onReturn;
  final bool isSubstitute;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final secondary = textTheme.bodyMedium?.copyWith(
      color: AppColors.textSecondary,
    );
    final counts = item.status == OrderItemStatus.ok;
    final struck = counts ? null : TextDecoration.lineThrough;
    final badge = itemStatusBadge(item.status);
    final shade = [?item.shadeCode, ?item.shadeName].join(' ');
    // A waiting substitute is offered on the original line; a new one can be
    // suggested only when none is open.
    final editable = canEdit && counts && !isSubstitute;
    final returnable = canReturn && counts && item.returnableQuantity > 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                isSubstitute
                    ? 'Substitute: ${item.productName}'
                    : item.productName,
                style: textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w500,
                  decoration: struck,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.s8),
            Text(
              formatRupees(item.quantity * item.unitPricePaise),
              style: textTheme.bodyLarge?.copyWith(
                fontFeatures: _tabular,
                decoration: struck,
              ),
            ),
          ],
        ),
        Text(
          [
            ?item.brandName,
            item.packLabel,
            if (shade.isNotEmpty) 'Shade $shade',
            quantityTimesPrice(item.quantity, item.unitPricePaise),
          ].join(' · '),
          style: secondary,
        ),
        if (badge != null) ...[
          const SizedBox(height: AppSpacing.s4),
          Align(
            alignment: Alignment.centerLeft,
            child: AppBadge(label: badge.label, tone: badge.tone),
          ),
        ],
        if (item.shopNote case final note?)
          Text('Message: $note', style: secondary),
        if (item.returnedQuantity > 0)
          Text(
            item.returnedQuantity == 1
                ? '1 unit returned'
                : '${item.returnedQuantity} units returned',
            style: secondary,
          ),
        if (editable || returnable)
          Wrap(
            spacing: AppSpacing.s8,
            children: [
              if (editable) ...[
                AppButton(
                  label: 'Not available',
                  variant: AppButtonVariant.tertiary,
                  onPressed: onNotAvailable,
                ),
                AppButton(
                  label: 'Suggest substitute',
                  variant: AppButtonVariant.tertiary,
                  onPressed: onSubstitute,
                ),
              ],
              if (returnable)
                AppButton(
                  label: 'Record return',
                  variant: AppButtonVariant.tertiary,
                  onPressed: onReturn,
                ),
            ],
          )
        else if (canEdit &&
            !isSubstitute &&
            item.status == OrderItemStatus.notAvailable)
          Align(
            alignment: Alignment.centerLeft,
            child: AppButton(
              label: 'Suggest substitute',
              variant: AppButtonVariant.tertiary,
              onPressed: onSubstitute,
            ),
          ),
      ],
    );
  }
}

class _AmountRow extends StatelessWidget {
  const _AmountRow({
    required this.label,
    required this.paise,
    this.zeroLabel,
    this.strong = false,
  });

  final String label;
  final int paise;

  /// Shown instead of ₹0, for example "Free".
  final String? zeroLabel;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodyLarge?.copyWith(
      fontWeight: strong ? FontWeight.w600 : null,
      fontFeatures: _tabular,
    );
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.s4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(
            paise == 0 && zeroLabel != null ? zeroLabel! : formatRupees(paise),
            style: style,
          ),
        ],
      ),
    );
  }
}

class _FulfilmentSection extends StatelessWidget {
  const _FulfilmentSection({required this.order, required this.onOpenMap});

  final OrderDetail order;
  final void Function(Uri link, String failure) onOpenMap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final secondary = textTheme.bodyMedium?.copyWith(
      color: AppColors.textSecondary,
    );
    final delivery = order.delivery;
    if (order.fulfilment == Fulfilment.pickup || delivery == null) {
      return AppSection(
        title: fulfilmentLabel(order.fulfilment),
        lines: [
          if (order.fulfilment == Fulfilment.pickup)
            'The customer collects the order from your shop.',
        ],
      );
    }
    final latitude = delivery.latitude;
    final longitude = delivery.longitude;
    final distance = delivery.distanceKm;
    return AppSection(
      title: 'Delivery',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(delivery.address, style: textTheme.bodyLarge),
          if (distance != null)
            Text(
              '${distance.toStringAsFixed(1)} km from your shop',
              style: secondary,
            ),
          const SizedBox(height: AppSpacing.s8),
          if (latitude != null && longitude != null)
            AppButton(
              label: 'Open in maps',
              icon: Icons.map_outlined,
              variant: AppButtonVariant.secondary,
              onPressed: () => onOpenMap(
                Uri.parse('geo:$latitude,$longitude?q=$latitude,$longitude'),
                OrderMessages.mapFailed,
              ),
            )
          else
            Text(OrderMessages.noMapPin, style: secondary),
        ],
      ),
    );
  }
}
