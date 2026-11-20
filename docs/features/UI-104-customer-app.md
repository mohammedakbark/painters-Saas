# UI-104: Customer App in the new design

**Status:** Complete (local; Flutter tests). Not seen on a device: the emulator was stopped by the system for low memory before Home could be checked.
**Decision:** D-060 · **Design:** claude.ai artifact `VrnTXsW7v9hiNEWEHngTqr`, surface "Customer App"
**Builds on:** DS-005 (Customer App theme), DS-006, UI-103 (filled chips, blue in this theme)

## What changed

- **"Shopping from" banner** (new shared `AppContextBanner`, `component.contextBanner`): Home shows the active shop in a dark navy banner with its photo and "Change" in the accent yellow; the whole banner opens Find shops. Replaces the shop card and the separate "Change shop" button.
- **Product cards**: the brand sits above the product name (as entered, not forced to capitals, DESIGN_SYSTEM §9a).
- **Chips**: the selected category chip is filled blue with white text (from UI-103's `component.chip` with the Customer App override).

The welcome screen, tabs, theme, colours and font already matched the design (DS-005).

## Not in this feature

- Screens the design shows for features not built yet (search across all shops, checkout, My Orders, order tracking, Sites and site spend): they come with CUS-005 and CUS-006, built straight in this look.
- The painter's site-spend card on Home: part of CUS-005.
- The "Products at <shop>" heading with a count above the grid: the storefront API doesn't return a total.

## Checks

`flutter analyze` and `flutter test` in `flutter_shared` (97, new `context_banner_test.dart`), Customer App (33) and Shop App (183); `pnpm tokens:check`, token tests (both themes pass WCAG AA), `pnpm ui:check`.
