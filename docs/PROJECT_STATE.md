# Project State — Living Document

**Last updated:** 2026-11-03  
**Current stage:** Foundation scaffolded (M0); next is Phase 0 auth and tenant-boundary decisions  
**Overall status:** Monorepo, toolchains, local database, quality checks and CI configured. No product features.  
**Product name:** Not decided

> Claude Code must read this file before every task and update it after every completed task or meaningful project change.

## 1. Current milestone

**M0 — Project foundation**  
Goal: approve the technical baseline, create repository structure, establish Claude Code instructions/skills, and set up local development, formatting, tests and CI.  
Status: `DONE (local)`. All local checks pass (§6). CI has **not run on GitHub yet**: nothing has been committed or pushed. M0 is fully complete once the first push shows the `CI` workflow green.

## 2. Actual repository structure

```text
.github/workflows/ci.yml          CI (typescript, flutter, repository jobs)
apps/admin_web/                   Next.js 16 shell: placeholder page, design tokens, Vitest smoke test
apps/api/                         NestJS 12 shell: env validation, Prisma 7 wiring (no models), /health, /health/ready, Swagger, OpenAPI export
apps/customer_app/                Flutter shell (android, ios): placeholder screen + widget test
apps/shop_app/                    Flutter shell (android, ios): placeholder screen + widget test
packages/flutter_shared/          Design tokens, AppTheme.light(), Inter 4.1 fonts, token + contrast tests
packages/api_contracts/           Generated openapi.json (health endpoints only)
infra/local/                      Docker Compose Postgres 17 (dev + separate test DB), localhost-only
docs/  prompts/  .claude/skills/  CLAUDE.md  README.md
package.json, pnpm-workspace.yaml, pnpm-lock.yaml, .node-version      TypeScript workspace (pnpm)
pubspec.yaml, pubspec.lock, analysis_options.yaml, .fvmrc             Dart pub workspace (Flutter)
.gitattributes, .gitignore, .editorconfig, .prettierrc.json, .prettierignore
```

Details, commands and environment variables: `docs/TECHNICAL_ARCHITECTURE.md` §14. Decisions: ADR 0004.

## 3. Versions in use

Node 24 LTS (pinned; **local machine still runs 22.21.0**, see §7) · pnpm 12.16.1 · TypeScript ~6.0.3 · NestJS 12.3.2 · Prisma 7.10.1 · Next.js 16.4.3 · React 19.3.0 · Tailwind CSS 4 · Vitest 5.0.5 · Prettier 3.9.10 · Flutter 3.47.9 / Dart 3.13.7 via FVM 4.3.2 · PostgreSQL 17 (`postgres:17-alpine`, ran 17.11 locally).

## 4. Done

- [x] Product, design, security and workflow documentation; Claude Code skills.
- [x] Technical baseline accepted for the foundation (Flutter, Next.js, NestJS, PostgreSQL, Prisma). See ADR 0004 and `DECISIONS_AND_OPEN_QUESTIONS.md` T-001–T-009.
- [x] Repository structure, pnpm workspace and Dart pub workspace.
- [x] Flutter apps scaffolded (shells only) with shared tokens/theme package.
- [x] Next.js admin portal scaffolded (shell only).
- [x] NestJS API scaffolded (infrastructure endpoints only).
- [x] Local PostgreSQL configured (Docker Compose, separate test DB).
- [x] Formatting, linting, static analysis and tests for every app/package.
- [x] GitHub Actions CI workflow written and linted (actionlint).
- [x] Safe `.env.example` files (placeholders only).

## 5. Not done

- [ ] First commit and push; first green CI run on GitHub.
- [ ] Auth provider and Indian OTP provider selected.
- [ ] Database schema designed or migrated (no Prisma models yet).
- [ ] Any product feature implemented.
- [ ] Hosting approved (Supabase/Render/Vercel) or cloud infrastructure created. None exists.
- [ ] Final app identifiers (currently `com.example` placeholders).
- [ ] Riverpod, go_router, Dio, shadcn/ui, TanStack Query, Playwright: verified compatible, not added.
- [ ] iOS build verification (requires macOS).

## 6. Checks run on 2026-11-03 (local, Windows 11, Node 22.21.0)

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` (supply-chain policy) | Passed |
| `pnpm format:check` (Prettier) | Passed |
| `pnpm lint` (oxlint api, ESLint admin_web; warnings fail) | Passed |
| `pnpm typecheck` (both TS apps) | Passed |
| `pnpm test`: api unit 16 tests, admin_web 1 test | Passed |
| `pnpm build` (Nest build, Next production build) | Passed |
| `pnpm --filter api test:e2e` against local Postgres 17 test DB (2 tests) | Passed |
| e2e guard refuses to run without a test-DB `DATABASE_URL` | Verified |
| API run: `/health` 200, `/health/ready` 200, `/docs` 200; DB stopped → `/health/ready` 503, recovers after restart; no credentials in logs | Verified manually |
| OpenAPI export runs without a DB and is deterministic (two runs identical) | Verified |
| `fvm dart format --set-exit-if-changed` (3 Flutter packages) | Passed |
| `fvm flutter analyze` | No issues |
| `fvm flutter test`: flutter_shared 19 (incl. 13 WCAG AA contrast pairs), customer_app 1, shop_app 1 | Passed |
| `fvm flutter build apk --debug` (customer_app) | Passed |
| `docker compose … config` (with `.env.example`) | Passed |
| Postgres init script creates `paintshop_dev` + `paintshop_test` on a fresh volume | Verified |
| actionlint 1.7.12 on `.github/workflows/ci.yml` | 0 errors |
| Secret scan of files Git would track | Only documented placeholders and CI-only values |
| iOS build | **Not run** (requires macOS) |
| GitHub Actions run | **Not run** (not pushed yet) |
| Checks under Node 24 | **Not run locally** (Node 24 not installed yet); CI uses Node 24 |

## 7. Next actions

1. Install Node 24 LTS locally and re-run `pnpm install && pnpm test`.
2. Commit the foundation, for example `docs: add product foundation` and `chore: scaffold monorepo`, then push and confirm the `CI` workflow passes.
3. Phase 0 decisions: auth/OTP provider, roles and tenant boundaries (`DECISIONS_AND_OPEN_QUESTIONS.md` questions 37, 41–45).
4. Then spec the core identity/tenant schema (`User`, `Shop`, `ShopMembership`) as a feature document before any migration.

## 8. Feature progress

| Area | Status | Notes |
|---|---|---|
| Product requirements | Documented | Some business rules remain open |
| Architecture | Foundation implemented | Hosting/auth still proposed |
| Design system | Provisional tokens implemented | Flutter `flutter_shared` + web `globals.css` |
| Shop onboarding | Not started | Completion checklist defined |
| Customer authentication | Not started | OTP provider open |
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
- Shop creation creates a protected master account.
- Reward points and painter commission are separate concepts.
- Online gateway and subscription billing are deferred.
- Initial market Kerala; English; Android, iOS and responsive web.

## 10. Change log

| Date | Change |
|---|---|
| 2026-11-03 | Initial product and engineering starter documentation created. |
| 2026-11-03 | M0 foundation scaffolded: pnpm + Dart pub workspaces, API/web/Flutter shells, shared design tokens, local Postgres, CI, ADR 0004. |
