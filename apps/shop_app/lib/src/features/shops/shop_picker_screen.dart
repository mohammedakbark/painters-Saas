import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../providers.dart';
import '../../shops/shop_models.dart';
import 'sign_out_button.dart';

/// The shops the signed-in user belongs to (one person may own several, D-026).
class ShopPickerScreen extends ConsumerWidget {
  const ShopPickerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(shopUserProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your shops'),
        actions: const [SignOutButton()],
      ),
      body: SafeArea(
        child: user.when(
          loading: () => const LoadingView(message: 'Loading your shops…'),
          error: (error, _) => _isSessionExpired(error)
              ? const MessageView(
                  icon: Icons.lock_outline,
                  title: 'Your session has expired',
                  message: 'Sign out, then sign in again with your number.',
                  action: SignOutButton(filled: true),
                )
              : ErrorView(
                  title: "We couldn't load your shops",
                  onRetry: () => ref.invalidate(shopUserProvider),
                ),
          data: (user) => user.memberships.isEmpty
              ? MessageView(
                  icon: Icons.storefront_outlined,
                  title: 'No shop is linked to this number',
                  message: [
                    if (user.phone != null)
                      'Signed in as ${IndianMobileNumber.format(user.phone!)}.',
                    'Register your shop on the web portal, then sign in here again.',
                  ].join(' '),
                  action: const SignOutButton(filled: true),
                )
              : _ShopList(memberships: user.memberships),
        ),
      ),
    );
  }
}

bool _isSessionExpired(Object error) =>
    error is ApiException && error.status == 401;

class _ShopList extends StatelessWidget {
  const _ShopList({required this.memberships});

  final List<ShopMembership> memberships;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      itemCount: memberships.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.s12),
      itemBuilder: (context, index) {
        final membership = memberships[index];
        return Card(
          margin: EdgeInsets.zero,
          child: ListTile(
            minTileHeight: AppSpacing.minTouchTarget + AppSpacing.s16,
            title: Text(membership.shopName),
            subtitle: Text(
              '${shopRoleLabel(membership.role)} · '
              '${shopStatusLabel(membership.shopStatus)}',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.go('/shops/${membership.shopId}'),
          ),
        );
      },
    );
  }
}
