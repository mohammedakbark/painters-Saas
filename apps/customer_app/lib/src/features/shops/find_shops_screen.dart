import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../location/location_service.dart';
import '../../routing/paths.dart';
import '../../shops/shop_models.dart';
import '../../shops/shop_providers.dart';
import 'find_shops_controller.dart';
import 'shop_card.dart';

abstract final class FindShopsMessages {
  static const nearYou = 'Nearest to you';
  static const noPosition =
      'Choose Near me or a district to see the closest shops first.';
  static const locationOff =
      'Location is off on your phone. Choose a district instead.';
  static const locationDenied =
      "We can't use your location. Choose a district instead.";
  static const locationBlocked =
      'Location is blocked for SevenPalette. Allow it in Settings, or choose a district.';
  static const locationFailed =
      "We couldn't find your location. Choose a district instead.";
  static const loadFailed = "We couldn't load the shops.";
  static const loadMoreFailed = "We couldn't load more shops. Try again.";
}

/// Find shops (CUS-002): every Live shop, nearest first by the phone's
/// position, or the chosen district first when location is off (D-038).
/// Opening a shop needs no adding (D-037).
class FindShopsScreen extends ConsumerStatefulWidget {
  const FindShopsScreen({super.key});

  @override
  ConsumerState<FindShopsScreen> createState() => _FindShopsScreenState();
}

class _FindShopsScreenState extends ConsumerState<FindShopsScreen> {
  final _search = TextEditingController();
  bool _locating = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _useLocation() async {
    setState(() => _locating = true);
    final result = await ref.read(locationServiceProvider).currentLocation();
    if (!mounted) return;
    setState(() => _locating = false);
    switch (result) {
      case LocationFound(:final latitude, :final longitude):
        ref
            .read(shopsNearProvider.notifier)
            .set(NearPosition(latitude, longitude));
      case LocationUnavailable(:final problem):
        final message = switch (problem) {
          LocationProblem.serviceDisabled => FindShopsMessages.locationOff,
          LocationProblem.permissionDenied => FindShopsMessages.locationDenied,
          LocationProblem.permissionDeniedForever =>
            FindShopsMessages.locationBlocked,
          LocationProblem.failed => FindShopsMessages.locationFailed,
        };
        showAppSnackBar(
          context,
          message,
          tone: AppTone.warning,
          actionLabel: problem == LocationProblem.permissionDeniedForever
              ? 'Settings'
              : 'Choose district',
          onAction: problem == LocationProblem.permissionDeniedForever
              ? () => ref.read(locationServiceProvider).openAppSettings()
              : _chooseDistrict,
        );
    }
  }

  Future<void> _chooseDistrict() async {
    final near = ref.read(shopsNearProvider);
    final chosen = await showAppBottomSheet<String>(
      context: context,
      title: 'Choose your district',
      builder: (context) => _DistrictPicker(
        selected: near is NearDistrict ? near.district : null,
      ),
    );
    if (chosen != null && mounted) {
      ref.read(shopsNearProvider.notifier).set(NearDistrict(chosen));
    }
  }

  Future<void> _loadMore() async {
    try {
      await ref.read(findShopsProvider.notifier).loadMore();
    } on Object {
      if (mounted) {
        showAppSnackBar(
          context,
          FindShopsMessages.loadMoreFailed,
          tone: AppTone.error,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(findShopsProvider);
    final near = ref.watch(shopsNearProvider);
    final activeId = ref.watch(activeShopIdProvider).value;
    return AppScaffold(
      title: 'Find shops',
      body: RefreshIndicator(
        onRefresh: ref.read(findShopsProvider.notifier).retry,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            AppSearchField(
              label: 'Search shops by name',
              controller: _search,
              onSubmitted: ref.read(findShopsProvider.notifier).search,
            ),
            const SizedBox(height: AppSpacing.s12),
            _NearRow(
              near: near,
              locating: _locating,
              onNearMe: _useLocation,
              onChooseDistrict: _chooseDistrict,
            ),
            const SizedBox(height: AppSpacing.s16),
            ..._results(state, activeId),
          ],
        ),
      ),
    );
  }

  List<Widget> _results(FindShopsState state, String? activeId) {
    if (state.loading) {
      return const [
        SizedBox(height: AppSpacing.s48),
        LoadingView(message: 'Finding shops…'),
      ];
    }
    if (state.failed) {
      return [
        ErrorView(
          title: FindShopsMessages.loadFailed,
          onRetry: ref.read(findShopsProvider.notifier).retry,
        ),
      ];
    }
    if (state.items.isEmpty) {
      return [
        MessageView(
          icon: Icons.storefront_outlined,
          title: state.query.isEmpty ? 'No shops yet' : 'No shops found',
          message: state.query.isEmpty
              ? 'Paint shops appear here once they join SevenPalette.'
              : 'No shop name contains "${state.query}".',
        ),
      ];
    }
    return [
      Semantics(
        liveRegion: true,
        child: Text(
          state.total == 1 ? '1 shop' : '${state.total} shops',
          style: Theme.of(context).textTheme.bodyMedium
              ?.copyWith(color: AppColors.textSecondary),
        ),
      ),
      const SizedBox(height: AppSpacing.s8),
      for (final shop in state.items) ...[
        ShopCard(
          key: ValueKey('shop-${shop.id}'),
          shop: shop,
          active: shop.id == activeId,
          onTap: () => _open(shop),
        ),
        const SizedBox(height: AppSpacing.s12),
      ],
      if (state.hasMore)
        AppButton(
          label: 'Load more',
          loadingLabel: 'Loading…',
          loading: state.loadingMore,
          variant: AppButtonVariant.secondary,
          expand: true,
          onPressed: _loadMore,
        ),
    ];
  }

  Future<void> _open(PublicShop shop) async {
    await context.push(shopPath(shop.id));
    if (!mounted) return;
    // The shop page may have added or removed it.
    final inMyShops = ref
        .read(myShopsProvider)
        .value
        ?.any((item) => item.id == shop.id);
    if (inMyShops != null && inMyShops != shop.inMyShops) {
      ref.read(findShopsProvider.notifier).markInMyShops(shop.id, inMyShops);
    }
  }
}

/// Where the list is sorted from, with Near me and Choose district.
class _NearRow extends StatelessWidget {
  const _NearRow({
    required this.near,
    required this.locating,
    required this.onNearMe,
    required this.onChooseDistrict,
  });

  final ShopsNear near;
  final bool locating;
  final VoidCallback onNearMe;
  final VoidCallback onChooseDistrict;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final label = switch (near) {
      NearPosition() => FindShopsMessages.nearYou,
      NearDistrict(:final district) => 'Shops in $district first',
      NearNothing() => FindShopsMessages.noPosition,
    };
    return AppCard(
      tone: AppCardTone.subtle,
      padding: const EdgeInsets.all(AppSpacing.s12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                near is NearNothing
                    ? Icons.location_searching
                    : Icons.location_on_outlined,
                color: AppColors.brandPrimary,
              ),
              const SizedBox(width: AppSpacing.s8),
              Expanded(
                child: Text(
                  label,
                  style: textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s8),
          Wrap(
            spacing: AppSpacing.s8,
            runSpacing: AppSpacing.s8,
            children: [
              AppButton(
                key: const Key('near-me'),
                label: 'Near me',
                loadingLabel: 'Finding you…',
                icon: Icons.my_location,
                loading: locating,
                variant: near is NearPosition
                    ? AppButtonVariant.primary
                    : AppButtonVariant.secondary,
                onPressed: onNearMe,
              ),
              AppButton(
                key: const Key('choose-district'),
                label: 'Choose district',
                icon: Icons.map_outlined,
                variant: near is NearDistrict
                    ? AppButtonVariant.primary
                    : AppButtonVariant.secondary,
                onPressed: onChooseDistrict,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

final _districtsProvider = FutureProvider.autoDispose<List<ShopDistrict>>(
  (ref) => ref.watch(shopsRepositoryProvider).districts(),
  retry: (_, _) => null,
);

/// The districts that have Live shops; pops with the chosen one.
class _DistrictPicker extends ConsumerWidget {
  const _DistrictPicker({this.selected});

  final String? selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final districts = ref.watch(_districtsProvider);
    return switch (districts) {
      AsyncData(:final value) when value.isEmpty => const MessageView(
        icon: Icons.map_outlined,
        title: 'No districts yet',
        message: 'Districts appear once shops in them join SevenPalette.',
      ),
      AsyncData(:final value) => AppRadioGroup<String>(
        label: 'District',
        value: selected,
        options: [
          for (final item in value)
            AppOption(
              item.district,
              item.shopCount == 1
                  ? '${item.district} (1 shop)'
                  : '${item.district} (${item.shopCount} shops)',
            ),
        ],
        onChanged: (district) {
          if (district != null) Navigator.of(context).pop(district);
        },
      ),
      AsyncError() => ErrorView(
        title: "We couldn't load the districts",
        onRetry: () => ref.invalidate(_districtsProvider),
      ),
      _ => const LoadingView(message: 'Loading districts…'),
    };
  }
}
