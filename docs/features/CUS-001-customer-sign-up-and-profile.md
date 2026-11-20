# Feature: Customer App sign-up, profile and tabs

- **Feature ID:** CUS-001
- **Status:** Complete (local; API e2e, Flutter tests, main path on a physical Android phone 2026-11-20)
- **Last updated:** 2026-11-20
- **Related modules:** Customer App (`apps/customer_app`), `packages/flutter_shared` (`AppChoiceCard`, `showAppBottomSheet`), API `GET/PUT /v1/me/customer-profile` (`apps/api/src/users`), migration `cus_001_customer_type`
- **Decisions:** D-021, D-022 (mobile OTP), D-036 (customer type), D-054 (shop records stay private), D-057 (Customer App look); owner 2026-11-20: profile asks only for the name and the type; tabs Home, Orders, My Shops, More, plus Sites for painters; no guest browsing (question 59)

## 1. Goal

Painters and normal customers can create an account in the Customer App with their mobile number, say who they are, and land in the app's tabs. Finding shops (CUS-002) and the storefront (CUS-003) build on this.

## 2. Behaviour

1. **Welcome** (signed out): the SevenPalette logo, the tagline and Get started. There is no guest browsing.
2. **Sign in or sign up:** mobile number (+91), then the 6-digit code. A new number gets an account when its code is verified (`shouldCreateUser: true`; the Shop App stays login-only). Errors: invalid number or code, wait before another code, too many attempts, SMS failed, service unavailable.
3. **Tell us about you** (until both are saved): Your name (1–100 characters, trimmed) and How will you use SevenPalette?, either **Painter/Contractor** or **Normal Customer**, as two choice cards. A note says the type can be changed at any time and that each shop confirms its painters itself before showing painter prices or offers (D-036). A name the person already has, for example as a shop owner, is filled in.
4. **Tabs:** Home, Orders, My Shops, More, plus **Sites** for painters. Home greets the person by first name. Home, Orders, My Shops and Sites show empty states until their features arrive.
5. **More:** name, mobile number, type badge, **Edit profile** (a bottom sheet with the same form; a toast after saving; the tabs follow the new type at once) and **Sign out**. "Powered by zero.byt" at the bottom.
6. Switching to Normal Customer while a link points at Sites shows "Sites are for painters" with a way back to Home.

## 3. Security and privacy

- `GET/PUT /v1/me/customer-profile` act only on the verified caller. The request has no user id, so nobody can read or change another person's profile.
- Saving needs a mobile number sign-in (`403 phone_verification_required` otherwise).
- Signing up never connects the records a shop made for that number (D-054). The shop's customer record stays private and unlinked; a test proves it.
- Each real change writes `user.customer_profile_updated` with the changed field names and the type. The name itself is never put in the audit trail.
- The session is kept in the Android Keystore / iOS Keychain (`SecureSessionStorage`), and Android backups are off. Debug builds allow plain http for the local stack only.

## 4. Data

- `users.customer_type` (`customer_type` enum `PAINTER` | `CUSTOMER`, nullable until chosen). The name stays in `users.display_name`.
- The profile is complete when both are set; the app asks for them until then.

## 5. Not included

- Addresses: a painter's site location comes with sites, and a normal customer's delivery location at checkout (D-049).
- Shop confirmation of painters, credit, bills, offers and every feature listed in question 59.
- A six-box OTP field and a resend countdown like the reference design: the code uses the standard text field.
- Push notifications.

## 6. Verification (2026-11-20)

| Check | Result |
|---|---|
| API e2e `customer-profile.e2e-spec.ts` (8): auth required, new account incomplete, save and trim, type change with audit only on real changes, field errors, phone required, own profile only, shop records not linked | Passed |
| Full API suite, lint, typecheck, format | See PROJECT_STATE |
| Flutter: customer_app (9: redirects, palette, sign-up to tabs, no Sites for customers, edit type, refused save, load retry, sign out), flutter_shared (92), shop_app (183) | Passed |
| Physical phone (Realme RMX2170, local stack through `adb reverse`) | Welcome, sign-up with `+91 99999 00003`, profile setup as Painter (Sites tab shown), Edit profile to Normal Customer (Sites tab gone, toast), saved type and audit rows checked in the database. The last two fixes (form top-aligned, sheet over the tabs) passed the tests, but the phone ran out of battery before a second look |
