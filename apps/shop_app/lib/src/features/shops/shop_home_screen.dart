import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../catalogue/catalogue_providers.dart';
import '../../orders/order_models.dart';
import '../../orders/order_providers.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../../shops/shop_models.dart';
import '../../shops/shop_permissions.dart';
import '../../shops/shop_review.dart';
import '../shell/shop_shell.dart';
import 'review_messages.dart';

/// The shop's Home tab (SHP-011), like the web Overview: status, what needs
/// doing, today's order figures, product figures and shortcuts. Each part is
/// shown only to people who may use it (D-056) and loads on its own.
class ShopHomeScreen extends ConsumerWidget {
  const ShopHomeScreen({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shop = ref.watch(shopProvider(shopId));
    return AppScaffold(
      title: 'Home',
      subtitle: shop.value?.name,
      drawer: ShopDrawer(shopId: shopId),
      body: shop.when(
        loading: () => const LoadingView(message: 'Loading your shop…'),
        error: (error, _) => error is ShopNotFound
            ? MessageView(
                icon: Icons.search_off,
                title: 'Shop not found',
                message:
                    "This shop doesn't exist, or your account doesn't have "
                    'access to it.',
                action: AppButton(
                  label: 'Go to your shops',
                  variant: AppButtonVariant.secondary,
                  onPressed: () => context.go('/shops'),
                ),
              )
            : ErrorView(
                title: "We couldn't load this shop",
                onRetry: () => ref.invalidate(shopProvider(shopId)),
              ),
        data: (shop) => RefreshIndicator(
          onRefresh: () async {
            ref
              ..invalidate(shopReviewProvider(shop.id))
              ..invalidate(orderSummaryProvider(shop.id))
              ..invalidate(catalogueSummaryProvider(shop.id));
          },
          child: _Dashboard(shop: shop),
        ),
      ),
    );
  }
}

class _Dashboard extends ConsumerWidget {
  const _Dashboard({required this.shop});

  final MyShop shop;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final review = ref.watch(shopReviewProvider(shop.id)).value;
    final status = review?.status ?? shop.status;
    final live = status == 'ACTIVE';
    final ordersVisible = live && shop.can(ShopPermission.ordersHandle);
    final textTheme = Theme.of(context).textTheme;
    final canRecord = live && shop.can(ShopPermission.ordersRecord);
    final canAddProducts = shop.can(ShopPermission.catalogueManage);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(shop.name, style: textTheme.titleMedium),
                  ),
                  AppBadge(
                    label: shopStatusLabel(status),
                    tone: shopStatusTone(status),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.s8),
              Text(shopStatusDescription(status), style: textTheme.bodyLarge),
              if (review != null) _ReviewDetails(shop: shop, review: review),
            ],
          ),
        ),
        if (ordersVisible) ...[
          const SizedBox(height: AppSpacing.s24),
          _ToDo(shopId: shop.id),
          const SizedBox(height: AppSpacing.s24),
          _OrderFigures(shopId: shop.id),
        ],
        if (shop.can(ShopPermission.catalogueView)) ...[
          const SizedBox(height: AppSpacing.s24),
          _ProductFigures(shopId: shop.id),
        ],
        if (canRecord || canAddProducts) ...[
          const SizedBox(height: AppSpacing.s24),
          const _SectionTitle('Shortcuts'),
          const SizedBox(height: AppSpacing.s8),
          if (canRecord)
            AppButton(
              label: 'New order',
              icon: Icons.add,
              expand: true,
              onPressed: () => context.go('/shops/${shop.id}/orders/new'),
            ),
          if (canRecord && canAddProducts)
            const SizedBox(height: AppSpacing.s8),
          if (canAddProducts)
            AppButton(
              label: 'Add from brand catalogue',
              icon: Icons.add_box_outlined,
              variant: AppButtonVariant.secondary,
              expand: true,
              onPressed: () => context.go('/shops/${shop.id}/catalogue/add'),
            ),
        ],
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) => Semantics(
    header: true,
    child: Text(title, style: Theme.of(context).textTheme.titleMedium),
  );
}

/// A section that failed to load, with "Try again" (the rest stays usable).
class _SectionError extends StatelessWidget {
  const _SectionError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => AppInlineMessage(
    tone: AppTone.error,
    message: message,
    action: Align(
      alignment: Alignment.centerLeft,
      child: AppButton(
        label: 'Try again',
        variant: AppButtonVariant.tertiary,
        onPressed: onRetry,
      ),
    ),
  );
}

const _sectionLoading = Padding(
  padding: EdgeInsets.all(AppSpacing.s16),
  child: Center(child: AppSpinner()),
);

/// What needs doing now: new orders to start and orders to collect payment
/// for. Says so when there is nothing.
class _ToDo extends ConsumerWidget {
  const _ToDo({required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(orderSummaryProvider(shopId));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _SectionTitle('To do'),
        const SizedBox(height: AppSpacing.s8),
        summary.when(
          loading: () => _sectionLoading,
          // The figures below explain a failure once.
          error: (_, _) => const SizedBox.shrink(),
          data: (figures) {
            final rows = [
              if (figures.newOrders > 0)
                AppNavRow(
                  icon: Icons.fiber_new_outlined,
                  title: figures.newOrders == 1
                      ? '1 new order to start'
                      : '${figures.newOrders} new orders to start',
                  subtitle: 'Start packing, or say what is not available',
                  onTap: () => context.go(
                    '/shops/$shopId/orders?tab=${OrderTab.newOrders.apiValue}',
                  ),
                ),
              if (figures.unpaidCount > 0)
                AppNavRow(
                  icon: Icons.payments_outlined,
                  title: unpaidLine(figures.unpaidCount, figures.unpaidPaise),
                  subtitle: 'Record the payment when the customer pays',
                  onTap: () => context.go(
                    '/shops/$shopId/orders?tab=${OrderTab.all.apiValue}&paid=false',
                  ),
                ),
            ];
            if (rows.isEmpty) {
              return const AppInlineMessage(
                tone: AppTone.success,
                message: 'Nothing waiting. New orders show up here.',
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final (index, row) in rows.indexed) ...[
                  if (index > 0) const SizedBox(height: AppSpacing.s8),
                  row,
                ],
              ],
            );
          },
        ),
      ],
    );
  }
}

/// Today's order figures (ORD-003), each opening its orders.
class _OrderFigures extends ConsumerWidget {
  const _OrderFigures({required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(orderSummaryProvider(shopId));
    void open(OrderTab tab) =>
        context.go('/shops/$shopId/orders?tab=${tab.apiValue}');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _SectionTitle('Orders'),
        const SizedBox(height: AppSpacing.s8),
        summary.when(
          loading: () => _sectionLoading,
          error: (_, _) => _SectionError(
            message: "We couldn't load the order figures.",
            onRetry: () => ref.invalidate(orderSummaryProvider(shopId)),
          ),
          data: (figures) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: AppStatTile(
                      label: 'New',
                      value: '${figures.newOrders}',
                      onTap: () => open(OrderTab.newOrders),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s12),
                  Expanded(
                    child: AppStatTile(
                      label: 'To pack',
                      value: '${figures.packing}',
                      onTap: () => open(OrderTab.packing),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.s12),
              Row(
                children: [
                  Expanded(
                    child: AppStatTile(
                      label: 'Ready or on the way',
                      value: '${figures.ready}',
                      onTap: () => open(OrderTab.ready),
                    ),
                  ),
                  // Money figures come only with `reports.view` (D-056).
                  if (figures.todaySalesPaise case final sales?) ...[
                    const SizedBox(width: AppSpacing.s12),
                    Expanded(
                      child: AppStatTile(
                        label: "Today's sales",
                        value: formatRupees(sales),
                        onTap: () => open(OrderTab.completed),
                      ),
                    ),
                  ] else
                    const Spacer(),
                ],
              ),
              // Unpaid orders are a To do row above, not repeated here.
            ],
          ),
        ),
      ],
    );
  }
}

/// Product counts (WEB-008), each opening the Products tab.
class _ProductFigures extends ConsumerWidget {
  const _ProductFigures({required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(catalogueSummaryProvider(shopId));
    void open() => context.go('/shops/$shopId/catalogue');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _SectionTitle('Products'),
        const SizedBox(height: AppSpacing.s8),
        summary.when(
          loading: () => _sectionLoading,
          error: (_, _) => _SectionError(
            message: "We couldn't load the product figures.",
            onRetry: () => ref.invalidate(catalogueSummaryProvider(shopId)),
          ),
          data: (figures) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: AppStatTile(
                      label: 'On sale',
                      value: '${figures.active}',
                      onTap: open,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s12),
                  Expanded(
                    child: AppStatTile(
                      label: 'All sizes available',
                      value: '${figures.allAvailable}',
                      onTap: open,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.s12),
              Row(
                children: [
                  Expanded(
                    child: AppStatTile(
                      label: 'Some sizes not available',
                      value: '${figures.partlyAvailable}',
                      onTap: open,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s12),
                  Expanded(
                    child: AppStatTile(
                      label: 'Not available',
                      value: '${figures.noneAvailable}',
                      onTap: open,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// "2 orders not paid yet: ₹4,300", without the amount when it is hidden.
String unpaidLine(int count, int? paise) {
  final orders = count == 1 ? '1 order' : '$count orders';
  return paise == null
      ? '$orders not paid yet.'
      : '$orders not paid yet: ${formatRupees(paise)}';
}

/// What the owner should know about the review (PLT-002), with Submit for
/// review and Withdraw for people with `shop.profile` (SHP-013).
class _ReviewDetails extends ConsumerStatefulWidget {
  const _ReviewDetails({required this.shop, required this.review});

  final MyShop shop;
  final ShopReviewState review;

  @override
  ConsumerState<_ReviewDetails> createState() => _ReviewDetailsState();
}

class _ReviewDetailsState extends ConsumerState<_ReviewDetails> {
  bool _busy = false;

  Future<void> _run({required bool submit}) async {
    final shopId = widget.shop.id;
    if (!submit) {
      final confirmed = await showAppConfirmDialog(
        context: context,
        title: 'Withdraw the submission?',
        message:
            'The review stops and you can change the profile, photo and '
            'location again. Submit again when you are ready.',
        confirmLabel: 'Withdraw',
      );
      if (!confirmed || !mounted) return;
    }
    setState(() => _busy = true);
    final repository = ref.read(shopProfileRepositoryProvider);
    try {
      if (submit) {
        await repository.submitForReview(shopId);
      } else {
        await repository.withdrawReview(shopId);
      }
      if (!mounted) return;
      ref
        ..invalidate(shopReviewProvider(shopId))
        ..invalidate(shopProvider(shopId));
      showAppSnackBar(
        context,
        submit ? ReviewMessages.submitted : ReviewMessages.withdrawn,
        tone: AppTone.success,
      );
    } on Object catch (error) {
      if (!mounted) return;
      // The checklist or the status may have changed meanwhile.
      ref.invalidate(shopReviewProvider(shopId));
      showAppSnackBar(context, reviewErrorMessage(error), tone: AppTone.error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final review = widget.review;
    final textTheme = Theme.of(context).textTheme;
    final last = review.lastDecision;
    final submittedAt = review.submittedAt;
    final body = textTheme.bodyLarge;
    final canAct = widget.shop.can(ShopPermission.shopProfile);
    final draft =
        review.status == 'DRAFT' || review.status == 'CHANGES_REQUESTED';

    final Widget? action = switch (review.status) {
      'PENDING_REVIEW' when canAct => AppButton(
        label: 'Withdraw submission',
        loadingLabel: 'Withdrawing…',
        variant: AppButtonVariant.secondary,
        loading: _busy,
        onPressed: () => _run(submit: false),
      ),
      _ when draft && canAct && review.missing.isEmpty => AppButton(
        label: 'Submit for review',
        loadingLabel: 'Submitting…',
        loading: _busy,
        expand: true,
        onPressed: () => _run(submit: true),
      ),
      _ when draft && canAct => AppButton(
        label: 'Open shop profile',
        variant: AppButtonVariant.secondary,
        onPressed: () => context.go('/shops/${widget.shop.id}/profile'),
      ),
      _ => null,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ...switch (review.status) {
          'PENDING_REVIEW' => [
            const SizedBox(height: AppSpacing.s12),
            Text(
              '${submittedAt == null ? 'Submitted' : 'Submitted on ${formatIstDate(submittedAt)}'}. '
              'Until the review is done, the profile, photo and location are '
              'locked.',
              style: body,
            ),
          ],
          'CHANGES_REQUESTED' when last != null => [
            const SizedBox(height: AppSpacing.s12),
            Semantics(
              header: true,
              child: Text('Changes requested', style: textTheme.titleMedium),
            ),
            const SizedBox(height: AppSpacing.s4),
            for (final reason in last.reasons)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.s4),
                child: Text('• ${reviewReasonLabel(reason)}', style: body),
              ),
            if (last.note != null) ...[
              const SizedBox(height: AppSpacing.s8),
              Text('Note from the platform team: "${last.note}"', style: body),
            ],
            const SizedBox(height: AppSpacing.s8),
            Text(
              review.missing.isEmpty
                  ? 'Fix these, then submit your shop again.'
                  : 'Fix these, then submit your shop again. Still to do: '
                        '${review.missing.map(checklistItemName).join(', ')}.',
              style: body,
            ),
          ],
          'DRAFT' || 'CHANGES_REQUESTED' => [
            const SizedBox(height: AppSpacing.s12),
            Text(
              review.missing.isEmpty
                  ? 'Your checklist is complete. Submit your shop for review.'
                  : 'Still to do before review: '
                        '${review.missing.map(checklistItemName).join(', ')}.',
              style: body,
            ),
          ],
          _ => const <Widget>[],
        },
        if (action != null) ...[
          const SizedBox(height: AppSpacing.s12),
          Align(alignment: Alignment.centerLeft, child: action),
        ],
      ],
    );
  }
}
