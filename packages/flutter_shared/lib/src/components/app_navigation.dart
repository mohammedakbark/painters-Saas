import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_component_tokens.dart';
import '../tokens/app_spacing.dart';
import '../tokens/app_typography.dart';

// The app frame (SHP-011): every screen is an [AppScaffold] with an
// [AppTopBar]; tab screens sit in an [AppTabScaffold] with [AppBottomNav];
// the side menu is an [AppDrawer]. Screens never use Scaffold, AppBar,
// NavigationBar or Drawer directly (`pnpm ui:check`).

/// The top bar of a screen: title, optional subtitle (such as the shop name),
/// back arrow on pushed screens or the menu icon when the screen has a drawer,
/// and up to two [actions] ([AppIconButton] or [AppMenuButton]).
class AppTopBar extends StatelessWidget implements PreferredSizeWidget {
  const AppTopBar({
    super.key,
    required this.title,
    this.subtitle,
    this.actions = const [],
  }) : assert(actions.length <= 2, 'at most two top bar actions');

  final String title;
  final String? subtitle;
  final List<Widget> actions;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 8);

  @override
  Widget build(BuildContext context) {
    final subtitle = this.subtitle;
    return AppBar(
      backgroundColor: AppComponentTokens.topBarBackground,
      foregroundColor: AppComponentTokens.topBarForeground,
      surfaceTintColor: AppComponentTokens.topBarBackground,
      elevation: 0,
      scrolledUnderElevation: 0,
      toolbarHeight: kToolbarHeight + 8,
      shape: const Border(
        bottom: BorderSide(color: AppComponentTokens.topBarBorder),
      ),
      titleSpacing: AppSpacing.s4,
      title: Semantics(
        header: true,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.title.copyWith(
                color: AppComponentTokens.topBarForeground,
              ),
            ),
            if (subtitle != null)
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
          ],
        ),
      ),
      actions: [
        ...actions,
        const SizedBox(width: AppSpacing.s8),
      ],
    );
  }
}

/// The frame of every screen: top bar, body, optional drawer and an optional
/// bar under the body for the screen's main action ([AppBottomActionBar]).
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.title,
    required this.body,
    this.subtitle,
    this.actions = const [],
    this.drawer,
    this.bottomBar,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget body;

  /// Gives the top bar the menu icon.
  final Widget? drawer;
  final Widget? bottomBar;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppTopBar(title: title, subtitle: subtitle, actions: actions),
      drawer: drawer,
      body: SafeArea(bottom: bottomBar == null, child: body),
      bottomNavigationBar: bottomBar,
    );
  }
}

/// A screen without a top bar: sign-in and full-screen messages.
class AppPlainScaffold extends StatelessWidget {
  const AppPlainScaffold({super.key, required this.body});

  final Widget body;

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: SafeArea(child: body));
  }
}

/// Holds the screen's main action under the content, always in reach of the
/// thumb: usually one expanded [AppButton].
class AppBottomActionBar extends StatelessWidget {
  const AppBottomActionBar({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: AppComponentTokens.actionBarBackground,
        border: Border(
          top: BorderSide(color: AppComponentTokens.actionBarBorder),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.s12,
            AppSpacing.screenPadding,
            AppSpacing.s12,
          ),
          child: child,
        ),
      ),
    );
  }
}

/// An icon-only button with a tooltip that screen readers announce.
class AppIconButton extends StatelessWidget {
  const AppIconButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;

  /// Null disables the button.
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(icon),
      tooltip: tooltip,
      onPressed: onPressed,
      constraints: const BoxConstraints(
        minWidth: AppSpacing.minTouchTarget,
        minHeight: AppSpacing.minTouchTarget,
      ),
    );
  }
}

/// One choice in an [AppMenuButton].
class AppMenuItem {
  const AppMenuItem({
    required this.label,
    required this.onSelected,
    this.icon,
    this.destructive = false,
  });

  final String label;
  final VoidCallback onSelected;
  final IconData? icon;

  /// Shown in the error colour; the action should still ask to confirm.
  final bool destructive;
}

/// The "More options" menu of a top bar or a card.
class AppMenuButton extends StatelessWidget {
  const AppMenuButton({
    super.key,
    required this.items,
    this.tooltip = 'More options',
  });

  final List<AppMenuItem> items;
  final String tooltip;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<int>(
      tooltip: tooltip,
      icon: const Icon(Icons.more_vert),
      color: AppComponentTokens.dialogBackground,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppComponentTokens.cardRadius),
      ),
      onSelected: (index) => items[index].onSelected(),
      itemBuilder: (context) => [
        for (final (index, item) in items.indexed)
          PopupMenuItem<int>(
            value: index,
            child: Row(
              children: [
                if (item.icon != null) ...[
                  Icon(
                    item.icon,
                    color: item.destructive
                        ? AppColors.statusError
                        : AppColors.textSecondary,
                  ),
                  const SizedBox(width: AppSpacing.s12),
                ],
                Text(
                  item.label,
                  style: AppTypography.bodyLarge.copyWith(
                    color: item.destructive ? AppColors.statusError : null,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// One tab of an [AppBottomNav].
class AppNavDestination {
  const AppNavDestination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    this.count,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;

  /// Something waiting, such as new orders; hidden when null or 0.
  final int? count;
}

/// The bottom tabs (2 to 5). The selected tab is marked by a filled icon, a
/// pill behind it and a bold label, never by colour alone.
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    super.key,
    required this.destinations,
    required this.selectedIndex,
    required this.onSelected,
  }) : assert(destinations.length >= 2 && destinations.length <= 5);

  final List<AppNavDestination> destinations;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: AppComponentTokens.bottomNavBorder),
        ),
      ),
      child: NavigationBarTheme(
        data: NavigationBarThemeData(
          backgroundColor: AppComponentTokens.bottomNavBackground,
          surfaceTintColor: AppComponentTokens.bottomNavBackground,
          indicatorColor: AppComponentTokens.bottomNavActiveBackground,
          indicatorShape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              AppComponentTokens.bottomNavRadius,
            ),
          ),
          elevation: 0,
          labelTextStyle: WidgetStateProperty.resolveWith(
            (states) => AppTypography.caption.copyWith(
              color: states.contains(WidgetState.selected)
                  ? AppComponentTokens.bottomNavActive
                  : AppComponentTokens.bottomNavInactive,
              fontWeight: states.contains(WidgetState.selected)
                  ? FontWeight.w700
                  : FontWeight.w500,
            ),
          ),
          iconTheme: WidgetStateProperty.resolveWith(
            (states) => IconThemeData(
              color: states.contains(WidgetState.selected)
                  ? AppComponentTokens.bottomNavActive
                  : AppComponentTokens.bottomNavInactive,
            ),
          ),
        ),
        child: NavigationBar(
          selectedIndex: selectedIndex,
          onDestinationSelected: onSelected,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            for (final destination in destinations)
              NavigationDestination(
                tooltip: destination.count == null || destination.count == 0
                    ? destination.label
                    : '${destination.label}, ${destination.count}',
                icon: _withCount(destination.icon, destination.count),
                selectedIcon: _withCount(
                  destination.selectedIcon,
                  destination.count,
                ),
                label: destination.label,
              ),
          ],
        ),
      ),
    );
  }

  Widget _withCount(IconData icon, int? count) {
    final value = count ?? 0;
    return Badge(
      isLabelVisible: value > 0,
      backgroundColor: AppComponentTokens.bottomNavCount,
      textColor: AppComponentTokens.bottomNavCountForeground,
      label: Text(value > 99 ? '99+' : '$value'),
      child: Icon(icon),
    );
  }
}

/// The frame around tab screens: the tab content and [AppBottomNav]. Each
/// tab screen brings its own [AppScaffold].
class AppTabScaffold extends StatelessWidget {
  const AppTabScaffold({super.key, required this.body, this.bottomNav});

  final Widget body;

  /// Null when the person has only one area: no bar is shown.
  final Widget? bottomNav;

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: body, bottomNavigationBar: bottomNav);
  }
}

/// The side menu: a [header] (the person and the shop), then rows.
class AppDrawer extends StatelessWidget {
  const AppDrawer({
    super.key,
    required this.header,
    required this.children,
    this.footer,
  });

  final Widget header;
  final List<Widget> children;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final footer = this.footer;
    return Drawer(
      backgroundColor: AppComponentTokens.drawerBackground,
      surfaceTintColor: AppComponentTokens.drawerBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(
          right: Radius.circular(AppComponentTokens.drawerRadius),
        ),
      ),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              child: header,
            ),
            const Divider(height: 1, color: AppColors.borderDefault),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s12,
                  vertical: AppSpacing.s8,
                ),
                children: children,
              ),
            ),
            if (footer != null) ...[
              const Divider(height: 1, color: AppColors.borderDefault),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                child: footer,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// A row of an [AppDrawer]: icon, label and an optional detail.
class AppDrawerRow extends StatelessWidget {
  const AppDrawerRow({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.detail,
    this.selected = false,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final String? detail;
  final VoidCallback onTap;
  final bool selected;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final detail = this.detail;
    final color = destructive ? AppColors.statusError : AppColors.textPrimary;
    return ListTile(
      minTileHeight: AppComponentTokens.controlMinHeight + AppSpacing.s8,
      selected: selected,
      selectedTileColor: AppComponentTokens.drawerSelectedBackground,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppComponentTokens.navItemRadius),
      ),
      leading: Icon(
        icon,
        color: destructive ? AppColors.statusError : AppColors.textSecondary,
      ),
      title: Text(
        label,
        style: AppTypography.bodyLarge.copyWith(
          color: color,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
        ),
      ),
      subtitle: detail == null
          ? null
          : Text(
              detail,
              style: AppTypography.body.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
      onTap: onTap,
    );
  }
}

/// A heading between groups of drawer rows.
class AppDrawerSection extends StatelessWidget {
  const AppDrawerSection({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.s16,
        AppSpacing.s16,
        AppSpacing.s16,
        AppSpacing.s4,
      ),
      child: Semantics(
        header: true,
        child: Text(
          title,
          style: AppTypography.caption.copyWith(
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
