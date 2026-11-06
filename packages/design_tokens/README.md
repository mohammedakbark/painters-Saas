# Design tokens and brand (DS-001)

This folder is the **only** place where the visual tokens and the working product names are defined (decision D-034). The web portal and both Flutter apps use files generated from it.

| Source | Contents |
|---|---|
| `tokens.json` | Colours, contrast pairs, font family, type scale, radii, spacing, layout sizes, content widths, breakpoints |
| `brand.json` | Product name, portal name and description, Shop App and Customer App names |

```bash
pnpm tokens:generate   # write the generated files
pnpm tokens:check      # CI: fails if a generated file is out of date
pnpm --filter design-tokens test
```

The generator (`generate.mjs`, logic in `lib.mjs`, no dependencies) refuses to write anything when:
- a value is invalid (for example a colour that is not `#RRGGBB`);
- a text/background pair in `contrastPairs` is below WCAG AA (4.5:1);
- the font family is not bundled for Flutter, or the web font variable doesn't match.

## Generated files (never edit by hand)

| File | Used by |
|---|---|
| `apps/admin_web/src/app/tokens.css` | Tailwind v4 `@theme`, imported by `globals.css` |
| `apps/admin_web/src/lib/brand.ts` | `BRAND` constants (titles, `BrandMark`) |
| `packages/flutter_shared/lib/src/tokens/app_colors.dart`, `app_typography.dart`, `app_radius.dart`, `app_spacing.dart`, `app_layout.dart` | `AppColors`, `AppTypography`, `AppRadius`, `AppSpacing`, `AppLayout` |
| `packages/flutter_shared/lib/src/brand/app_brand.dart` | `AppBrand` constants |

Hand-written code that maps tokens onto widgets stays outside the generated files: `AppTheme` (Material theme) and `BrandMark` (Flutter), and the components in `apps/admin_web/src/components` (web).

## Rebranding

### Colours, sizes, radii, spacing, widths
1. Edit `tokens.json`. To restyle one kind of component everywhere (for example rounder buttons and fields, or another primary button colour), change its entry under `component` (for example `control.radius` or `buttonPrimary.background`); each entry names a base token.
2. Run `pnpm tokens:generate`. Fix any contrast failure it reports.
3. Run the checks (`pnpm test`, `fvm flutter test` in `packages/flutter_shared`) and look at the main screens.

### Product or app names
Edit `brand.json` and run `pnpm tokens:generate`. Two native labels are separate, because the platforms read them from their own files:
- Android: `android:label` in `apps/<app>/android/app/src/main/AndroidManifest.xml`;
- iOS: `CFBundleDisplayName` in `apps/<app>/ios/Runner/Info.plist`.

### Font
1. Put the new font files (with their licence) in `packages/flutter_shared/fonts/` and declare the family in `packages/flutter_shared/pubspec.yaml`.
2. Change the `next/font` import in `apps/admin_web/src/app/fonts.ts`, keeping or updating the `variable`.
3. Set `font.family` (and `font.webVariable` if it changed) in `tokens.json`, then run `pnpm tokens:generate`. The generator fails if steps 1 and 2 don't match.

### Logo (DS-003: SevenPalette shade-card fan)
- **Master files:** `logo/` holds `mark.svg` (full colour), `mark-inverse.svg` (on teal), `mark-mono-white.svg`, `mark-mono-black.svg`, `icon-small.svg` (three strips, favicon) and the app icon sources. They are all written by `logo/build-logo.mjs` from the colours in `tokens.json` (`brand.*`, `logo.*`); never edit the SVGs by hand.
- **Regenerate:** `pnpm --filter design-tokens run logo`. It writes the SVGs, `logo/png/app-icon-1024.png`, `logo/png/app-icon-foreground-1024.png`, and the web favicon and Apple icon (`apps/admin_web/src/app/icon.svg`, `apple-icon.png`).
- **App launcher icons:** after regenerating, run `fvm dart run flutter_launcher_icons` in `apps/shop_app` and `apps/customer_app`. The configuration is in each `pubspec.yaml`. The tool also edits `ios/Runner.xcodeproj/project.pbxproj`, putting `AppIcon` into `ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS`; that is a known slip, so revert it with `git checkout -- apps/*/ios/Runner.xcodeproj/project.pbxproj`.
- **In the UI:**
  - Web: `components/brand/logo-mark.tsx` (the fan as token classes) and `brand-mark.tsx` (fan plus "Seven**Palette**" wordmark).
  - Flutter: `LogoMark` and `BrandMark` in `packages/flutter_shared/lib/src/brand/brand_mark.dart`.
  - The geometry matches `build-logo.mjs` (strips 12 × 62, 24° apart, pivot at (50, 84), drawing box `-24.23 8 148.46 85`).

Paint shade colours are catalogue data and never belong in these files.

## Component guard (DS-002, D-039)

`pnpm ui:check` (`check-components.mjs`) lists raw controls in screens: on the web, `<input>` (except hidden), `<select>`, `<textarea>`, `<button>`, `<dialog>`, base `rounded-*` radii and hex colours outside `components/ui`; in Flutter, raw Material controls, overlays, `Image.network`, literal colours and `BorderRadius.circular` outside `flutter_shared`'s components, theme and tokens. Each finding names the component to use. A genuine exception goes in `EXCEPTIONS` with a reason.
