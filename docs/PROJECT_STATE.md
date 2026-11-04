# Project State — Living Document

**Last updated:** 2026-11-04  
**Current stage:** Phase 1: shop onboarding. Identity and shop accounts done (AUTH-001, SHP-001, PLT-001, SHP-002). The product owner answered the onboarding and catalogue questions on 2026-11-04 (D-027 to D-034). DS-001 (single-source theme) done; SHP-003 (shop profile and map location) next.  
**Overall status:** Foundation complete with CI green on GitHub. Implemented and verified locally: platform admin sign-in, shop self-registration with tenant-scoped access, the platform shop registry, and Shop App sign-in (Android emulator).  
**Product name:** Not decided

> Claude Code must read this file before every task and update it after every completed task or meaningful project change.

## 1. Current milestone

**M1: Identity and shop accounts.** Built and verified one feature at a time. On 2026-11-03 the product owner changed the shop model (D-024 to D-026): shops **self-register**, and a platform admin approves them after the onboarding checklist.

| Feature | Status | Spec |
|---|---|---|
| AUTH-001: Platform admin sign-in, plus auth and API conventions | **Complete (local)**; commit `3697e4f` on `feat/auth-001-platform-admin-sign-in` | `docs/features/AUTH-001-platform-admin-sign-in.md` |
| SHP-001: Shop owner registration and sign-in (web), tenant-scoped access | **Complete (local)**; branch `feat/shp-001-shop-registration` (stacked on AUTH-001) | `docs/features/SHP-001-shop-registration-and-sign-in.md` |
| PLT-001: Platform shop registry (read-only list and detail of registered shops) | **Complete (local)**; branch `feat/plt-001-shop-registry` (stacked on SHP-001) | `docs/features/PLT-001-platform-shop-registry.md` |
| SHP-002: Shop App sign-in (Flutter, login-only) | **Complete (local, Android emulator)**; branch `feat/shp-002-shop-app-sign-in` (stacked on PLT-001) | `docs/features/SHP-002-shop-app-sign-in.md` |
| DS-001: Single-source design tokens and brand names (D-034) | **Complete (local)**; branch `feat/ds-001-design-tokens` (stacked on SHP-002) | `docs/features/DS-001-design-tokens.md` |
| SHP-003: Shop profile, address and map location (D-027) | Next | to be written |
| SHP-004: Shop photo and portable media storage (D-028) | Planned | to be written |
| CAT-001: Platform brand catalogue (D-030) | Planned | to be written |
| CAT-002: Shop catalogue (D-029, D-030) | Planned | to be written |
| PLT-002: Review workflow: submit, approve or request changes, resubmit (D-032, D-033) | Planned | to be written |

**M0: Project foundation** is `DONE`. The first commit (`c56f614`, pushed by the product owner) ran the `CI` workflow on GitHub with all three jobs green under Node 24.

## 2. Actual repository structure

```text
.github/workflows/ci.yml          CI (typescript, flutter, repository jobs)
apps/admin_web/                   Next.js 16 portal: platform sign-in + console shell; shop OTP sign-in, my shops, register a shop, shop console shell; UI components
apps/api/                         NestJS 12 API: auth guard (JWKS), /v1/me, platform-admin guard + operator script, shops + shop-access guard, audit, problem errors
apps/customer_app/                Flutter shell (android, ios): placeholder screen + widget test
apps/shop_app/                    Flutter Shop App: OTP sign-in (Supabase), shop list, shop home, secure session storage (Riverpod, go_router, Dio)
packages/design_tokens/           tokens.json + brand.json (single source) and the generator for the web theme and Flutter tokens
packages/flutter_shared/          Generated tokens + AppBrand, AppTheme.light(), BrandMark, Inter 4.1 fonts, IndianMobileNumber, Loading/Message/Error views
packages/api_contracts/           Generated openapi.json (health, /v1/me, /v1/shops*, /v1/platform/shops*)
infra/local/                      Docker Compose Postgres 17 for app data (dev + separate test DB)
infra/supabase/                   Supabase CLI config: Auth only, test OTPs, local ES256 signing key (gitignored)
docs/  prompts/  .claude/skills/  CLAUDE.md  README.md
```

Details, commands and environment variables: `docs/TECHNICAL_ARCHITECTURE.md` §14. Decisions: ADR 0004–0006.

## 3. Versions in use

- **Runtime and tooling:**
  - Node 24 LTS (pinned; the local machine still runs 22.21.0, CI runs 24)
  - pnpm 12.16.1
  - TypeScript ~6.0.3
  - Prettier 3.9.10
- **API:** NestJS 12.3.2 · Prisma 7.10.1 · Zod 4.6.7 · jose 6.2.15
- **Web:** Next.js 16.4.3 · React 19.3.0 · Tailwind CSS 4
- **Supabase:** supabase-js 2.118.0 · @supabase/ssr 0.12.7 · Supabase CLI 2.122.0 (GoTrue v2.197.0)
- **Testing:** Vitest 5.0.5
- **Flutter:** 3.47.9 / Dart 3.13.7 via FVM 4.3.2
- **Database:** PostgreSQL 17

## 4. Done

- [x] Product, design, security and workflow documentation; Claude Code skills.
- [x] M0 foundation: monorepo, toolchains, local Postgres, quality checks, CI (green on GitHub).
- [x] Phase 0 decisions:
  - Supabase Auth (D-021);
  - sign-in methods (D-022);
  - platform-admin-only shop creation for the first build (D-023);
  - API conventions (ADR 0006).
- [x] AUTH-001:
  - first migration (`users`, `platform_admins`, `audit_events`);
  - JWKS token verification;
  - deny-by-default API;
  - `GET /v1/me`;
  - platform-admin guard and operator script;
  - RFC 9457 errors;
  - web platform sign-in, console shell, no-access and error states;
  - local Supabase Auth stack.
- [x] Shop model decisions:
  - self-registration on the web (D-024);
  - approval after the onboarding checklist (D-025);
  - one person may master several shops (D-026).
- [x] SHP-001:
  - migration `shops` + `shop_memberships` (one master per shop);
  - `POST /v1/shops`, `GET /v1/shops/:shopId` and memberships in `/v1/me`;
  - `ShopAccessGuard` with cross-tenant tests;
  - web mobile-OTP sign-in, my shops, register a shop, shop console shell, not-found and error states;
  - Supabase sign-up enabled;
  - the operator script no longer promotes existing accounts.
- [x] PLT-001:
  - read-only platform shop registry: `GET /v1/platform/shops` (cursor pagination) and `GET /v1/platform/shops/:shopId`;
  - web `/platform/shops` list (table and cards) and detail;
  - **Shops** navigation item.
- [x] SHP-002:
  - Shop App mobile-OTP sign-in (login-only), shop list, shop home and sign-out;
  - session in the platform keystore;
  - shared Flutter state views and mobile parser;
  - verified on the Android emulator against the local stack.
- [x] Product answers on 2026-11-04: address on a Google map with current location (D-027), free tiers and replaceable providers (D-028), availability per pack (D-029), platform brand catalogues plus shop products and shades (D-030), painter discount and commission options (D-031), request changes with reasons (D-032), edit lock only during review (D-033), single-source theme (D-034).
- [x] DS-001:
  - `packages/design_tokens` (`tokens.json`, `brand.json`) generates the web `@theme` and the Flutter token and brand classes;
  - WCAG AA check in the generator; `pnpm tokens:check` in CI;
  - `BrandMark` on web and Flutter, one font module on the web, title template;
  - Tailwind default container sizes replaced by token widths.

## 5. Not done

- [ ] SHP-003, SHP-004, CAT-001, CAT-002 and PLT-002 (see §1).
- [ ] Google Cloud project and Maps keys (product owner; D-027). Until then the map screens use the no-map fallback.
- [ ] Push and CI run for the AUTH-001, SHP-001, PLT-001, SHP-002 and DS-001 branches (not pushed; product owner decides).
- [ ] Product answers: questions 49 (registration limit), 51 (email sign-up mitigation), 52 (tinting workflow) and 53 (notification channel).
- [ ] Production SMS vendor + DLT registration (question 46). Platform admin MFA and password reset (question 47). Session policy after sign-out (question 48).
- [ ] Hosting approved or any cloud resource created: none exists, including no Supabase project.
- [ ] Final app identifiers (currently `com.example`).
- [ ] Customer App features (registration, discovery, ordering); the Shop App now uses Riverpod, go_router, Dio and supabase_flutter.
- [ ] Playwright browser tests and an interactive browser walkthrough of the portal.
- [ ] iOS build verification (requires macOS).

## 6. Checks run (local, Windows 11, Node 22.21.0)

### DS-001 (2026-11-04)

| Check | Result |
|---|---|
| `pnpm tokens:check` and `pnpm --filter design-tokens test` (15 tests: naming, contrast, validation failures, Dart line length, generated files up to date) | Passed |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | Passed |
| `pnpm test`: api 60, admin_web 76 (2 new `BrandMark` tests) | Passed |
| `pnpm --filter admin_web build`; built CSS contains the token width utilities; prerendered titles unchanged ("Platform sign-in · Admin portal", "Shops · Platform · Admin portal") | Passed |
| `fvm dart format` check (generated Dart is already formatted), `fvm flutter analyze` | Clean / no issues |
| `fvm flutter test`: flutter_shared 40 (2 new), customer_app 1, shop_app 19 | Passed |
| actionlint 1.7.12 on the updated `ci.yml` | 0 errors |
| API e2e, emulator walkthrough | Not re-run (no API or behaviour change; Shop App sign-in only gains the brand mark and the 448 px form width) |

### Earlier features (2026-11-03)

### SHP-002

| Check | Result |
|---|---|
| `fvm flutter analyze` | No issues |
| `fvm dart format` check (lib and test of the 3 Flutter packages) | Clean |
| `fvm flutter test`: shop_app 19, flutter_shared 38, customer_app 1 | Passed |
| `fvm flutter build apk --debug --dart-define-from-file=config/local.json` (shop_app) | Passed |
| APK scan: no Supabase secret key value (only the publishable key, by design) | Verified |
| Android emulator walkthrough against local Supabase + API: sign in, wrong code, shop list (tenant-scoped for two owners), shop home, restart keeps the session, sign out, unregistered number creates no account | Verified |
| No plaintext token in app storage (encrypted secure storage) | Verified |
| iOS build | **Not run** (requires macOS) |

### PLT-001

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test`: api 60, admin_web 74 | Passed |
| `pnpm --filter api test:e2e`: 60 tests, 12 of them new (registry pagination, detail, 404s, query validation, owner 403, 401) | Passed |
| `db:check-drift` and OpenAPI export | No difference; `/v1/platform/shops*` documented |
| HTTP walkthrough with real local Supabase sessions (11 checks: list, order, owner contact, detail, not-found, tampered cursor, owner gets no-access with no data, signed-out redirect) | Verified |
| Interactive browser walkthrough | **Not run** (skipped at the product owner's request) |

### SHP-001

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test`: api 60, admin_web 67 | Passed |
| `pnpm --filter api test:e2e`: 48 tests. 14 are new: registration, multi-shop, phone required, validation, malformed JSON, member access, cross-tenant 404 both ways, platform admin 404, unknown and malformed ids, one-master and name constraints | Passed |
| `db:check-drift` and OpenAPI export | No difference; `/v1/shops` documented |
| Scripted HTTP walkthrough without JavaScript, against local Supabase and the API: OTP sign-up, wrong code, resend cooldown, register, cross-tenant URL, platform admin refused, sign-out | Verified. 17 checks passed directly; the 3 not-found checks were confirmed in the streamed payload |
| Logs contain no OTP codes, tokens or secrets | Verified |
| Interactive browser walkthrough | **Not run** (skipped at the product owner's request) |
| GitHub Actions for the branches | **Not run** (not pushed) |

### AUTH-001

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | Passed |
| `pnpm test`: api 55 unit tests, admin_web 25 component/unit tests | Passed |
| `pnpm build` (Nest, Next) | Passed |
| `pnpm --filter api test:e2e`: 34 tests on Postgres 17 covering token rejection cases, just-in-time user creation and concurrency, identity conflict, platform guard, provisioning, append-only audit, auth-unavailable 503 | Passed |
| `pnpm --filter api db:check-drift` on the migrated test DB | No difference |
| actionlint 1.7.12 on the updated `ci.yml` | 0 errors |
| Live API with real local Supabase ES256 tokens (`/v1/me` admin, phone user, no token) | Verified |
| Operator script: create, re-run (no change), weak password rejected | Verified |
| Web over HTTP without JavaScript: wrong password, correct sign-in (303 + HttpOnly cookie), console, non-admin rejection and `/platform/no-access`, sign-out, signed-out redirect | Verified |
| No secret or publishable key in the web client bundle; no tokens or passwords in API and web logs | Verified |
| Interactive browser walkthrough (Claude in Chrome) | **Not run** (skipped at the product owner's request) |
| Client-side rendering of the error boundary when the API is down | **Not visually verified** (server streams the error digest correctly) |
| Flutter checks | Not re-run (no Flutter changes in AUTH-001) |
| GitHub Actions for the AUTH-001 branch | **Not run** (not pushed) |

## 7. Next actions

1. **SHP-003: shop profile and map location** (D-027): structured address, support mobile, Google map picker with a no-key fallback, current location on web and in the Shop App, onboarding checklist.
2. **SHP-004: shop photo** with an S3-protocol storage port (local Supabase Storage) and ADR 0007 on free tiers and portability (D-028).
3. **CAT-001: platform brand catalogue** with CSV import (D-030).
4. **CAT-002: shop catalogue**: products from the brand catalogue or custom, pack prices and availability, favourite and custom shades (D-029).
5. **PLT-002: review workflow** (D-032, D-033). Questions 49 and 51 are hardening.
5. **Housekeeping.** Install Node 24 locally. Push the branches when the product owner wants CI runs.

## 8. Feature progress

| Area | Status | Notes |
|---|---|---|
| Product requirements | Documented | Some business rules remain open |
| Architecture | Foundation + auth implemented | Hosting still proposed |
| Design system | Provisional tokens from one source (DS-001); first web and Flutter components | `packages/design_tokens` → web `tokens.css` + Flutter `flutter_shared` |
| Platform admin sign-in | **Complete (local)** | AUTH-001 |
| Shop onboarding | Registration done (SHP-001); Shop App sign-in done (SHP-002) | Profile, photo, products, submit and approval still to come |
| Customer authentication | Not started | Supabase phone OTP decided; SMS vendor open |
| Catalogue | Not started | Decided: brand catalogues + shop products, availability per pack (D-029, D-030). Tinting open (question 52) |
| Cross-shop search | Not started | Price visibility open |
| Orders | Not started | Fulfilment lifecycle open |
| Painter sites | Not started | Core workflow |
| Bills/payments | Not started | GST and adjustment rules open |
| Shop credit | Not started | Shop-specific rules |
| Rewards | Not started | Earning/redemption rules open |
| Painter references | Not started | Visibility/dispute rules open |
| Online payment gateway | Deferred | Later phase |
| Subscription billing | Deferred | Later phase |

## 9. Confirmed constraints to preserve

- One shared Customer App and one shared Shop App.
- One responsive web portal with Shop Admin and Platform Super Admin areas.
- Painters can manage multiple sites; normal customers do not need sites.
- Search shows active-shop products first, then other shops separately.
- Customer switches to a product's shop before adding it to cart.
- Each cart/order belongs to one shop.
- Painters need combined site spending and separate shop bills.
- Normal customers need separate shop bills but no site management.
- Each shop decides its own credit approval.
- Shop references must not become automatic credit scoring.
- Shop onboarding requires photo, address, support mobile and at least 10 products before public discovery.
- Shops self-register on the web. The registering person becomes the protected master account, and one person may master several shops.
- A shop becomes visible to customers and painters only after the owner completes the checklist and submits it, and a platform admin approves it.
- Reward points and painter commission are separate concepts.
- Online gateway and subscription billing are deferred.
- Initial market Kerala; English; Android, iOS and responsive web.
- Supabase Auth: mobile OTP for customers and shop users, email + password for platform admins.

## 10. Change log

| Date | Change |
|---|---|
| 2026-11-03 | Initial product and engineering starter documentation created. |
| 2026-11-03 | M0 foundation scaffolded: pnpm + Dart pub workspaces, API/web/Flutter shells, shared design tokens, local Postgres, CI, ADR 0004. |
| 2026-11-03 | First commit pushed by the product owner; CI green on GitHub (Node 24). |
| 2026-11-03 | Phase 0 auth decisions recorded (D-021–D-023). AUTH-001 implemented: auth foundation, platform admin sign-in, ADR 0005 and ADR 0006. |
| 2026-11-03 | Shop model changed by the product owner (D-024–D-026; D-023 superseded). SHP-001 implemented: shop self-registration, shop sign-in on the web, tenant-scoped shop access. |
| 2026-11-03 | PLT-001 implemented: read-only platform shop registry. |
| 2026-11-03 | SHP-002 implemented: Shop App sign-in, shop list and home (Flutter), verified on the Android emulator. |
| 2026-11-04 | Product owner answered the onboarding, catalogue, pricing and review questions (D-027–D-034). DS-001 implemented: single-source design tokens and brand names. |
