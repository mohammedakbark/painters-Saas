# customer_app — Flutter

One shared Customer App for painters/contractors and normal customers (Android and
iOS). See `docs/PRODUCT_OVERVIEW.md` §3.1.

**Current state:** foundation shell only. It shows a placeholder screen using the shared
theme from `packages/flutter_shared`. No features are implemented.

## Run and check

```sh
fvm flutter pub get          # from the repo root (resolves the whole pub workspace)
cd apps/customer_app
fvm flutter run              # Android emulator/device; iOS requires macOS
fvm flutter test
```

Format and analyze from the repo root with `fvm dart format` and `fvm flutter analyze`.

The Android application ID (`com.example.customer_app`) and iOS bundle ID
(`com.example.customerApp`) are placeholders. They must be replaced before any store
upload (open decision).
