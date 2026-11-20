import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../profile/customer_profile.dart';
import '../../providers.dart';
import '../profile/profile_setup_screen.dart';

/// The Customer App's areas as bottom tabs (CUS-001, owner 2026-11-20). The
/// order must match the branches in `routing/router.dart`. Bills come with
/// credit later.
enum CustomerTab {
  home('Home', Icons.home_outlined, Icons.home),
  orders('Orders', Icons.receipt_long_outlined, Icons.receipt_long),
  myShops('My Shops', Icons.storefront_outlined, Icons.storefront),
  sites('Sites', Icons.location_on_outlined, Icons.location_on),
  more('More', Icons.more_horiz, Icons.more_horiz);

  const CustomerTab(this.label, this.icon, this.selectedIcon);

  final String label;
  final IconData icon;
  final IconData selectedIcon;

  /// Sites are for painters only (D-036).
  bool visibleFor(CustomerProfile profile) =>
      this != CustomerTab.sites || profile.isPainter;
}

/// The signed-in frame: loads the profile once, asks for the name and the
/// customer type until both are set, then shows the tabs for that type.
class CustomerShell extends ConsumerWidget {
  const CustomerShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(customerProfileProvider);
    return switch (profile) {
      AsyncData(:final value) when !value.complete => ProfileSetupScreen(
        initial: value,
      ),
      AsyncData(:final value) => _Tabs(shell: shell, profile: value),
      AsyncError() => AppPlainScaffold(
        body: ErrorView(
          title: "We couldn't load your profile",
          onRetry: () => ref.invalidate(customerProfileProvider),
        ),
      ),
      _ => const AppPlainScaffold(body: LoadingView()),
    };
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({required this.shell, required this.profile});

  final StatefulNavigationShell shell;
  final CustomerProfile profile;

  @override
  Widget build(BuildContext context) {
    final tabs = [
      for (final tab in CustomerTab.values)
        if (tab.visibleFor(profile)) tab,
    ];
    final current = CustomerTab.values[shell.currentIndex];
    // A link to Sites after switching to Normal Customer.
    final body = current.visibleFor(profile)
        ? shell
        : AppScaffold(
            title: CustomerTab.sites.label,
            body: MessageView(
              icon: Icons.location_on_outlined,
              title: 'Sites are for painters',
              message:
                  'Choose Painter/Contractor in More > Edit profile to manage '
                  'your work sites.',
              action: AppButton(
                label: 'Go to Home',
                variant: AppButtonVariant.secondary,
                onPressed: () => shell.goBranch(CustomerTab.home.index),
              ),
            ),
          );
    return AppTabScaffold(
      body: body,
      bottomNav: AppBottomNav(
        selectedIndex: tabs.contains(current) ? tabs.indexOf(current) : 0,
        destinations: [
          for (final tab in tabs)
            AppNavDestination(
              icon: tab.icon,
              selectedIcon: tab.selectedIcon,
              label: tab.label,
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
