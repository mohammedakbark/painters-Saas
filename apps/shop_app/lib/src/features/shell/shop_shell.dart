import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../orders/order_providers.dart';
import '../../providers.dart';
import '../../routing/router.dart';
import '../../shops/shop_models.dart';
import '../../shops/shop_permissions.dart';

/// The shop's areas as bottom tabs, by daily priority (SHP-011). The order
/// must match the branches in `routing/router.dart`.
enum ShopTab {
  home('Home', Icons.home_outlined, Icons.home, null),
  orders(
    'Orders',
    Icons.receipt_long_outlined,
    Icons.receipt_long,
    ShopPermission.ordersHandle,
  ),
  products(
    'Products',
    Icons.inventory_2_outlined,
    Icons.inventory_2,
    ShopPermission.catalogueView,
  ),
  customers(
    'Customers',
    Icons.people_outline,
    Icons.people,
    ShopPermission.customersManage,
  );

  const ShopTab(this.label, this.icon, this.selectedIcon, this.permission);

  final String label;
  final IconData icon;
  final IconData selectedIcon;

  /// Null: everyone in the shop sees the tab.
  final ShopPermission? permission;

  bool visibleFor(MyShop? shop) {
    final needed = permission;
    // Until the shop is loaded only Home shows, so nothing flashes and goes.
    return needed == null || (shop?.can(needed) ?? false);
  }
}

/// The frame around the shop's tabs: each tab keeps its own screen and
/// scroll position; tabs the person may not use are not shown (D-056).
class ShopShell extends ConsumerWidget {
  const ShopShell({super.key, required this.shopId, required this.shell});

  final String shopId;
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shop = ref.watch(shopProvider(shopId)).value;
    final tabs = [
      for (final tab in ShopTab.values)
        if (tab.visibleFor(shop)) tab,
    ];
    final current = ShopTab.values[shell.currentIndex];
    final showsOrders =
        tabs.contains(ShopTab.orders) && shop?.status == 'ACTIVE';
    final newOrders = showsOrders
        ? ref.watch(orderSummaryProvider(shopId)).value?.newOrders
        : null;

    // A link to a tab the person may not use (D-056).
    final body = current.visibleFor(shop) || shop == null
        ? shell
        : NoAccessView(shopId: shopId);

    return AppTabScaffold(
      body: body,
      bottomNav: tabs.length < 2
          ? null
          : AppBottomNav(
              selectedIndex: tabs.contains(current) ? tabs.indexOf(current) : 0,
              destinations: [
                for (final tab in tabs)
                  AppNavDestination(
                    icon: tab.icon,
                    selectedIcon: tab.selectedIcon,
                    label: tab.label,
                    count: tab == ShopTab.orders ? newOrders : null,
                  ),
              ],
              onSelected: (index) {
                final tab = tabs[index];
                // Tapping the open tab again goes back to its first screen.
                shell.goBranch(
                  tab.index,
                  initialLocation: tab.index == shell.currentIndex,
                );
              },
            ),
    );
  }
}

/// Shows [child] only to people with one of [anyOf] (D-056). The API refuses
/// the data anyway; this explains it instead of showing an error.
class RequirePermission extends ConsumerWidget {
  const RequirePermission({
    super.key,
    required this.shopId,
    required this.anyOf,
    required this.title,
    required this.child,
  });

  final String shopId;
  final List<ShopPermission> anyOf;

  /// The screen's title, kept on the no-access screen.
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shop = ref.watch(shopProvider(shopId)).value;
    // While the shop loads the screen shows its own loading state.
    if (shop == null || anyOf.any(shop.can)) return child;
    return AppScaffold(
      title: title,
      body: NoAccessView(shopId: shopId),
    );
  }
}

/// "You don't have access to this", with a way back to the shop's home.
class NoAccessView extends StatelessWidget {
  const NoAccessView({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context) => MessageView(
    icon: Icons.lock_outline,
    title: "You don't have access to this",
    message: 'Ask the shop owner if you need it.',
    action: AppButton(
      label: 'Go to the shop home',
      variant: AppButtonVariant.secondary,
      onPressed: () => context.go('/shops/$shopId'),
    ),
  );
}

/// The side menu of the shop's tab screens: who is signed in, the shop, the
/// areas that are not tabs, switching shop and signing out.
class ShopDrawer extends ConsumerWidget {
  const ShopDrawer({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shop = ref.watch(shopProvider(shopId)).value;
    final user = ref.watch(shopUserProvider).value;
    final textTheme = Theme.of(context).textTheme;
    final phone = user?.phone;
    final status = shop?.status;

    void open(String location) {
      Navigator.of(context).pop();
      context.go(location);
    }

    return AppDrawer(
      header: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const BrandMark(appName: AppBrand.shopAppName),
          const SizedBox(height: AppSpacing.s16),
          Text(
            shop?.name ?? '',
            style: textTheme.titleMedium,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: AppSpacing.s4),
          Wrap(
            spacing: AppSpacing.s8,
            runSpacing: AppSpacing.s4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (status != null)
                AppBadge(
                  label: shopStatusLabel(status),
                  tone: shopStatusTone(status),
                ),
              if (shop != null)
                Text(
                  shopRoleLabel(shop.myRole),
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
            ],
          ),
          if (phone != null) ...[
            const SizedBox(height: AppSpacing.s4),
            Text(
              'Signed in as ${IndianMobileNumber.format(phone)}',
              style: textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
      footer: Text(
        'Powered by ${AppBrand.companyName}',
        style: textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
      ),
      children: [
        const AppDrawerSection(title: 'Shop'),
        AppDrawerRow(
          icon: Icons.storefront_outlined,
          label: 'Shop profile',
          detail: 'Photo, address, support mobile and map location',
          onTap: () => open(shopMenuPath(shopId, 'profile')),
        ),
        if (shop?.can(ShopPermission.shopSettings) ?? false)
          AppDrawerRow(
            icon: Icons.tune,
            label: 'Shop settings',
            detail: 'Delivery and order messages',
            onTap: () => open(shopMenuPath(shopId, 'settings')),
          ),
        if (shop?.can(ShopPermission.catalogueView) ?? false) ...[
          const AppDrawerSection(title: 'Catalogue'),
          AppDrawerRow(
            icon: Icons.palette_outlined,
            label: 'Shades',
            detail: 'Favourite brand shades and your own',
            onTap: () => open(shopMenuPath(shopId, 'shades')),
          ),
          AppDrawerRow(
            icon: Icons.category_outlined,
            label: 'Categories',
            detail: 'Platform categories and your own',
            onTap: () => open(shopMenuPath(shopId, 'categories')),
          ),
        ],
        const AppDrawerSection(title: 'Account'),
        if ((user?.memberships.length ?? 0) > 1)
          AppDrawerRow(
            icon: Icons.swap_horiz,
            label: 'Switch shop',
            onTap: () => open('/shops'),
          ),
        AppDrawerRow(
          icon: Icons.logout,
          label: 'Sign out',
          destructive: true,
          onTap: () async {
            final confirmed = await showAppConfirmDialog(
              context: context,
              title: 'Sign out?',
              message:
                  'You will need a code sent to your mobile to sign in '
                  'again.',
              confirmLabel: 'Sign out',
            );
            if (confirmed) await ref.read(authRepositoryProvider).signOut();
          },
        ),
      ],
    );
  }
}
