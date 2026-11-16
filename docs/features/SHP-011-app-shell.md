# SHP-011: Shop App shell, navigation and one screen layout

Status: **Complete (local; tests, Android emulator 2026-11-16)**; see `docs/PROJECT_STATE.md` §6. Second of the Shop App redesign features (owner, 2026-11-15).

## Goal
Make the Shop App easy to move around and the same on every screen, using the web console as the reference: bottom tabs by daily priority, a side menu with the person and the shop, a dashboard home, and every area shown only to people allowed to use it (D-056).

## Navigation
- **Your shops** → the shop's **tabs**: **Home**, **Orders**, **Products**, **Customers** (SHP-012). Each tab keeps its own screen and scroll position; tapping the open tab again goes back to its first screen.
- A tab is shown only with its permission: Orders `orders.handle`, Products `catalogue.view`, Customers `customers.manage`; Home always. With only one tab the bar is hidden.
- The Orders tab shows a count of new orders (red badge, also spoken).
- **Detail screens** (an order, New order, a product, Add from brand catalogue, and the side-menu screens) open above the tabs with a back arrow; Android back returns to the screen underneath. The side-menu screens sit under the Home route (`/shops/:id/home/profile`, `settings`, `shades`, `categories`; `shopMenuPath`), so back always returns to the home. Each checks its permission; a link to a screen the person may not use shows "You don't have access to this" with **Go to the shop home**.
- **Side menu** (menu icon on the tab screens; it opens over the whole screen, bottom tabs included, because `AppTabScaffold` hosts it): brand, shop name, status and role, "Signed in as" the mobile; **Shop profile**; **Shop settings** (with `shop.settings`, SHP-013); **Shades** and **Categories** (with `catalogue.view`, SHP-014); **Switch shop** (only with more than one shop); **Sign out** (asks to confirm); "Powered by zero.byt". Sign out is no longer in every top bar.

## Home (like the web Overview)
- Status card with the review details (unchanged wording).
- **To do** (Live shops, `orders.handle`): new orders to start, orders not paid yet (opens Orders → All, unpaid; shown only here, not again under the figures); "Nothing waiting" when empty.
- **Orders** figures: New, To pack, Ready or on the way, Today's sales (only with `reports.view`); each opens the matching orders.
- **Products** figures (`catalogue.view`, from `catalogue/summary`): On sale, All sizes available, Some sizes not available, Not available.
- **Shortcuts:** New order (`orders.record`, Live), Add from brand catalogue (`catalogue.manage`).
- Pull down to refresh; each section loads and fails on its own.

## One screen layout
- Every screen is an `AppScaffold`: the title in the top bar (the shop name under it on tab screens), at most two actions, the menu icon on tab screens and the back arrow on detail screens.
- The screen's main action sits in an `AppBottomActionBar` under the content: **New order** on Orders, **Add from brand catalogue** on Products.
- Sign-in and full-screen messages use `AppPlainScaffold`.
- `pnpm ui:check` now refuses raw `Scaffold`, `AppBar`, `SliverAppBar`, `NavigationBar`, `BottomNavigationBar`, `Drawer` and `NavigationDrawer` in screens.

## Shared components (D-039)
`packages/flutter_shared/lib/src/components/app_navigation.dart`: `AppTopBar`, `AppScaffold`, `AppPlainScaffold`, `AppBottomActionBar`, `AppIconButton`, `AppMenuButton` / `AppMenuItem`, `AppBottomNav` / `AppNavDestination`, `AppTabScaffold`, `AppDrawer`, `AppDrawerRow`, `AppDrawerSection`. New component tokens `topBar`, `bottomNav`, `drawer` and `actionBar` in `packages/design_tokens/tokens.json`.

## Code
- `apps/shop_app/lib/src/features/shell/shop_shell.dart`: `ShopTab`, `ShopShell`, `RequirePermission`, `NoAccessView`, `ShopDrawer`.
- `routing/router.dart`: `StatefulShellRoute.indexedStack` under `/shops/:shopId` with one branch per tab (`home`, `orders`, `catalogue`; go_router needs each tab's first route free of parameters, and `/shops/:shopId` redirects to `/shops/:shopId/home`); detail routes open on the root navigator and are wrapped in `RequirePermission`.
- `features/shops/shop_home_screen.dart`: the dashboard.
- `catalogue`: `CatalogueSummary`, `ShopCatalogueRepository.summary`, `catalogueSummaryProvider`.
- Orders list: `initialPaid` (link from the home) and a new step or filter from a link while the tab is open.

- `BrandMark` scales down instead of overflowing in the side menu or with large text.

## Limits
- The app version is not shown in the menu yet (it needs a new package).
