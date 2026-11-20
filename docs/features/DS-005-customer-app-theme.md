# Feature: Customer App theme

- **Feature ID:** DS-005
- **Status:** Complete (local; token, Flutter and Shop App tests). Not yet seen on a device: the Customer App only has its placeholder screen until CUS-001
- **Last updated:** 2026-11-20
- **Related modules:** `packages/design_tokens` (`tokens.json` `themes`, `lib.mjs`), `packages/flutter_shared` (`AppPalette`, `AppColors`, `AppComponentTokens`, `AppTypography`, `AppTheme`, `BrandMark`, Plus Jakarta Sans fonts), `apps/customer_app/lib/main.dart`
- **Decisions:** D-042, D-057; open questions 58 (dark mode) and 59 (features shown in the reference design)

## 1. Goal

The Customer App gets its own look from the owner's reference design (claude.ai artifact `Km98amERdBbJ7DWN4fGVcp`): navy text, blue actions, yellow accents and Plus Jakarta Sans. The design gives only the looks; the Customer App's features come from the product documents (CUS-001 to CUS-003). The web portal and the Shop App must not change.

## 2. Behaviour

- `tokens.json` has a `themes.customerApp` entry with the colours, font and component changes listed in DESIGN_SYSTEM §2 (App themes).
- The generator resolves each theme and checks it against the contrast pairs and components. It also checks that the theme's font is declared in the Flutter pubspec. It writes `AppPalette` with one const palette per theme (`standard`, `customerApp`).
- `AppColors`, `AppComponentTokens` and `AppTypography.fontFamily` are getters on `AppPalette.current`. The Customer App picks `customerApp` in `main()`. The Shop App keeps `standard` without any change.
- The SevenPalette logo and wordmark use `AppPalette.standard` in every app.
- Status colours are the same in both themes.

## 3. Not included

- Card shadows like the reference design: today's tokens have no shadow, so Customer App cards keep a light border. To revisit with the first Customer App screens.
- Dark mode (question 58).
- New components such as the product card, shop card, quantity stepper and OTP field. Each is added with the feature that first uses it (CUS-001 to CUS-003), not ahead of time.

## 4. Verification (2026-11-20)

| Check | Result |
|---|---|
| `pnpm --filter design-tokens test` (36, including theme resolution and validation) | Passed |
| `pnpm tokens:check`, `pnpm ui:check`, `pnpm format:check` | Passed |
| `dart format --set-exit-if-changed`, `fvm flutter analyze` | Passed |
| `fvm flutter test`: flutter_shared (92: contrast for both palettes, palette switch, logo colours), shop_app (183), customer_app (1) | Passed |
| Web `tokens.css` | Only the order of the swatch variables changed (a duplicate `swatch` entry was removed from `tokens.json`) |
| Emulator | Not run (the Customer App has only its placeholder screen) |
