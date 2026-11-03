# ADR 0005: Authentication and Identity

- **Status:** Accepted (implemented in AUTH-001)
- **Date:** 2026-11-03
- **Decision owners:** Product owner (provider, sign-in methods) / Engineering (implementation)

## Context

Every feature after the foundation needs a verified identity. Platform admins need to sign in first, to create shops (PLT-001), and shop users after that (SHP-001). `DATA_AND_SECURITY.md` §4 prefers a managed identity provider over custom password, token or OTP cryptography. ADR 0003 proposed Supabase Auth. The product owner chose the provider and the sign-in methods on 2026-11-03 (D-021, D-022).

## Decision

### Provider and sign-in methods

- **Supabase Auth** is the identity provider.
- **Customers and shop users** (master and staff) sign in with **mobile OTP**.
- **Platform Super Admins** sign in with **email + password**. MFA for platform admins is required before production; it is not built yet.
- Public sign-up is **disabled** for now:
  - Platform admins are created by an operator script (`pnpm --filter api platform-admin:create`).
  - Shop master accounts are created by the platform API (PLT-001).
  - Customer phone sign-up is enabled with the customer registration feature (Phase 2).

### Token verification in the API

- Clients send the Supabase access token as `Authorization: Bearer <token>`.
- The NestJS API verifies every token itself with `jose`, against the provider's **JWKS endpoint**:
  - It accepts **asymmetric keys only** (ES256/RS256) and rejects HS256 and `none`.
  - It checks issuer, audience (`authenticated`), expiry and the presence of `sub`/`iat`.
  - It rejects anonymous sessions.
- No shared JWT secret exists on the API. The legacy Supabase anon/service-role JWT keys are HS256 and are therefore rejected as access tokens.
- If the signing keys can't be fetched (network failure, timeout, non-200 or malformed JWKS), the API answers **503 `auth_unavailable`**, not 401, so a provider outage doesn't look like a sign-out.

### Local identity

- A global `User` row is linked to the provider account by `authSubject` (the token's `sub`). It is created **just in time** on the first authenticated request.
- Concurrent first requests are safe: the losing insert re-reads the winner's row.
- If the email or phone already belongs to a different local user, the API answers **409 `identity_conflict`** and never links automatically.
- **Platform permission** lives in a separate `PlatformAdmin` table, never in shop membership and never in token claims.

### Provider administration

- Server-side account management (creating users, rolling back a failed creation) goes through the `IdentityAdmin` port, implemented by `SupabaseIdentityAdmin`.
- Only the API holds the **Supabase secret key** (`SUPABASE_SECRET_KEY`).
- Web and mobile clients get only the publishable key, and use Supabase only to sign in and out.
- Clients never read data from Supabase directly; all data goes through the API.

### Web sessions

- The Next.js portal signs in through **Server Actions** with `@supabase/ssr`.
- The session lives in **HTTP-only cookies** (`Secure` in production, `SameSite=Lax`).
- `src/proxy.ts` refreshes the session.
- The browser never gets a Supabase client, and no auth configuration is a `NEXT_PUBLIC_*` variable.
- Pages call the API from the server with the user's access token.
- Every page checks access itself (`requirePlatformAdmin()`), because Next.js renders pages in parallel with their layouts.

### Supabase hardening (applies to the hosted project once it exists)

- Disable the Supabase Data API (PostgREST). The app database is accessed only by the API.
- Every migration enables **Row Level Security** on new tables with no policies. The API connects as the table owner and bypasses RLS; any Data API role would see nothing.
- Never push the local `config.toml` to a hosted project: it contains fixed test OTPs.

### Local development

- The Supabase CLI (pinned devDependency, `supabase@2.122.0`) runs **Auth only** from `infra/supabase/config.toml`: GoTrue, the API gateway and Supabase's own Postgres for the `auth` schema. Studio, PostgREST, Realtime, Storage, Edge Runtime, Analytics and the mail catcher are disabled.
- Application data stays in the Docker Compose Postgres from `infra/local`, so T-007 is still accurate for app data.
- Local tokens are signed with a locally generated ES256 key (`pnpm supabase:keys`, gitignored), so local verification works exactly like production.
- Fixed test OTPs exist for three fake numbers. A placeholder Twilio block satisfies the phone-provider requirement; nothing is ever sent.
- API e2e tests and CI do not need Supabase: they inject a test ES256 key set and an in-memory `IdentityAdmin`.

## Alternatives considered

- **Firebase Authentication:** Google delivers the OTP SMS itself (no DLT paperwork), but it costs more per SMS in India and adds a second vendor. The product owner declined it.
- **Custom auth in the API:** rejected by `DATA_AND_SECURITY.md` §4.
- **Verifying tokens with the shared JWT secret (HS256):** rejected. It would put a signing secret on the API, and Supabase recommends asymmetric signing keys.
- **Using Supabase's local Postgres for app data:** deferred. It would replace the working compose database and test setup for no current benefit.

## Consequences

- The API is provider-agnostic apart from `SupabaseIdentityAdmin` and the env values.
- **Access tokens stay valid until they expire** (`jwt_expiry`, 1 hour locally) even after sign-out, because verification is stateless.
  - Sign-out clears the cookie and revokes the refresh token.
  - Before production, shorten the token lifetime or add a session check for platform routes.
- Production phone OTP needs an SMS vendor and **DLT registration** of the sender and template (open question 46). Supabase supports Twilio, MessageBird, Textlocal and Vonage, plus a Send SMS Hook for vendors such as MSG91.
- Platform admin **MFA and password reset** are required before production (open item).
- The local Supabase containers publish their ports on all interfaces (CLI behaviour), including Supabase's local Postgres with its default credentials. It holds local test accounts only; keep the machine's firewall on for untrusted networks.
