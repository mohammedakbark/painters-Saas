---
name: ui-implementation
description: Build consistent Flutter and Next.js interfaces using the project's design system, reusable components and accessibility rules.
---

# UI Implementation

Use for Customer App, Shop App and admin web UI work.

## Before coding
1. Read `docs/DESIGN_SYSTEM.md` and the feature specification.
2. Identify the user role and exact task the screen supports.
3. Inspect existing shared components before creating new ones.
4. Follow the design reference below.

## Follow the design reference (D-060, product owner 2026-11-20)
The owner's design artifact **"SevenPalette Screens"** (claude.ai `VrnTXsW7v9hiNEWEHngTqr`; read it with the Artifact tool, `action: "read"`) is the visual reference for every screen on all four surfaces. `docs/DESIGN_SYSTEM.md` §11 maps each design screen to its feature. For every feature with UI:
1. **Find the design screens.** Open the surface in the artifact (Shop Admin, Platform Admin, Shop App, Customer App) and find each screen the feature touches in its screen index. Record them in the spec's "Design" table (template §6a): our screen, design screen, and status.
2. **Take looks from the design, features from the docs.** Layout order, hierarchy, which component is used, spacing rhythm, empty and loading shapes and copy tone come from the design. Behaviour, fields, rules and numbers come only from the documents and decisions. The design's sample data (prices, ₹80 delivery, names) is illustration, never a rule. A control or screen shown in the design but not in the documents is asked about, not built.
3. **Build from components.** Use the existing shared components. If the design shows something no component does, add a component token and a component first (DESIGN_SYSTEM §8), then use it; never style it in the screen.
4. **No design screen?** Use the closest design screen's pattern on the same surface (for example a new list follows Orders) and note which one in the Design table.
5. **Compare before done.** Run the screen (browser at desktop and phone width, or the Android emulator) and compare it with the design screen side by side. Fix differences or list them in the spec with the reason (missing API data, not in the docs, later feature). Nothing is "complete" with an unexplained difference.
6. **Keep the reference current.** When a design screen is built, mark it in DESIGN_SYSTEM §11. If the owner updates the artifact, re-read it before the next UI feature.

## Visual rules
- Use centralized color, typography, spacing and radius tokens.
- Standard look (web and Shop App): Inter, deep teal primary, sunflower accent, cream background. Customer App theme (D-057): Plus Jakarta Sans, navy and blue with brush-stroke yellow. Light theme only.
- Keep product information, shop context, prices and actions easy to scan.
- Make the active shop clear in customer shopping flows.
- Clearly distinguish another shop's search result.
- Hide painter-only incentives from normal customers.
- Pair status colors with text/icons.
- Respect responsive breakpoints and mobile touch targets.
- Include loading, empty, error, disabled and success states.

## Component rules
- Screens use only the shared components (D-039, DESIGN_SYSTEM §8): web `components/ui`, Flutter `flutter_shared` components. Never style raw controls, base radii or literal colours in a screen.
- A control that has no component yet is added as a component first (styled from the component tokens in `tokens.json`), then used. Run `pnpm ui:check`.
- Prefer small, composable, reusable components.
- Extract components when behavior is repeated or the visual contract is stable.
- Avoid giant widgets, unrelated boolean flags and premature abstraction.
- Do not duplicate design tokens in individual screens.
- Keep API/business rules out of presentation widgets.

## Lists, status colours and rollout (product owner, 2026-11-06)
- **Web lists that can grow past about 20 rows** use `DataTable` + `ColumnFilter` + `Pagination` (CAT-003): server-side filtering and paging, filters in the URL (`FilterForm`), a filter per column, tabs for big groupings (for example litres / kilograms), sortable name and price. The same table stacks into cards on phones.
- **Mobile apps never use tables:** search, a filter bottom sheet, chips for active filters and a list with "Load more". Design for the thumb first.
- **Mobile screen layout (SHP-011):** every screen is an `AppScaffold`. Tab screens (Shop App: Home, Orders, Products, Customers) have the menu icon, the shop name as subtitle and the `ShopDrawer`; detail screens open above the tabs with a back arrow. One main action per screen in `AppBottomActionBar`; other actions in the top bar (at most two) or a `AppMenuButton`. Pull to refresh on lists and dashboards. Every tab, row, button and detail route is shown only with its permission (D-056, `MyShop.can`); detail routes are wrapped in `RequirePermission`. Never check `myRole`.
- **Status colours:** every state has its own token colour (filled soft badge with a dot: green success, amber warning, red error, blue info, grey neutral). Opposite states (Available / Not available, Live / Draft) must never look alike. Always keep the words.
- **Small forms open in a side sheet (D-051):** on the web, adding or editing a small record from a list (about 8 fields or fewer, no list inside) uses `SideSheet` + `SideSheetButton` (`components/ui/side-sheet.tsx`), not an inline form card or a separate page. The Server Action calls `refresh()` and returns `saved` (and optional `savedLink`); the form calls `useCloseSheetOnSave(state)`, so the sheet closes, the list updates and a toast confirms. Cancel inside a sheet closes it. Records with their own lists or many sections (product with pack sizes, order detail, settings) stay full pages. Deep links open a sheet with `?add=...` and `defaultOpen`. The mobile apps use `showAppBottomSheet`.
- **Copy:** follow DESIGN_SYSTEM §9a (sentence case, "Not available", "Sign in").
- **Rollout order for UI work:** shop admin web, then platform admin web, then the Shop App, then the Customer App. One area at a time, each verified in a browser or emulator.
- **Loading and updates:** follow `.claude/skills/data-loading` (D-044): static shell, per-section Suspense, `UrlForm` for search and filters, busy state on the button, no whole-page reload for one change.
- **Efficiency:** small fixes go straight to the change and a short check; plans, screenshots and long reports are for features.

Review small mobile widths, larger phones and responsive web. Verify accessibility labels, keyboard behavior, contrast and readable text. Update the design-system document if tokens change.
