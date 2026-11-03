# Project State — Living Document

**Last updated:** 2026-11-03  
**Current stage:** Phase 0/1: identity and shop accounts. AUTH-001 done; PLT-001 (create shop + master account) next.  
**Overall status:** Foundation complete with CI green on GitHub. Platform admin sign-in implemented and verified locally.  
**Product name:** Not decided

> Claude Code must read this file before every task and update it after every completed task or meaningful project change.

## 1. Current milestone

**M1: Identity and shop accounts.** Three features, built and verified one at a time:

| Feature | Status | Spec |
|---|---|---|
| AUTH-001: Platform admin sign-in, plus auth and API conventions | **Complete (local)**; branch `feat/auth-001-platform-admin-sign-in` | `docs/features/AUTH-001-platform-admin-sign-in.md` |
| PLT-001: Platform admin creates a shop with its protected master account | Next | to be written |
| SHP-001: Shop user sign-in (web + Shop App) and tenant-scoped access | Planned | to be written |

After SHP-001 the next feature is the catalogue (CAT-001). It needs answers to open questions 13, 15, 16 and 17 first.

**M0: Project foundation** is `DONE`. The first commit (`c56f614`, pushed by the product owner) ran the `CI` workflow on GitHub with all three jobs green under Node 24.

## 2. Actual repository structure

```text
.github/workflows/ci.yml          CI (typescript, flutter, repository jobs)
apps/admin_web/                   Next.js 16 portal: platform sign-in, platform console shell, UI components
apps/api/                         NestJS 12 API: auth guard (JWKS), /v1/me, platform-admin guard + operator script, audit, problem errors
apps/customer_app/                Flutter shell (android, ios): placeholder screen + widget test
apps/shop_app/                    Flutter shell (android, ios): placeholder screen + widget test
packages/flutter_shared/          Design tokens, AppTheme.light(), Inter 4.1 fonts, token + contrast tests
packages/api_contracts/           Generated openapi.json (health, /v1/me)
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

## 5. Not done

- [ ] PLT-001 and SHP-001 (see §1).
- [ ] Push and CI run for the AUTH-001 branch (not pushed; product owner decides).
- [ ] Production SMS vendor + DLT registration (question 46). Platform admin MFA and password reset (question 47). Session policy after sign-out (question 48).
- [ ] Hosting approved or any cloud resource created: none exists, including no Supabase project.
- [ ] Final app identifiers (currently `com.example`).
- [ ] Riverpod, go_router, Dio, supabase_flutter: verified compatible, not added (SHP-001 adds them).
- [ ] Playwright browser tests and an interactive browser walkthrough of the portal.
- [ ] iOS build verification (requires macOS).

## 6. Checks run for AUTH-001 on 2026-11-03 (local, Windows 11, Node 22.21.0)

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

1. PLT-001: write the spec, then build shop creation with the protected master account (migration, API, web, tests).
2. SHP-001: shop user sign-in on the web and in the Shop App, plus tenant-scoped access with cross-tenant tests.
3. Ask the product owner the catalogue questions (13, 15, 16, 17) before CAT-001.
4. Install Node 24 locally.

## 8. Feature progress

| Area | Status | Notes |
|---|---|---|
| Product requirements | Documented | Some business rules remain open |
| Architecture | Foundation + auth implemented | Hosting still proposed |
| Design system | Provisional tokens implemented; first web components | Flutter `flutter_shared` + web `globals.css` + `components/ui` |
| Platform admin sign-in | **Complete (local)** | AUTH-001 |
| Shop onboarding | Not started | PLT-001 next (creation + master account) |
| Customer authentication | Not started | Supabase phone OTP decided; SMS vendor open |
| Catalogue | Not started | Inventory/tinting scope open |
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
- Shop creation creates a protected master account; in the first build only Platform Super Admin creates shops.
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
