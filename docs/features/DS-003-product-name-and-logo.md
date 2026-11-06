# Feature: SevenPalette name and logo

- **Feature ID:** DS-003
- **Status:** Complete (local verification; see §5)
- **Last updated:** 2026-11-06
- **Related modules:** `packages/design_tokens` (`brand.json`, `tokens.json` `logo.*`, `logo/`), `apps/admin_web` (`components/brand`, `app/icon.svg`, `app/apple-icon.png`), `packages/flutter_shared` (`BrandMark`, `LogoMark`), both Flutter apps (labels, launcher icons)
- **Decisions:** D-040 (name, app names, tagline, logo), D-034 (single-source brand), D-039 (shared components)

## 1. Goal

The owner chose the name **SevenPalette** and the **shade-card fan** logo (concept 1 on 2026-11-06). Until then the product showed the text "Paint Shop Platform", a sparkle placeholder tile and Flutter's default launcher icons. Now the name and logo appear everywhere through the single brand source.

## 2. Names

| Where | Name |
|---|---|
| Product (`BRAND.productName`) | SevenPalette |
| Customer App (store label, `BRAND.customerAppName`) | SevenPalette |
| Shop App | SevenPalette Shop |
| Web portal | SevenPalette Admin |
| Tagline (`BRAND.tagline`) | Shop. Painter. Customer. Connected. |

Native labels: `android:label` in each app's `AndroidManifest.xml`, `CFBundleDisplayName` in each `Info.plist`.

## 3. Logo

- **Geometry** (from the approved concept, refined):
  - seven strips 12 × 62 with rounded corners;
  - rotated −72° to 72° in 24° steps about a pivot dot;
  - the drawing box widened to the fan's real bounds (`-24.23 8 148.46 85`), because the concept's 100 × 100 box cut off the outer strips.
- **Colours:**
  - teal dark, teal, `logo.tealMid`, `logo.tealLight`, yellow (`brand.accent`), `logo.orange`, coral (`brand.highlight`);
  - on dark surfaces: `logo.tealLight`, `logo.mint`, white, yellow, yellow, orange, coral;
  - the five new `logo.*` tokens are for the logo only.
- **Files:** `packages/design_tokens/logo/build-logo.mjs` writes:
  - `mark.svg`, `mark-inverse.svg`, `mark-mono-white.svg`, `mark-mono-black.svg`;
  - `icon-small.svg`: three wide strips, readable at 16 px; also the favicon;
  - `app-icon.svg`: full-bleed teal square;
  - `app-icon-foreground.svg`: Android adaptive layer, sized for the tool's 16 % inset and the 66 dp safe circle;
  - 1024 px PNGs, using `@resvg/resvg-js`.
- **Web:**
  - `LogoMark` (the fan in token classes) and `BrandMark` (fan plus "Seven**Palette**", with "Admin" in the portal; the plain name for screen readers);
  - the placeholder sparkle tiles in the header, footer and auth panel are gone;
  - favicon `app/icon.svg`, Apple icon `app/apple-icon.png`;
  - `<html data-scroll-behavior="smooth">` so the router can turn smooth scrolling off during navigation (Next 16).
- **Flutter:** `LogoMark` (a `CustomPainter` with the same geometry) and `BrandMark` (fan plus wordmark plus the app's word, e.g. "Shop"; the app name for screen readers).
- **Launcher icons:**
  - generated with `flutter_launcher_icons` for both apps: Android legacy and adaptive (teal background plus fan foreground), and iOS;
  - the tool's edit to `project.pbxproj` is reverted on purpose (see `packages/design_tokens/README.md`).

## 4. Out of scope

- Bundle IDs: question 41 can now be answered, but it still needs the owner's choice.
- Buying the domains, and the trademark check (owner).
- Instagram assets.

## 5. Checks (2026-11-06)

| Check | Result |
|---|---|
| `pnpm tokens:check`, `pnpm ui:check`, format, admin_web lint, typecheck, tests, build | Passed |
| Flutter `dart format`, `flutter analyze`, tests: flutter_shared 65, shop_app 70, customer_app 1 | Passed |
| Logo previews: full mark, app icon, small icon at 16/32/64 px, Android xxxhdpi launcher icon | Checked visually |
| Home page header, footer and hero at 1280 px, and the header at 2× zoom | Verified (no dev issues) |
| Android emulator: launcher icon and label | **Not run** in this session |
