import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../../shops/shop_models.dart';
import '../../shops/shop_review.dart';
import 'sign_out_button.dart';

/// Home of one shop. The API checks membership; non-members see "not found".
class ShopHomeScreen extends ConsumerWidget {
  const ShopHomeScreen({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shop = ref.watch(shopProvider(shopId));
    return Scaffold(
      appBar: AppBar(
        title: Text(shop.value?.name ?? 'Shop'),
        actions: const [SignOutButton()],
      ),
      body: SafeArea(
        child: shop.when(
          loading: () => const LoadingView(message: 'Loading your shop…'),
          error: (error, _) => error is ShopNotFound
              ? MessageView(
                  icon: Icons.search_off,
                  title: 'Shop not found',
                  message: "This shop doesn't exist, or your account doesn't have access to it.",
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
          data: (shop) => _ShopOverview(shop: shop),
        ),
      ),
    );
  }
}

class _ShopOverview extends ConsumerWidget {
  const _ShopOverview({required this.shop});

  final MyShop shop;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final review = ref.watch(shopReviewProvider(shop.id)).value;
    final status = review?.status ?? shop.status;
    final textTheme = Theme.of(context).textTheme;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        Semantics(
          header: true,
          child: Text(shop.name, style: textTheme.headlineSmall),
        ),
        const SizedBox(height: AppSpacing.s4),
        Text(
          shopRoleLabel(shop.myRole),
          style: textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.s24),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text('Status', style: textTheme.titleMedium),
                  const SizedBox(width: AppSpacing.s12),
                  AppBadge(
                    label: shopStatusLabel(status),
                    tone: shopStatusTone(status),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.s8),
              Text(
                '${shopStatusDescription(status)} Orders and products '
                'will appear here as those features are released.',
                style: textTheme.bodyLarge,
              ),
              if (review != null) ..._reviewDetails(review, textTheme),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.s16),
        AppNavRow(
          icon: Icons.storefront_outlined,
          title: 'Shop profile',
          subtitle: 'Address, support mobile and map location',
          onTap: () => context.go('/shops/${shop.id}/profile'),
        ),
      ],
    );
  }
}

/// What the owner should know about the review (PLT-002). Submitting and
/// withdrawing happen on the web portal; the app only shows the state.
List<Widget> _reviewDetails(ShopReviewState review, TextTheme textTheme) {
  final last = review.lastDecision;
  final submittedAt = review.submittedAt;
  final body = textTheme.bodyLarge;
  return switch (review.status) {
    'PENDING_REVIEW' => [
      const SizedBox(height: AppSpacing.s12),
      Text(
        '${submittedAt == null ? 'Submitted' : 'Submitted on ${formatIstDate(submittedAt)}'}. '
        'Until the review is done, the profile, photo and location are locked.',
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
        'Fix these, then submit your shop again on the web portal.',
        style: body,
      ),
    ],
    'DRAFT' || 'CHANGES_REQUESTED' => [
      const SizedBox(height: AppSpacing.s12),
      Text(
        review.missing.isEmpty
            ? 'Your checklist is complete. Submit your shop for review on '
                  'the web portal.'
            : 'Still to do before review: '
                  '${review.missing.map(checklistItemName).join(', ')}.',
        style: body,
      ),
    ],
    _ => const [],
  };
}
