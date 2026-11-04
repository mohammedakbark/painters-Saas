# Design System

**Status:** Provisional visual foundation — review before detailed screen design  
**Last updated:** 2026-11-04

The product should feel clear, dependable and practical for local paint shops, painters and customers. Avoid a generic admin-template appearance. Prioritize product information, readable prices, clear shop context and simple actions. Product name/logo are not decided.

## 1. Visual direction

- Light theme first; white and very light neutral surfaces.
- Navy/blue as the primary brand family.
- Warm yellow/amber as a limited accent.
- Clear typography and controlled spacing.
- Rounded cards and inputs, but avoid excessive pills and decorative containers.
- Use color to communicate meaning, not decoration.
- Product imagery and shade information should be prominent.

Values below are initial tokens, not final brand approval. **Source of truth:** `packages/design_tokens/tokens.json` (and `brand.json` for product/app names), since DS-001. The tables here describe the tokens; if they ever differ, `tokens.json` wins. Change a token there, run `pnpm tokens:generate`, then update this document. Rebranding steps (colours, font, logo, names): `packages/design_tokens/README.md`.

## 2. Colour tokens

| Token | Hex | Use |
|---|---|---|
| `brand.primary` | `#1F4B7A` | Main actions, selected navigation, links |
| `brand.primaryStrong` | `#163A5F` | Pressed/strong primary states |
| `brand.primarySoft` | `#EAF1F8` | Selected backgrounds/highlights |
| `brand.accent` | `#F5B544` | Limited highlights and offers |
| `surface.default` | `#FFFFFF` | Main surfaces |
| `surface.subtle` | `#F7F9FC` | Page backgrounds/secondary sections |
| `surface.raised` | `#FFFFFF` | Cards/dialogs |
| `text.primary` | `#17212F` | Main text |
| `text.secondary` | `#667085` | Supporting text |
| `text.disabled` | `#98A2B3` | Disabled text |
| `border.default` | `#E4E7EC` | Borders/dividers |
| `border.strong` | `#CBD5E1` | Emphasized borders |
| `status.success` | `#15803D` | Success |
| `status.warning` | `#B45309` | Warning |
| `status.error` | `#B42318` | Error/destructive |
| `status.info` | `#2563EB` | Informational |

The generator fails if a text/background pair listed in `tokens.json` (`contrastPairs`) is below WCAG AA (4.5:1).

Rules: use one primary action per screen; use accent yellow sparingly and dark text on it; never use color alone for status; verify contrast to WCAG AA; paint shade colors are catalogue data, not app brand tokens.

## 3. Typography

**Proposed font:** Inter across web and mobile. Bundle/localize font assets for Flutter and use a build-time font strategy for Next.js.

| Token | Size | Weight | Use |
|---|---:|---:|---|
| `display` | 32 px | 700 | Rare hero/summary |
| `heading1` | 28 px | 700 | Main page heading |
| `heading2` | 24 px | 600/700 | Section/page title |
| `heading3` | 20 px | 600 | Card/subsection title |
| `title` | 18 px | 600 | Product/list title |
| `bodyLarge` | 16 px | 400/500 | Main body |
| `body` | 14 px | 400/500 | Supporting body |
| `caption` | 12 px | 400/500 | Helper text/metadata |

Body text should normally be at least 14 px. Use tabular numerals for prices/totals where supported. Avoid too many weights on one screen.

## 4. Spacing scale

Use a 4 px base scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

- Standard mobile side padding: 16 px; 20–24 px on larger phones.
- Content widths (web utilities and Flutter `AppLayout`): `form` 448 px (sign-in and short forms), `narrow` 576 px, `content` 768 px, `page` 1152 px, `sidebar` 256 px. Tailwind's default container sizes are reset, so only these exist.
- Keep related controls close; use larger spacing between sections.
- Avoid arbitrary one-off spacing values unless necessary.
- Centralize tokens in Flutter and web.

## 5. Shape and elevation

| Token | Value | Use |
|---|---:|---|
| `radius.small` | 8 px | Compact surfaces |
| `radius.medium` | 12 px | Buttons and controls |
| `radius.large` | 16 px | Cards and sheets |
| `radius.xlarge` | 20 px | Large panels |
| `radius.pill` | 999 px | Chips/status pills only |

Prefer subtle borders over heavy shadows. Do not wrap every content section in a card.

## 6. Controls and interaction

- Minimum mobile touch target: 48 × 48 logical pixels where practical.
- Buttons need action-oriented labels.
- Inputs need labels, helper text, validation, disabled and loading states.
- Confirm destructive actions involving data loss or financial changes.
- Include loading, empty, error and success states for data-driven screens.
- Do not rely only on toast messages for important financial/order updates.

## 7. Responsive web rules

Proposed breakpoints: compact below 600 px; medium 600–899 px; desktop 900–1199 px; wide desktop 1200 px and above.

- Mobile web uses compact navigation.
- Desktop admin may use a persistent sidebar.
- Tables must remain usable on narrow screens (responsive cards or controlled horizontal scroll).
- Forms should not stretch across an entire wide monitor.
- Keep content widths readable.

## 8. Reusable component foundations

Flutter: app theme, semantic colors, typography, spacing/radius constants, buttons, text fields, loading/empty/error/confirmation components, and stable repeated domain components such as product/shop cards.

Web: Tailwind theme/CSS variables, buttons, inputs, dialogs, tables, badges, form primitives, page header, sidebar and responsive containers.

Prefer small composable components. Avoid universal components with dozens of unrelated flags. Extract domain components when their behavior is stable and reused.

## 9. Paint-specific UI

- Always make the selected shop visible in customer shopping context.
- Clearly label products from other shops in cross-shop results.
- Display brand, pack size, price and shade information in a scannable order.
- Do not use a generic colored circle as a substitute for an actual shade catalogue.
- Show shade name/code as text as well as a visual preview.
- Painter-only incentives must be distinct from public selling price and hidden from normal customers.
- Bills should separate subtotal, discount, tax (if applicable), payments and outstanding amount.

## 10. Accessibility and change control

Use semantic labels, keyboard navigation on web, readable contrast and scalable text. Do not communicate status by color alone. If a token changes, change `packages/design_tokens/tokens.json`, run `pnpm tokens:generate`, update this document, check affected components/screens and update `docs/PROJECT_STATE.md`. CI fails when the generated files are out of date.

Token implementations (generated since DS-001, 2026-11-04):
- Source: `packages/design_tokens/tokens.json` and `brand.json`; generator `generate.mjs` (`pnpm tokens:generate`, `pnpm tokens:check`).
- Flutter: generated `AppColors`, `AppTypography`, `AppRadius`, `AppSpacing`, `AppLayout` and `AppBrand` in `packages/flutter_shared/lib/src/`; hand-written `AppTheme.light()` (Material mapping) and `BrandMark`. Inter is bundled in `packages/flutter_shared/fonts`. Tests check token sizes and WCAG AA contrast.
- Web: generated `apps/admin_web/src/app/tokens.css` (Tailwind v4 `@theme`, imported by `globals.css`) and `src/lib/brand.ts`. Tailwind's default palette, font sizes, radii, container sizes and breakpoints are reset, so only these tokens are available. The font is loaded once in `src/app/fonts.ts` (`next/font`). `BrandMark` (`src/components/brand/`) shows the product mark; page titles use the root title template.
- Where this document lists a weight range (for example 600/700), Flutter uses the first value. On the web, apply the weight with a `font-*` utility.
- Web components (since AUTH-001, `apps/admin_web/src/components`): `Button` (primary/secondary, pending state, 48 px minimum height), `SubmitButton`, `Field` (label, helper text and error linked through `aria-describedby`), `Alert` (tone stated in text, `role="alert"` for errors), `PageHeader`, `Spinner`, `StateMessage` (empty/error/access states) and `AppShell` (persistent sidebar from the `desktop` breakpoint, compact top bar below it). They use the token utilities only.
- Flutter shared widgets (since SHP-002, `packages/flutter_shared`): `LoadingView` (spinner with a visible message), `MessageView` (title, explanation and action for empty, access and not-found states) and `ErrorView` (with "Try again"). The Shop App shows status as text (a chip), uses 48 px minimum touch targets, and lets error text wrap instead of truncating.
