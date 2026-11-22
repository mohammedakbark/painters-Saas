import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../customers/connect_requests.dart';
import '../../customers/customer_providers.dart';
import '../../orders/order_labels.dart';
import '../orders/order_messages.dart';

/// Connection requests on the Customers tab (CON-002, D-063): app users
/// whose mobile matches a record you keep asked to connect it. Hidden when
/// there are none or they can't be loaded (the list still works).
class ConnectRequestsCard extends ConsumerStatefulWidget {
  const ConnectRequestsCard({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<ConnectRequestsCard> createState() =>
      _ConnectRequestsCardState();
}

class _ConnectRequestsCardState extends ConsumerState<ConnectRequestsCard> {
  /// The request being answered; its buttons wait for the API.
  String? _busy;

  Future<void> _answer(ConnectRequest request, {required bool approve}) async {
    final confirmed = await showAppConfirmDialog(
      context: context,
      title: approve
          ? 'Connect ${request.name}’s records?'
          : 'Decline ${request.name}’s request?',
      message: approve
          ? request.mergesIntoAppRecord
                ? 'They already order here in the app. Your record, its '
                      'orders, bill and sites move into their app record, '
                      'and the two become one. Amounts don’t change. This '
                      'can’t be undone.'
                : 'They will see the orders and bill of this record in '
                      'their app. This can’t be undone.'
          : 'Your records stay private to your shop. They can ask again '
                'later.',
      confirmLabel: approve ? 'Connect' : 'Decline',
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = request.id);
    try {
      await ref
          .read(connectRequestsRepositoryProvider)
          .answer(widget.shopId, request.id, approve: approve);
      if (!mounted) return;
      ref
        ..invalidate(connectRequestsProvider(widget.shopId))
        ..invalidate(customerListProvider);
      showAppSnackBar(
        context,
        approve
            ? '${request.name}’s records are connected to their app.'
            : 'Request declined. ${request.name}’s records stay private.',
        tone: AppTone.success,
      );
    } on Object catch (error) {
      if (mounted) {
        showAppSnackBar(context, orderErrorMessage(error), tone: AppTone.error);
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final requests = ref.watch(connectRequestsProvider(widget.shopId)).value;
    if (requests == null || requests.isEmpty) return const SizedBox.shrink();
    final secondary = Theme.of(context).textTheme.bodyMedium
        ?.copyWith(color: AppColors.textSecondary);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenPadding,
        AppSpacing.s12,
        AppSpacing.screenPadding,
        0,
      ),
      child: AppSection(
        title: 'Connection requests',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'These people use the app with a mobile you recorded. Connect '
              'only if they asked you to.',
              style: secondary,
            ),
            for (final request in requests) ...[
              const SizedBox(height: AppSpacing.s12),
              AppCard(
                key: ValueKey('connect-${request.id}'),
                padding: const EdgeInsets.all(AppSpacing.s12),
                onTap: () => context.go(
                  '/shops/${widget.shopId}/customers/${request.customerId}',
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      request.name,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      [
                        formatPhone(request.phone),
                        'asked ${formatOrderTime(request.requestedAt)}',
                        if (request.mergesIntoAppRecord)
                          'already orders in the app',
                      ].join(' · '),
                      style: secondary,
                    ),
                    Wrap(
                      alignment: WrapAlignment.end,
                      spacing: AppSpacing.s8,
                      children: [
                        AppButton(
                          key: ValueKey('decline-${request.id}'),
                          label: 'Decline',
                          variant: AppButtonVariant.tertiary,
                          onPressed: _busy == null
                              ? () => _answer(request, approve: false)
                              : null,
                        ),
                        AppButton(
                          key: ValueKey('approve-${request.id}'),
                          label: 'Connect',
                          loadingLabel: 'Connecting…',
                          loading: _busy == request.id,
                          variant: AppButtonVariant.secondary,
                          onPressed: _busy == null
                              ? () => _answer(request, approve: true)
                              : null,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
