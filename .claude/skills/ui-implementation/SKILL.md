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

## Visual rules
- Use centralized color, typography, spacing and radius tokens.
- Use Inter as the provisional typeface.
- Use light theme, navy/blue primary and limited amber accent.
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
- **Status colours:** every state has its own token colour (filled soft badge with a dot: green success, amber warning, red error, blue info, grey neutral). Opposite states (Available / Not available, Live / Draft) must never look alike. Always keep the words.
- **Small forms open in a side sheet (D-051):** on the web, adding or editing a small record from a list (about 8 fields or fewer, no list inside) uses `SideSheet` + `SideSheetButton` (`components/ui/side-sheet.tsx`), not an inline form card or a separate page. The Server Action calls `refresh()` and returns `saved` (and optional `savedLink`); the form calls `useCloseSheetOnSave(state)`, so the sheet closes, the list updates and a toast confirms. Cancel inside a sheet closes it. Records with their own lists or many sections (product with pack sizes, order detail, settings) stay full pages. Deep links open a sheet with `?add=...` and `defaultOpen`. The mobile apps use `showAppBottomSheet`.
- **Copy:** follow DESIGN_SYSTEM §9a (sentence case, "Not available", "Sign in").
- **Rollout order for UI work:** shop admin web, then platform admin web, then the Shop App, then the Customer App. One area at a time, each verified in a browser or emulator.
- **Loading and updates:** follow `.claude/skills/data-loading` (D-044): static shell, per-section Suspense, `UrlForm` for search and filters, busy state on the button, no whole-page reload for one change.
- **Efficiency:** small fixes go straight to the change and a short check; plans, screenshots and long reports are for features.

Review small mobile widths, larger phones and responsive web. Verify accessibility labels, keyboard behavior, contrast and readable text. Update the design-system document if tokens change.
