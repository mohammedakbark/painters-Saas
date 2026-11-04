# shop_app — Flutter

One shared Shop App for shop owners and staff (Android and iOS). It is login-only (D-013): shops are registered on the web portal (D-024). See `docs/PRODUCT_OVERVIEW.md` §3.2.

**Current state (SHP-002, SHP-003):**
- Mobile OTP sign-in through Supabase Auth; the app never creates accounts.
- The list of the user's shops, and a home screen for each shop.
- A shop profile screen: photo, address, support mobile, the map (or coordinates without a Maps key) and "Use my current location" for the owner.
- Sign-out.
- The session is stored in the platform keystore (`flutter_secure_storage`).
- All shop data comes from the API, which checks membership.

Specs: `docs/features/SHP-002-shop-app-sign-in.md`, `docs/features/SHP-003-shop-profile-and-location.md`.

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
| `GOOGLE_MAPS_ENABLED` | `false` until a Maps key is set (then `true`) |

**Google Maps (optional):** put `GOOGLE_MAPS_API_KEY=...` in `android/local.properties` (gitignored; iOS: `ios/Flutter/MapsKey.xcconfig`) and set `GOOGLE_MAPS_ENABLED` to `true`. Steps and key restrictions: `docs/guides/GOOGLE_MAPS_SETUP.md`. Without a key the app shows the coordinates instead of a map.

**Images on the emulator:** shop photo URLs point at local Storage on the host (`127.0.0.1:54321`). Run `adb reverse tcp:54321 tcp:54321` once per emulator start.

**Location on the emulator:** `adb emu geo fix` may not reach newer emulator images. Use Android's test provider instead: `adb shell appops set com.android.shell android:mock_location allow`, `adb shell cmd location providers add-test-provider gps`, `adb shell cmd location providers set-test-provider-enabled gps true`, then `adb shell cmd location providers set-test-provider-location gps --location 9.9312,76.2673 --accuracy 8`.

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
