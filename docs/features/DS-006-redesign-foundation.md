# DS-006: UI redesign foundation

**Status:** Complete (local; web unit tests, token tests, Flutter shared tests, web build)
**Decision:** D-060 (product owner, 2026-11-20)
**Design:** claude.ai artifact `VrnTXsW7v9hiNEWEHngTqr` ("SevenPalette Screens")

## Goal

The owner's new design covers the Shop Admin web, Platform Admin web, Shop App and Customer App. It keeps the existing tokens (standard teal look, Customer App theme D-057) and changes layout and components. DS-006 adds only the shared tokens and web components the next four features need, without changing any screen. Rollout:

| Feature | Surface | Status |
|---|---|---|
| DS-006 | Shared tokens and components | Complete |
| UI-101 | Shop Admin web: dark sidebar, page bar, every shop screen | Next |
| UI-102 | Platform Admin web | Planned |
| UI-103 | Shop App (chips, stat tiles, sheets restyled in `flutter_shared`) | Planned |
| UI-104 | Customer App (existing CUS-001 to CUS-004 screens), then CUS-005 resumes | Planned |

## What was added

- `tokens.json` component tokens `sidebar` and `statTileLead`, and contrast pairs for white on `brand.primaryStrong` and the reverse (checked in both themes).
- Web `StatTile lead`: the filled deep-teal first tile of a KPI row.
- Web `SegmentedLinks` `count` per segment; the current segment is now `brand.primarySoft` with `brand.primaryStrong` text in a 12 px control (was a filled pill), as in the design.
- Web `ProgressSteps`: an order's steps, done / current / later, with the state in words for screen readers.
- Web `NavItem.later`: an area planned for a later phase, greyed out with a tag such as "Phase 3", not a link (D-060).

## Acceptance criteria

- [x] New tokens generate for web and Flutter; `pnpm tokens:check` and the token tests pass (WCAG AA in both themes).
- [x] Components covered by unit tests (`stat-tile.test.tsx`, `progress-steps.test.tsx`, `console-ui.test.tsx`).
- [x] `pnpm ui:check`, lint, typecheck, web build, `flutter analyze` and `flutter test` in `flutter_shared` pass.
- [x] No screen uses the new pieces yet (UI-101 does). Visible change: the segmented control style on the pages that use it.

## Limitations

- Flutter components (chips, stat tiles, sheets) are compared with the design in UI-103 and UI-104, so the apps change with their own phase.
