# Feature: Shop App sign-in and shop picker (Flutter)

- **Feature ID:** SHP-002
- **Status:** Complete (local verification; see §13)
- **Last updated:** 2026-11-03
- **Related modules:** Shop App (`apps/shop_app`), `packages/flutter_shared`, API (`GET /v1/me`, `GET /v1/shops/{id}`; unchanged)
- **Decisions:** D-013 (Shop App is login-only), D-022 (mobile OTP for shop users), D-024 (registration on the web), D-026 (one person may own several shops), P-007 (Riverpod; adopted for the Shop App here)

## 1. Problem and goal

Shop owners and staff need the shared Shop App on their phones. This feature lets them sign in with their mobile number and a one-time code, see the shops they belong to, and open a shop's home. Later features (orders, products) build on this shell.

## 2. User roles and permissions

| Role | Can | Cannot |
|---|---|---|
| Shop master (and future staff) | Sign in with OTP, list their shops, open a shop they belong to, sign out | Create an account or register a shop in the app (web only) |
| A number without an account | Nothing; they are told to register on the web portal | Receive a code: no account is created |
| A signed-in user without shops | See an explanation and sign out | See any shop |

## 3. Preconditions

- The shop was registered on the web (SHP-001).
- The local Supabase Auth stack and the API are running.
- The app is built with `--dart-define-from-file=config/local.json`.

## 4. User flow

1. The app opens on **Sign in**, or directly on **Your shops** when a session is stored.
2. The user enters their mobile number, and a 6-digit code is sent. The app never creates an account (`shouldCreateUser: false`).
3. They enter the code and are signed in, and the session is stored in the platform keystore.
4. **Your shops** lists each shop with the role and status in words. Tapping one opens its home: name, role, status and an explanation.
5. **Sign out** (app bar) ends the session on this device and returns to Sign in.

Alternate and failure paths:
- **Invalid number:** "Enter a 10-digit Indian mobile number."
- **Unregistered number:** "This number isn't registered. Register your shop on the web portal first."
- **Rate limited:** "Wait a minute before requesting another code."
- **SMS failure:** "We couldn't send a code…"
- **Wrong or expired code:** "That code is incorrect or has expired." The number the code was sent to stays visible. **Resend code** and **Use a different number** are offered.
- **No shops:** "No shop is linked to this number", with the registration hint and **Sign out**.
- **API failure:** an error view with **Try again**.
- **Expired session (401):** "Your session has expired", with **Sign out**.
- **Shop not accessible (404):** "Shop not found", with **Go to your shops**.

## 5. Business rules

1. The Shop App is login-only (D-013). Registration happens on the web portal (D-024).
2. Shop access comes from the API (membership); the app never decides access itself.
3. Sessions are stored only in secure storage (Android Keystore / iOS Keychain), never in plain shared preferences.
4. The app contains only non-secret configuration: the Supabase URL, the **publishable** key and the API URL.
5. Failed requests are not retried automatically; the user retries.

## 6. UI requirements

- The sign-in screen is a single screen with two steps:
  - visible labels and helper text;
  - error text that wraps (never truncated);
  - pending states on buttons;
  - OTP autofill hints;
  - a 420 px maximum width.
- The shop list uses cards with a touch target of at least 48 px.
- Loading, empty, error, expired-session and not-found states use the shared `LoadingView`, `MessageView` and `ErrorView` from `flutter_shared`.
- Status is always shown as text (a chip with the "Draft" label).
- Only design tokens are used, through `AppTheme.light()`.

## 7. API contract

No API changes. The app uses:
- `GET /v1/me`: `shopMemberships`.
- `GET /v1/shops/{shopId}`: 404 `shop_not_found` for non-members.

Requests carry `Authorization: Bearer <access token>`, and problem `code`s are read from errors.

## 8. Data model and migrations

None.

## 9. Security and privacy

- **Secrets:** the debug APK was checked. It does not contain the Supabase secret key value; it contains the publishable key, by design. The `sb_secret_` text inside it is supabase-dart's key-prefix constant.
- **Session storage:** encrypted by `flutter_secure_storage`; no plaintext token appears in shared preferences (checked on the emulator).
- **Cleartext HTTP:** allowed only in the Android **debug** manifest, for the local stack at `10.0.2.2`. iOS allows only local networking (`NSAllowsLocalNetworking`).
- **Logging:** codes and tokens are never logged.

## 10. Acceptance criteria

- [x] Given a registered number, when the user requests a code and enters it, then they land on **Your shops** with their shops.
- [x] Given an unregistered number, when the user requests a code, then they see the registration hint and no account is created.
- [x] Given a wrong code, then the error appears and the number the code was sent to stays visible.
- [x] Given two owners, each sees only their own shop.
- [x] Given a stored session, when the app restarts, then it opens on **Your shops** without signing in again.
- [x] Sign out returns to Sign in.
- [x] A shop that is not accessible (404) shows "Shop not found"; API failures show **Try again**; 401 shows the expired-session view; no shops shows the registration hint.

## 11. Test plan

- **Widget tests (fakes):**
  - sign-in validation, the unregistered number, the wrong code then the right code, changing the number;
  - the no-shops state and sign-out;
  - API error with retry;
  - expired session;
  - opening a shop;
  - shop not found.
- **Unit tests:** auth redirect, config parsing, Supabase error mapping, `apiExceptionFrom`, `/v1/me` parsing.
- **`flutter_shared`:** the Indian mobile parser and the state views.
- **Manual on the Android emulator (Pixel, API 3x), against local Supabase and the API:** see §13.

## 12. Dependencies and open questions

- Staff accounts and roles (question 37): staff will use this same sign-in once staff management exists.
- Production SMS vendor + DLT (question 46).
- iOS build: not verified (requires macOS).

## 13. Implementation notes

**Packages:** supabase_flutter ^2.18.3, flutter_riverpod ^3.4.3, go_router ^18.1.2, dio ^5.11.1, flutter_secure_storage ^11.2.0.

**Structure** (`apps/shop_app/lib/src/`):
- `config/app_config.dart`: dart-define values, validated; an invalid build shows `ConfigErrorApp`.
- `auth/`: the `AuthRepository` port, `SupabaseAuthRepository` (OTP, error mapping by code) and `SecureSessionStorage` (Supabase `LocalStorage` on the keystore).
- `api/api_client.dart`: Dio with the bearer interceptor; `ApiException` with the problem `code`.
- `shops/`: models and `ShopAccessRepository` (`ShopNotFound` on 404).
- `providers.dart`: Riverpod providers; automatic retry is off.
- `routing/router.dart`: go_router with `authRedirect`, refreshed by the auth repository.
- `features/sign_in/`: `SignInController` (Notifier) and `SignInScreen`.
- `features/shops/`: picker, home and sign-out button.

**`flutter_shared`:** `IndianMobileNumber`, plus `LoadingView`, `MessageView` and `ErrorView`.

**Platform:**
- `INTERNET` permission in the main Android manifest; cleartext only in the debug manifest (both confirmed in the merged manifest).
- `android:allowBackup="false"`: keystore-encrypted session values cannot be restored on another device, so they are not backed up.
- App label "Shop App".
- iOS `NSAllowsLocalNetworking`.
- `config/local.example.json` (local `config/local.json` is gitignored).

**Verified locally (2026-11-03):**
- **Static and unit checks:** `flutter analyze` reports no issues; Dart format is clean; tests pass (shop_app 19, flutter_shared 38, customer_app 1).
- **Build:** `flutter build apk --debug --dart-define-from-file=config/local.json` succeeds.
- **Emulator walkthrough** (`emulator-5554`, against local Supabase OTP and the API through `10.0.2.2`):
  - sign-in screen;
  - code sent;
  - wrong code;
  - correct code shows owner A's list (only Lakshmi Paints);
  - shop home;
  - force-stop and relaunch stays signed in;
  - sign out;
  - unregistered number gives the wrapped hint, and no Auth user is created;
  - owner B sees only Shop B Colours.
- **UI fixes found on the device:** the error text was truncated, and the "sent to" number disappeared after an error. Both are fixed and re-verified.

**Not verified:** iOS build and run (requires macOS); an automated `integration_test` (the walkthrough was manual through adb).

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-03 | Specification written together with the implementation (the plan and decisions were agreed beforehand); implemented and verified locally |
