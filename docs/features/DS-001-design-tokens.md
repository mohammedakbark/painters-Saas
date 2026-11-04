# Feature: Single-source design tokens and brand names

- **Feature ID:** DS-001
- **Status:** Complete (local verification; see §13)
- **Last updated:** 2026-11-04
- **Related modules:** `packages/design_tokens` (new), web portal (`apps/admin_web`), `packages/flutter_shared`, Shop App, Customer App
- **Decisions:** D-034 (one place for the theme), T-016

## 1. Problem and goal

The product name, logo and final colours are not decided. When they are, changing the look must be one edit, not a hunt through two codebases. Before DS-001 the tokens existed twice, in the web `@theme` block and in the Flutter token classes, each with a "keep in sync" comment. App names were typed in many places.

Goal: colours, typography, radii, spacing, content widths, breakpoints and the working product/app names are defined once, and every app uses generated code from that source.

## 2. User roles and permissions

Not user-facing. It affects developers and the product owner (rebranding).

## 3. Preconditions

None.

## 4. User flow (developer)

1. Edit `packages/design_tokens/tokens.json` or `brand.json`.
2. Run `pnpm tokens:generate`. The generator validates the values and writes the web and Flutter files.
3. Commit both the JSON and the generated files. CI fails when they disagree (`pnpm tokens:check`).

Failure paths:
- **Invalid value** (for example a colour that is not `#RRGGBB`, a weight that is not 100–900): the generator lists each problem and writes nothing.
- **A listed text/background pair below WCAG AA (4.5:1):** the generator reports the ratio and fails.
- **Font family changed** but not bundled for Flutter (`pubspec.yaml`), or the web font variable doesn't match `fonts.ts`: the generator fails with the file to fix.

## 5. Business rules

1. `tokens.json` and `brand.json` are the only source of tokens and working names. Generated files are never edited by hand.
2. Paint shade colours are catalogue data and never become tokens.
3. Hand-written mapping code stays outside generated files: `AppTheme` (Material theme), `BrandMark` (web and Flutter) and the web UI components.
4. Native app labels (Android `android:label`, iOS `CFBundleDisplayName`) and launcher icons are manual steps, documented in `packages/design_tokens/README.md`.

## 6. UI requirements

No visual redesign. Visible changes:
- The Shop App sign-in screen shows the brand mark above "Shop owners and staff". Its form width is the shared `form` width, 448 px (was 420 px).
- The Customer App placeholder shows the brand mark.
- Web: `BrandMark` replaces the typed "Admin portal" text in the console sidebar and on the home page. Page titles come from a title template ("Shop sign-in · Admin portal").
- Web content widths now use the token utilities `max-w-form` / `narrow` / `content` / `page` (same sizes as the Tailwind defaults used before: 28, 36, 48 and 72 rem). The sidebar width uses `--container-sidebar`.

## 7. API contract

None.

## 8. Data model and migrations

None.

## 9. Security and privacy

None. The generator has no dependencies and runs only locally and in CI.

## 10. Acceptance criteria

- [x] Changing a value in `tokens.json` and running `pnpm tokens:generate` updates both the web theme and the Flutter tokens.
- [x] `pnpm tokens:check` fails when a generated file is missing or out of date; CI runs it.
- [x] The generator rejects invalid values, text pairs below WCAG AA, a font not bundled for Flutter and a mismatched web font variable.
- [x] App and portal names come from `brand.json` (`BRAND` on the web, `AppBrand` in Flutter); `BrandMark` is the single place to put a logo.
- [x] No hard-coded colours, font sizes, radii or arbitrary widths remain in the web or Flutter UI code (checked with grep).
- [x] Generated Dart passes `dart format` unchanged; generated CSS and TypeScript pass Prettier.
- [x] Existing tests still pass; page titles are unchanged.

## 11. Test plan

- **Generator (`node --test`, 15 tests):** name conversion, rem conversion, WCAG ratios, every validation failure, Dart line length, and generated files matching the committed ones.
- **Web:** `BrandMark` component tests; build output checked for the width utilities and the page titles.
- **Flutter:** `BrandMark` widget test (text, colour, screen-reader label), layout token values, plus the existing token and contrast tests.

## 12. Dependencies and open questions

- Product name and logo: question 41. When decided, follow the Rebranding section in `packages/design_tokens/README.md`.
- Dark theme: not requested; the token format can add a second colour set later.

## 13. Implementation notes

**Source and generator:** `packages/design_tokens/`:
- `tokens.json`: colours with their use, contrast pairs, font, typography, radius, spacing, layout, container widths, breakpoints.
- `brand.json`: product name, portal name and description, app names.
- `lib.mjs`: validation and renderers. `generate.mjs`: the CLI (`--check`).
- `test/tokens.test.mjs`, `README.md` (generated files and rebranding steps).
- A private pnpm workspace package `design-tokens`. Root scripts: `tokens:generate`, `tokens:check`.

**Generated files:**
- Web: `apps/admin_web/src/app/tokens.css` (imported by `globals.css`), `apps/admin_web/src/lib/brand.ts`.
- Flutter: `packages/flutter_shared/lib/src/tokens/app_colors.dart`, `app_typography.dart`, `app_radius.dart`, `app_spacing.dart`, `app_layout.dart` (new), and `lib/src/brand/app_brand.dart` (new). Class and member names are unchanged.

**Hand-written changes:**
- Flutter: the Material text-theme mapping moved from `AppTypography` to `AppTheme.textTheme`; new `BrandMark` widget; exports updated; Shop App and Customer App use `AppBrand` and `AppLayout.formMaxWidth`.
- Web: `src/app/fonts.ts` (the only `next/font` call), root title template, a title template for the platform console (a nested string title would stop the root template), `BrandMark` component, token width utilities.
- CI: "Design tokens are up to date" step in the typescript job.

**Verified locally (2026-11-04):** see `docs/PROJECT_STATE.md` §6 (DS-001).

**Not verified:** API e2e and the emulator walkthrough were not re-run: there is no API change, and the only Shop App change is the brand mark and the form width, both covered by widget tests.

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-04 | Specification and implementation (product owner request D-034) |
