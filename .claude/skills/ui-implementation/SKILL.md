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

Review small mobile widths, larger phones and responsive web. Verify accessibility labels, keyboard behavior, contrast and readable text. Update the design-system document if tokens change.
