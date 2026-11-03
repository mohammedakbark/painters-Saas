# Feature: Shop owner registration and shop sign-in (web)

- **Feature ID:** SHP-001
- **Status:** Complete (local verification; see §13)
- **Last updated:** 2026-11-03
- **Related modules:** API (`shops`, `shop-access`, `users`), Admin Web (`/sign-in`, `/shops`), infra (local Supabase Auth)
- **Decisions:** D-022 (mobile OTP for shop users), D-024 (shops self-register on the web), D-025 (visible only after platform approval, reviewed after the onboarding checklist), D-026 (one person may be master of several shops), D-013 (Shop App stays login-only), D-014 (protected master account)

## 1. Problem and goal

Independent paint shops need to join the platform without waiting for the platform team. Anyone can register a shop on the web portal with their mobile number. The person who registers becomes the shop's protected **master account**.

A new shop starts as a **Draft**. It is never visible to customers or painters until a later feature lets the owner complete the onboarding checklist and submit it, and a platform admin approves it.

This feature also introduces **tenant-scoped access**: every shop route checks that the caller is a member of that shop.

## 2. User roles and permissions

| Role | Can | Cannot |
|---|---|---|
| Anyone with a mobile number | Sign in or sign up with an OTP on `/sign-in`; register a shop | Register a shop without a verified mobile number |
| Shop master (the registering person) | See their shops on `/shops`; open `/shops/{id}` for shops they belong to | Open any shop they are not a member of (the API answers 404) |
| Platform admin | Nothing new: platform permission never grants shop membership | Open `/v1/shops/{id}` for a shop they are not a member of |

## 3. Preconditions

- Local Supabase Auth running with phone sign-up enabled (`[auth] enable_signup = true`).
- Local test numbers `+91 99999 00001`–`00003`, code `123456`.

## 4. User flow

1. The owner opens `/` and chooses **Shop owners and staff**, which goes to `/sign-in`.
2. They enter a mobile number (India; `98765 43210`, `+91 98765 43210` and `098765 43210` are all accepted). Supabase sends an OTP; the account is created on first use.
3. They enter the 6-digit code and are signed in (session in HTTP-only cookies), then land on `/shops`.
4. `/shops` lists the shops they belong to (name, status, role) and offers **Register a shop**.
5. **Register a shop** (`/shops/new`) asks for the shop name and the owner's name.
   - On success the shop is created as a **Draft** with the owner as **Master**.
   - The owner lands on `/shops/{id}` with a success message.
6. `/shops/{id}` shows the shop console: the name, a *Draft* status, and a note that the shop is not visible to customers yet.

Alternate and failure paths:
- **Invalid number:** "Enter a 10-digit Indian mobile number."
- **A new code requested too soon (60 s cooldown) or too many requests:** "Wait a minute before requesting another code."
- **SMS could not be sent:** "We couldn't send a code to this number. Check it and try again."
- **Wrong or expired code:** "That code is incorrect or has expired." The owner can retry, request a new code, or change the number.
- **Signed-in account without a mobile number** (for example a platform admin's email account) tries to register: 403, "Sign in with your mobile number to register a shop."
- **A shop the user is not a member of, or a non-existent or malformed id:** "Shop not found" page (the API answers 404 for all of these, so it never reveals whether a shop exists).
- **Expired session:** redirected to `/sign-in`.

## 5. Business rules

1. Shop registration is self-service on the web portal (D-024). The Shop App stays login-only (D-013).
2. Registration requires an account with a verified mobile number. Email-only accounts cannot register shops.
3. A new shop's status is `DRAFT`. Only later features move it forward (submit for review, platform approval), and only an approved shop with a complete checklist is visible to customers and painters (D-012, D-025).
4. The registering user becomes the shop's `MASTER`. The database allows exactly one master per shop (D-014). No API in this feature changes or removes memberships.
5. One person may be the master of several shops (D-026). Each request works on one shop.
6. Registration also sets the registering user's display name (it is their own profile).
7. Shop access is decided by the API from the caller's membership, never from a client-supplied value. Non-members get 404.
8. Registration writes the audit events `shop.registered` and `shop_membership.master_assigned` (actor: the user) in the same transaction.
9. Shop names are not unique: different shops may share a name.

## 6. UI requirements

- `/` gets a second entry, **Shop owners and staff** (mobile number).
- `/sign-in` is a two-step form on one page:
  1. The mobile number with an Indian `+91` prefix shown.
  2. The 6-digit code, which states which number the code was sent to and offers **Resend code** and **Use a different number**.
  - Pending states, field errors and a form-level alert.
- `/shops`:
  - A list of shops as cards (name, status label as text, role).
  - An empty state ("You haven't registered a shop yet" plus **Register a shop**).
  - Loading and error states.
- `/shops/new`: shop name and "Your name" fields with inline errors, a pending submit and cancel back to `/shops`.
- `/shops/{id}`: the app shell (shop name as the area label, navigation: Overview), a success alert after registration, the Draft status explained in text, and sign-out.
- **Not found:** a "Shop not found" message with a link back to `/shops`.
- All components come from the design system (`components/ui`); layouts must work from 320 px wide.

## 7. API contract

All errors are RFC 9457 problem details (ADR 0006).

- **`POST /v1/shops`** (authenticated; the caller must have a verified mobile number)
  - Request: `{ "shopName": "Lakshmi Paints", "ownerName": "Anil Kumar" }`.
    - `shopName`: trimmed, 2–120 characters.
    - `ownerName`: trimmed, 1–100 characters.
    - Unknown fields are ignored.
  - `201`: `{ "id": "uuid", "name": "Lakshmi Paints", "status": "DRAFT", "myRole": "MASTER", "createdAt": "…" }`
  - `400 validation_failed`: field errors at `shopName` and `ownerName`. Malformed JSON gets `400` with no code.
  - `401`: no or invalid token.
  - `403 phone_verification_required`: the account has no verified mobile number.
- **`GET /v1/shops/{shopId}`** (authenticated; members only)
  - `200`: `{ "id", "name", "status", "myRole", "createdAt" }`
  - `404 shop_not_found`: non-member, unknown id or malformed id.
- **`GET /v1/me`** adds `shopMemberships: [{ "shopId", "shopName", "shopStatus", "role" }]`, ordered by most recent membership first.

## 8. Data model and migrations

Migration `shp_001_shops`:
- **`shops`:**
  - Columns: `id` uuid v7, `name` text (CHECK: trimmed length 2–120), `status` enum `shop_status { DRAFT }`, `created_at`, `updated_at`.
  - Further statuses are added by the review and approval feature.
- **`shop_memberships`:**
  - Columns: `id` uuid v7, `shop_id` FK → `shops` (RESTRICT), `user_id` FK → `users` (RESTRICT), `role` enum `shop_role { MASTER }`, `created_at`.
  - Constraints and indexes: UNIQUE (`shop_id`, `user_id`); a **partial UNIQUE index** for one `MASTER` per shop; an index on `user_id`.
- **`audit_events.shop_id`** gets a foreign key to `shops` (RESTRICT).
- RLS is enabled on the new tables.

Tenant ownership: `shops` is the tenant. `shop_memberships` is the authorization source: `ShopAccessGuard` loads `(shopId, currentUser.id)` and attaches `ShopContext { shopId, role }`, and services query by `ShopContext.shopId` only.

## 9. Security and privacy

- **Sign-up:** phone sign-up is enabled in Supabase Auth. Supabase has one global sign-up switch, so public **email** sign-up is technically possible too. Such accounts get no access: no platform role, and they cannot register shops without a mobile number. Hosted hardening (email confirmations, CAPTCHA or a before-user-created hook) is open question 51.
- **Operator script hardening:** because sign-up is now open, `platform-admin:create` no longer grants admin to an *existing* account. Anyone could have created an account with that email first. The script refuses and asks for the account to be removed or a different email to be used.
- **Tenant isolation:** every `/v1/shops/{shopId}` route uses `ShopAccessGuard`. Platform admins are not implicitly members.
- **Abuse:** OTP sends and verifications are rate-limited by Supabase Auth (30 SMS per hour, a 60 s cooldown per number, 30 verifications per 5 minutes per IP locally). There is no per-user limit on registrations (open question 49); unapproved shops are never visible to customers.
- **Data handling:** OTP codes and tokens are never logged. The audit metadata contains no phone numbers.

## 10. Acceptance criteria

- [x] Given a new mobile number, when the owner requests a code and enters it, then they are signed in and land on `/shops` with the empty state.
- [x] Given a signed-in owner, when they register "Lakshmi Paints", then the shop exists as DRAFT, they are its MASTER, two audit events are written, and they land on the shop console with a success message.
- [x] Given an owner of two shops, when they open `/shops`, then both are listed, and each console shows only that shop.
- [x] Given the master of shop A, when they request shop B (by API or URL), then the answer is 404 / "Shop not found".
- [x] Given a platform admin who is not a member, when they request `GET /v1/shops/{id}`, then the answer is 404.
- [x] Given an account without a mobile number, when it calls `POST /v1/shops`, then the answer is 403 `phone_verification_required`.
- [x] Given invalid input (shop name of 1 character, missing owner name, malformed JSON), then the answer is 400 problem+json with field errors where applicable, and the web form shows them inline.
- [x] A second MASTER membership for the same shop is rejected by the database.
- [x] A wrong OTP shows "That code is incorrect or has expired." and a new code requested within 60 s shows the wait message.
- [x] Signed-out visitors to `/shops/**` are redirected to `/sign-in`.
- [x] `platform-admin:create` refuses an email that already belongs to a non-admin account.

## 11. Test plan

- **API e2e (real Postgres):**
  - registration success with audit events;
  - registering without a phone;
  - validation errors and malformed JSON;
  - multi-shop owners and `/v1/me` memberships;
  - member access;
  - cross-tenant 404 (two shops, two masters);
  - platform admin 404;
  - malformed id 404;
  - unauthenticated 401;
  - DB one-master constraint.
- **API unit:** `ShopAccessGuard` (member, non-member, malformed id).
- **Web unit:** Indian mobile parser, OTP error mapping, two-step sign-in form, registration form errors, shop status labels.
- **Manual (local stack):**
  - OTP sign-in with a test number, then register;
  - a second shop and the list;
  - the cross-tenant URL;
  - a wrong code;
  - the resend cooldown;
  - sign-out.

## 12. Dependencies and open questions

- Onboarding checklist (profile, photo, 10 products), submit for review and platform approval: later features (D-012, D-025).
- Production SMS vendor + DLT (question 46).
- Question 49: should the number of shops one person can register (or have pending) be limited?
- Assumption: Indian mobile numbers only (+91) for the initial Kerala market (D-020).

## 13. Implementation notes

**Migration:** `apps/api/prisma/migrations/*_shp_001_shops`. It creates `shops` and `shop_memberships` and adds:
- a CHECK that shop names are trimmed and 2–120 characters;
- the partial unique index `shop_memberships_one_master_per_shop`;
- an `audit_events.shop_id` foreign key;
- RLS on both tables.

**API:**
- `src/shop-access/`:
  - `ShopAccessGuard` / `@ShopScoped()` / `@CurrentShop()`, where non-members, unknown ids and malformed ids all get 404 `shop_not_found`;
  - `ShopMembershipsService`.
- `src/shops/`:
  - `POST /v1/shops` and `GET /v1/shops/:shopId`;
  - `ShopsService.register` (one transaction: shop, master membership, display name, two audit events).
- `GET /v1/me` now returns `shopMemberships`.
- Framework 400s (malformed JSON, bad path encoding) now carry the generic detail "The request is malformed." Nest's parser message can echo the input.
- `platform-admin:create` no longer promotes existing accounts (AUTH-001 hardening, because sign-up is now open).

**Web:**
- `/sign-in` (two-step OTP Server Action: `request`, `verify`, `resend` and `change` intents).
- `/shops` (list and empty state).
- `/shops/new` (registration form).
- `/shops/[shopId]`: console layout and overview, with `requireShopAccess()` in both the layout and the page.
- `app/shops/not-found.tsx` and `error.tsx`.
- Helpers: `lib/phone.ts` (Indian mobile parser), `lib/auth/otp.ts`, `lib/auth/shop-access.ts`, `lib/shops/`.
- Components: `Badge`, `ButtonLink`, `RouteError`.
- The proxy also redirects signed-out `/shops/**` visitors to `/sign-in`.

**Supabase (local):** `[auth] enable_signup = true`.

**Verified locally (2026-11-03):**
- **Unit tests:** API 60 and web 67.
- **API e2e:** 48 tests, including 14 new SHP-001 cases:
  - registration and its audit events;
  - multi-shop owners;
  - 403 without a phone;
  - validation and malformed JSON;
  - member access;
  - cross-tenant 404 in both directions;
  - platform admin 404;
  - unknown and malformed ids;
  - 401;
  - the one-master and name constraints.
- **Checks:** lint, typecheck, Prettier, builds, migration drift; OpenAPI export includes `/v1/shops` and `/v1/shops/{shopId}`.
- **Scripted HTTP walkthrough without JavaScript, against local Supabase and the API:**
  - OTP sign-up, then a wrong code, then the resend cooldown, then the correct code (303 to `/shops`);
  - the empty state, a validation error, then registration (303 to the console with the success message and Draft);
  - a second owner gets the not-found view for the first owner's shop and for a malformed id, and the first shop's name appears nowhere in the response (including the RSC payload);
  - the platform admin's email account is refused registration and gets the not-found view for a shop it doesn't belong to;
  - sign-out (303 to `/sign-in`), after which `/shops` gives a 307 to sign-in.
- **Database rows:** two Draft shops, each with its own MASTER and owner name; audit events with the user as actor.
- **Logs:** no OTP codes, tokens or secrets in the API or web logs.

**Not verified:**
- An interactive browser walkthrough (skipped at the product owner's request).
- The not-found and error views render in the browser after streaming. The server sends the not-found boundary (`NEXT_HTTP_ERROR_FALLBACK;404`) inside the streamed payload with HTTP 200, as Next.js does for errors raised inside Suspense.

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-03 | Initial feature specification (replaces the planned "platform admin creates shops" flow after the product owner's decision D-024) |
| 2026-11-03 | Implemented and verified locally; implementation notes added |
