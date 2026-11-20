# UI-101: Shop Admin web in the new design

**Status:** Complete (local; Chrome at 1366 px, web tests, build)
**Decision:** D-060 · **Design:** claude.ai artifact `VrnTXsW7v9hiNEWEHngTqr`, surface "Shop Admin"
**Builds on:** DS-006

## What changed

- **Console sidebar** (`AppShell`, `NavLinks vertical`): deep teal (`component.sidebar`) with the inverse logo, the shop as a translucent card with its status in the caption ("Shop · Live"), groups Daily work (Overview, Orders, Customers), Catalogue (Products, Shades, Categories), Shop (Settings, Shop profile, moved out of the account menu), and "Coming in later phases" with Bills & credit (Phase 3) and Rewards & offers (Phase 4) greyed out (D-060). The current item is a white tile; the new-order count is sunflower. Collapse to icons still works. The account row (sunflower avatar) stays at the bottom.
- **Page bar** (`PageHeader`): a white bar across the top of every console page with the back link or caption, a 20 px title, the description and the page's actions; it stays at the top while the page scrolls on desktop. The console's main area no longer has a maximum width or top padding. `PageLoading` has the same shape.
- **Overview**: Record an order and Add product in the page bar (by permission); the first KPI tile is the filled lead tile; a Latest orders table (five most recent, `orders.handle`) beside To do and Pickup and delivery; product figures below. The status card shows only on the way to Live (or just after registering).
- **Orders**: tab counts in count chips. **Order page**: progress steps (New, Packing, Ready for pickup or Out for delivery, Completed); none for a cancelled order (`orderProgress` in `lib/orders/labels.ts`).
- **Products, Categories**: segment counts in chips. **Settings**: the page bar spans the page; the cards keep the content width.

The Platform Admin console shares `AppShell` and `PageHeader`, so it has the new sidebar and page bar too; its screens are UI-102.

## Not in this feature

- The design's Users page and permission matrix: the web has no Users page yet (employees are postponed), so nothing was built.
- Initials avatars in tables and the shop photo in the sidebar card: small extras left for later.
- Phone width was not checked in Chrome this time (the window could not be resized); the layout uses the same responsive classes as before.

## Checks

`pnpm ui:check`, lint, typecheck, 253 web tests (new: `orderProgress`, later-phase nav item, `ProgressSteps`, lead `StatTile`), production build. Chrome at 1366 px: Overview, Orders, an order page, Products, Customers, Shades, Settings, Shop profile, New order.
