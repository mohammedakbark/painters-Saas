import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../api/api_client.dart';
import '../../shops/connect.dart';

/// On a shop's page (CON-001, D-063): if the shop recorded your orders by
/// your mobile before you used the app, ask it to connect them. It never
/// says whether the shop has any; the shop decides.
class ConnectCard extends ConsumerStatefulWidget {
  const ConnectCard({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<ConnectCard> createState() => _ConnectCardState();
}

class _ConnectCardState extends ConsumerState<ConnectCard> {
  bool _asking = false;

  Future<void> _ask() async {
    setState(() => _asking = true);
    try {
      await ref.read(connectRepositoryProvider).ask(widget.shopId);
      ref.invalidate(connectStatusProvider(widget.shopId));
      if (mounted) {
        showAppSnackBar(context, 'Asked. The shop decides.');
      }
    } on ApiException catch (error) {
      if (mounted) {
        showAppSnackBar(
          context,
          error.detail ?? "We couldn't send your request. Try again.",
          tone: AppTone.error,
        );
      }
    } finally {
      if (mounted) setState(() => _asking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = ref.watch(connectStatusProvider(widget.shopId)).value;
    if (status == null) return const SizedBox.shrink();
    final (title, message, canAsk) = switch (status) {
      ConnectStatus.pending => (
        'Request sent',
        'If the shop keeps orders under your mobile, it can connect them to '
            'your app. Ask at the counter if it takes long.',
        false,
      ),
      ConnectStatus.approved => (
        'Records connected',
        'Orders the shop recorded for you now show in My Orders and Bills.',
        false,
      ),
      ConnectStatus.declined => (
        'Not connected',
        "The shop didn't connect any records. You can ask again.",
        true,
      ),
      ConnectStatus.none => (
        'Ordered here before the app?',
        'If the shop recorded your orders by your mobile, ask it to connect '
            'them to your app. The shop decides.',
        true,
      ),
    };
    final textTheme = Theme.of(context).textTheme;
    return AppSection(
      title: title,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            message,
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          if (canAsk) ...[
            const SizedBox(height: AppSpacing.s12),
            AppButton(
              key: const Key('ask-connect'),
              label: 'Ask to connect my records',
              loadingLabel: 'Sending…',
              loading: _asking,
              icon: Icons.link,
              variant: AppButtonVariant.secondary,
              onPressed: _ask,
            ),
          ],
        ],
      ),
    );
  }
}
