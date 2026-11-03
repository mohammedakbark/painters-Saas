# shop_app — Flutter

One shared Shop App for shop owners and staff (Android and iOS). It is login-only:
shop and staff accounts are created through web administration. See
`docs/PRODUCT_OVERVIEW.md` §3.2.

**Current state:** foundation shell only. It shows a placeholder screen using the shared
theme from `packages/flutter_shared`. No features are implemented.

## Run and check

```sh
fvm flutter pub get          # from the repo root (resolves the whole pub workspace)
cd apps/shop_app
fvm flutter run              # Android emulator/device; iOS requires macOS
fvm flutter test
```

Format and analyze from the repo root with `fvm dart format` and `fvm flutter analyze`.

The Android application ID (`com.example.shop_app`) and iOS bundle ID
(`com.example.shopApp`) are placeholders. They must be replaced before any store
upload (open decision).
