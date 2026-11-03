# shop_app — Flutter

One shared Shop App for shop owners and staff (Android and iOS). It is login-only (D-013): shops are registered on the web portal (D-024). See `docs/PRODUCT_OVERVIEW.md` §3.2.

**Current state (SHP-002):**
- Mobile OTP sign-in through Supabase Auth; the app never creates accounts.
- The list of the user's shops, and a home screen for each shop.
- Sign-out.
- The session is stored in the platform keystore (`flutter_secure_storage`).
- All shop data comes from the API, which checks membership.

Spec: `docs/features/SHP-002-shop-app-sign-in.md`.

## Configure

The app reads three **non-secret** values at build time:

```sh
cp config/local.example.json config/local.json   # gitignored
```

| Key | Local value |
|---|---|
| `SUPABASE_URL` | `http://10.0.2.2:54321` (Android emulator → host; iOS simulator: `http://127.0.0.1:54321`) |
| `SUPABASE_PUBLISHABLE_KEY` | The "Publishable" key from `pnpm supabase:status` |
| `API_BASE_URL` | `http://10.0.2.2:<API port>` |

Never put the Supabase secret key in the app.

Cleartext HTTP is allowed only in the Android **debug** manifest. iOS allows local networking only.

## Run and check

```sh
fvm flutter pub get                                         # from the repo root (whole pub workspace)
cd apps/shop_app
fvm flutter run --dart-define-from-file=config/local.json   # Android emulator/device; iOS requires macOS
fvm flutter test
```

Local test sign-in: numbers `99999 00001`–`00003`, code `123456`. The number must already have an account; register a shop on the web portal first.

Format and analyze from the repo root with `fvm dart format` and `fvm flutter analyze`. On Windows, after an Android build, run `fvm dart format` on `lib` and `test` only: the generated `build/` folder can contain paths too long for the formatter.

The Android application ID (`com.example.shop_app`) and iOS bundle ID (`com.example.shopApp`) are placeholders. They must be replaced before any store upload (open decision).
