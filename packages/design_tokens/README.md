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
1. Edit `tokens.json`.
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

### Logo
- Web: change `apps/admin_web/src/components/brand/brand-mark.tsx` (a text mark today).
- Flutter: change `packages/flutter_shared/lib/src/brand/brand_mark.dart`.
- App launcher icons (Flutter defaults today) and a web favicon (none yet; Next.js uses `apps/admin_web/src/app/icon.png` or `favicon.ico` when added) come with the logo, for example generated with the `flutter_launcher_icons` tool. This is not set up yet.

Paint shade colours are catalogue data and never belong in these files.
