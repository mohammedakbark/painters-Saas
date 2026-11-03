# Feature: Platform admin sign-in and authentication foundation

- **Feature ID:** AUTH-001
- **Status:** Complete (local verification; see §13 for what was not verified)
- **Last updated:** 2026-11-03
- **Related modules:** API (`auth`, `users`, `platform-admin`, `audit`, `identity`), Admin Web (`/platform`), infra (local Supabase Auth)
- **Decisions:** D-021 (Supabase Auth), D-022 (sign-in methods), ADR 0005 (authentication and identity), ADR 0006 (API conventions)

## 1. Problem and goal

Every later feature needs a verified identity. Platform Super Admins need to create and manage shops (PLT-001), so they must sign in to the web portal first. The API must verify every request server-side and never trust client-supplied identity.

This feature delivers:
- Platform admin sign-in on the web portal with email + password.
- Token verification and a local user record in the API.
- A separate platform-admin permission.
- An audited way to create the first platform admin.
- The shared API conventions: `/v1`, deny-by-default authentication, validation and the error format.

## 2. User roles and permissions

| Role | Can | Cannot |
|---|---|---|
| Platform Super Admin | Sign in at `/platform/sign-in`, see the platform console, sign out | Be created through any public sign-up |
| Any other authenticated user (e.g. a future shop user) | Call `GET /v1/me` | Open the platform console. The API returns 403 on platform-only routes. |
| Anonymous | Call `/health`, `/health/ready` | Call any `/v1` route (401) |

Platform permission is stored separately from shop membership (`PlatformAdmin` table) and is never inferred from it.

## 3. Preconditions

- Local Supabase Auth stack running (`pnpm supabase:keys && pnpm supabase:start`), app database running (`pnpm db:up`), migrations applied.
- A platform admin created with `pnpm --filter api platform-admin:create --email <email>`.

## 4. User flow

1. The operator runs `platform-admin:create --email admin@example.com` and enters a password at the hidden prompt.
2. The script creates a confirmed email user in Supabase Auth. In one database transaction it then writes:
   - the local `User`,
   - the `PlatformAdmin` row,
   - the audit event `platform_admin.granted` (actor `SYSTEM`).
3. The admin opens `/platform` and is redirected to `/platform/sign-in`.
4. They enter email + password.
   - The web server action signs in with Supabase and stores the session in HTTP-only cookies.
   - It then calls `GET /v1/me` on the API with the access token.
5. If `platformRole` is `SUPER_ADMIN`, they land on `/platform` and see their email and the console navigation.
6. Sign out clears the session and returns them to the sign-in page.

Alternate and failure paths:
- **Wrong email or password:** "Email or password is incorrect." The message doesn't say which field was wrong; the email stays filled in.
- **Valid account without platform access at sign-in:** signed out immediately, shown "This account doesn't have platform access."
- **Existing non-admin session opening any console page:** redirected to `/platform/no-access`, which names the account and offers sign-out.
- **Too many attempts** (Supabase rate limit): "Too many sign-in attempts. Wait a few minutes and try again."
- **API or Auth unreachable:** "We couldn't sign you in right now. Try again in a moment."
- **Expired session while browsing `/platform`:** redirected to sign-in.
- **Script re-run for an existing admin:** no change; prints "already a platform admin".
- **Script with an email that already exists in Auth but has no local admin row:** stops with a message (no silent linking).

## 5. Business rules

1. No public sign-up. Auth sign-up is disabled; platform admins are created only by the operator script.
2. Platform admin passwords: at least 12 characters, with lower case, upper case and digits (enforced by the script and by Supabase Auth).
3. The API accepts only asymmetric (ES256/RS256) access tokens verified against the JWKS. It checks issuer, audience `authenticated` and expiry. HS256 or unsigned tokens are rejected.
4. A local `User` is created just in time on the first authenticated request, keyed by the token subject. Concurrent first requests create exactly one row.
5. Every route except `/health` and `/health/ready` requires authentication (deny by default).
6. Granting platform admin is audited (`platform_admin.granted`).
7. Tokens, passwords and secret keys are never logged or echoed in errors.

## 6. UI requirements

- `/platform/sign-in`:
  - Page title, then email and password fields with visible labels and a primary "Sign in" button that shows a pending state.
  - Field errors are linked with `aria-describedby`; the form-level error uses `role="alert"`.
  - Centred card no wider than 28 rem, usable from 320 px.
- `/platform` (console):
  - App shell: a persistent sidebar on desktop (≥ 900 px) and a compact top bar on smaller screens.
  - The overview shows the signed-in admin's email, plus a sign-out button.
- States:
  - Loading: a streaming fallback while the console checks the session.
  - Error: an API failure view with a retry link.
  - 403: a "No platform access" view with a sign-out button.
- Only design-system tokens (Tailwind theme) are used.

## 7. API contract

All errors use `application/problem+json` (RFC 9457) with `type`, `title`, `status`, `detail` and an optional `errors[{ path, message }]`.

`GET /v1/me` (authenticated):

```json
200 { "id": "uuid", "email": "admin@example.com" | null, "phone": "+919999900001" | null,
      "displayName": "string" | null, "platformRole": "SUPER_ADMIN" | null }
401 problem (missing, malformed, expired, wrongly signed, wrong issuer/audience token)
```

## 8. Data model and migrations

Migration `auth_001_identity`:
- **`User`:**
  - Columns: `id` uuid v7 PK; `authSubject` uuid UNIQUE (Supabase user id); `phone` text UNIQUE NULL (E.164); `email` text UNIQUE NULL (lower case); `displayName` text NULL; `createdAt` and `updatedAt` timestamptz.
  - Global identity; not tenant-owned.
- **`PlatformAdmin`:** `userId` PK and FK → `User` (RESTRICT); `role` enum `PlatformRole { SUPER_ADMIN }`; `createdAt`.
- **`AuditEvent`** (append-only):
  - Columns: `id` uuid v7; `occurredAt`; `actorType` enum `{ USER, SYSTEM }`; `actorUserId` NULL FK → `User`; `action`; `entityType`; `entityId`; `shopId` uuid NULL (no FK yet, the shop table arrives in PLT-001); `metadata` jsonb NULL.
  - Indexes on `(shopId, occurredAt)` and `(entityType, entityId)`.
  - No update/delete code paths exist.
- Row Level Security is enabled on every table. The API connects as the table owner; this blocks the Supabase Data API roles if that API is ever enabled by mistake.

## 9. Security and privacy

- Supabase secret key: API server only (`SUPABASE_SECRET_KEY`).
- The web portal and mobile apps receive only the publishable key and use Supabase only to sign in.
- The web portal calls the API from the server only and keeps the session in HTTP-only cookies refreshed by `proxy.ts`.
- Token verification uses JWKS (no shared secret on the API).
- The password is read through a hidden prompt, never from argv, and never logged.
- Audit metadata never contains passwords, tokens or phone numbers.
- Rate limits: Supabase Auth limits sign-in attempts (30 per 5 minutes per IP locally). An API-level rate limiter is a later hardening item.
- Platform admin MFA and password reset are required before production; they are not in this feature (see `DECISIONS_AND_OPEN_QUESTIONS.md`).

## 10. Acceptance criteria

- [x] Given a platform admin created by the script, when they sign in with the correct email and password, then they land on `/platform` and see their email.
- [x] Given wrong credentials, when they sign in, then they see "Email or password is incorrect." and stay on the sign-in page.
- [x] Given a valid Auth user without a `PlatformAdmin` row, when they sign in, then they are signed out and see "This account doesn't have platform access."
- [x] Given no session, when they open any `/platform` page, then they are redirected to `/platform/sign-in`.
- [x] Given a signed-in admin, when they sign out, then the session cookies are cleared and `/platform` redirects to sign-in.
- [x] `GET /v1/me` returns 401 problem+json for missing, malformed, expired, wrong-issuer, wrong-audience and HS256-signed tokens.
- [x] `GET /v1/me` with a valid token returns 200 and creates exactly one `User` even for concurrent first requests.
- [x] `/health` and `/health/ready` work without a token; every other route requires one.
- [x] Unknown routes and validation failures return problem+json without stack traces.
- [x] The script grants platform admin in one transaction with an audit event, and re-running it changes nothing.
- [x] The Supabase secret key does not appear in the web build output or client code.

## 11. Test plan

- **API unit:**
  - env validation;
  - token verifier (valid; expired; wrong issuer; wrong audience; HS256; `none`; unknown key);
  - problem-details filter;
  - validation-issue mapping;
  - auth guard (`@Public`, missing header, bad scheme);
  - platform-admin guard;
  - user resolution race handling.
- **API e2e (real Postgres, test ES256 key and local JWKS):**
  - `/v1/me` 401 cases and the 200 + just-in-time creation;
  - concurrent first calls;
  - health public;
  - unknown route problem shape;
  - the platform admin flag reflected in `/v1/me`.
- **Script:** grant logic is tested through its service with a fake identity provider.
- **Web components:** `Field` (label/description/error wiring), `Button` (pending), `Alert`, the sign-in form error rendering, the problem-details parser, the sign-in input schema.
- **Manual (local stack):** create an admin; sign in; wrong password; a non-admin user; sign out; redirect when signed out.

## 12. Dependencies and open questions

- Production SMS vendor and DLT registration: not needed for this feature (open question 46).
- Platform admin MFA and password reset: before production (open item).
- Assumption: one global platform role (`SUPER_ADMIN`). Narrower platform roles are added if the product needs them.

## 13. Implementation notes

**Migration:** `apps/api/prisma/migrations/20261103105452_auth_001_identity`. Besides the tables it adds:
- CHECK constraints: phone is E.164, email is lower case;
- an append-only trigger on `audit_events` that blocks UPDATE/DELETE for every role;
- RLS enabled on all three tables.

**API (`apps/api/src`):**
- `app.setup.ts`: `configureApp` (`/v1` prefix, validation pipe, problem filter, `x-powered-by` off).
- `auth/`: `AccessTokenVerifier` (jose JWKS), global `AuthGuard`, `@Public()`, `@CurrentUser()`.
- `users/`: `UsersService.resolve` (just-in-time user), `GET /v1/me`.
- `platform-admin/`: `PlatformAdminGuard` / `@PlatformAdminOnly()`, `PlatformAdminProvisioning`.
- `identity/`: `IdentityAdmin` port and `SupabaseIdentityAdmin`.
- `audit/audit.ts`: `recordAuditEvent(tx, …)`.
- `common/http`: problem details.
- `common/validation`: Standard Schema pipe.
- `scripts/create-platform-admin.ts`: the operator command, with a hidden password prompt.

**Readiness:** `/health/ready` now sets 503 itself, instead of throwing, so its body stays outside the problem format. The response contract is unchanged.

**Web (`apps/admin_web/src`):**
- `proxy.ts`: session refresh, plus an optimistic redirect for signed-out visitors.
- `lib/supabase/`: server client and HTTP-only cookie options.
- `lib/api/`: server-only client, problem parsing, `getMe`.
- `lib/auth/`:
  - `getAccessToken`, which calls `connection()` first so the session read is request-time;
  - `getPlatformAccess` / `requirePlatformAdmin`;
  - sign-in schema and messages.
- `app/platform/sign-in`, `app/platform/(console)` (layout + overview), `app/platform/no-access`, `app/platform/error.tsx`.
- Components: `components/ui` (Button, SubmitButton, Field, Alert, PageHeader, Spinner, StateMessage) and `components/layout` (AppShell, NavLinks).

**Local stack:**
- `infra/supabase/config.toml` (auth only) and the `pnpm supabase:keys|start|stop|status` scripts.
- An admin is created with `pnpm --filter api platform-admin:create --email <email>`.

**Lessons recorded during implementation:**
- In Supabase CLI config, `[auth.email] enable_signup` and `[auth.sms] enable_signup` turn the email and phone *providers* on. Sign-up itself is blocked by `[auth] enable_signup = false`.
- Next.js renders a page in parallel with its layout and sends the page's RSC output even when the layout shows something else. A layout check is not an authorization boundary, so each page calls `requirePlatformAdmin()`.
- With Partial Prefetching, Supabase's clock-based expiry check counts as non-deterministic during runtime prerendering. `await connection()` before the session read fixes it.

**Verified locally (2026-11-03):**
- **Unit tests:** API 55 and web 25.
- **API e2e:** 34 tests on Postgres 17.
- **Checks:** lint, typecheck, Prettier, both builds, migration drift and actionlint.
- **Live API run with real Supabase tokens (ES256):**
  - admin `/v1/me` returns `SUPER_ADMIN`;
  - a phone user is created just in time with no platform role;
  - 401 problem with `WWW-Authenticate` when the token is missing.
- **Operator script:** created, then re-ran (no change), then rejected a weak password.
- **Web, over HTTP without JavaScript (progressive enhancement):**
  - wrong password shows the incorrect-credentials message;
  - correct sign-in redirects with a 303 and sets `HttpOnly; Secure; SameSite=Lax` cookies;
  - the console renders for the admin;
  - a non-admin is rejected at sign-in, and an existing non-admin session is sent to `/platform/no-access` with no console content in the payload;
  - sign-out clears the cookie;
  - a signed-out visitor to `/platform` gets a 307 to sign-in.
- **Secret scans:** no secret or publishable key in `.next/static`; no tokens or passwords in the API or web logs.

**Not verified:**
- An interactive browser walkthrough was skipped at the product owner's request.
- The client-side rendering of `error.tsx`: the server streams the error digest and logs `ApiUnavailableError`, but the error view itself renders in the browser.
- The validation-failure problem shape is covered by unit tests only, because AUTH-001 has no request body. PLT-001 adds e2e coverage.

**Known limitations:** see ADR 0005 *Consequences*:
- access-token lifetime after sign-out;
- no admin MFA or password reset yet;
- local Supabase ports on all interfaces.

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-03 | Initial feature specification |
| 2026-11-03 | Implemented and verified locally; implementation notes added |
| 2026-11-03 | SHP-001 enabled public sign-up (shops self-register), so `platform-admin:create` no longer promotes an existing account; it refuses and asks for a different email or for the account to be removed. The "grant existing user" outcome was removed. |
