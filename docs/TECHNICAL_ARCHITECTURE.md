# Technical Architecture

**Status:** Foundation (M0) implemented for Flutter, Next.js, NestJS, PostgreSQL and Prisma (ADR 0004). Hosting (Supabase, Render, Vercel), auth/OTP provider and Riverpod remain proposals.  
**Last updated:** 2026-11-03

The architecture should be practical for a small team and AI-assisted development. Prefer a modular monolith and managed services over microservices and infrastructure that the project does not yet need.

> The actual repository structure, pinned versions, commands, environment variables and CI checks are in **§14 Actual foundation**. §1–13 describe the target architecture.

## 1. Recommended baseline

| Layer | Proposed technology | Responsibility |
|---|---|---|
| Customer mobile | Flutter | Customer and painter experience |
| Shop mobile | Flutter | Shop owner/staff experience |
| Web portal | Next.js + TypeScript | Shop Admin and Platform Super Admin |
| Backend API | NestJS + TypeScript | Business rules, authorization and APIs |
| Database | PostgreSQL | Transactional and tenant data |
| ORM/migrations | Prisma | Typed access and schema migrations |
| Managed services | Supabase | Postgres, Auth and Storage, subject to provider verification |
| Web hosting | Vercel | Next.js deployment/previews |
| API hosting | Render | NestJS deployment |
| Source control/CI | GitHub + GitHub Actions | Version control and automated checks |

Proposed mobile packages: Riverpod, Dio, GoRouter, Freezed/JSON Serializable where useful.  
Proposed web packages: Tailwind CSS, shadcn/ui, TanStack Query where useful, React Hook Form and Zod.  
Proposed backend: NestJS modules, Prisma, DTO/schema validation and OpenAPI/Swagger.

Check current stable versions and compatibility at implementation time. Do not copy old version numbers from this document.

## 2. Why this stack

- Flutter supports Android and iOS from one codebase per app.
- Next.js is a mature TypeScript framework for the responsive administration portal.
- NestJS provides structure for shops, customers, catalogue, orders, billing and credit modules.
- PostgreSQL is suitable for relational transactional data such as orders, bills, payments and ledger entries.
- Prisma provides typed database access and repeatable migrations.
- Supabase reduces infrastructure operations for database, auth and storage.
- Render and Vercel provide managed deployment without directly operating virtual machines.

## 3. Hosting and cost approach

### Proposed production starting point

- Supabase Pro for managed PostgreSQL, authentication and storage.
- Render for the NestJS API.
- Vercel for the Next.js web portal.
- GitHub for source control and CI.
- Google Play and Apple App Store for mobile distribution.

Published starting prices checked on 2026-11-03:
- Supabase Pro starts at **$25/month**; published inclusions currently include an 8 GB database allocation, 100 GB file storage, 250 GB egress and daily backups retained for seven days.
- Vercel Pro is listed at **$20/month**, including $20 in usage credit.
- Render small paid web-service compute starts at **$7/month** for a 0.5 CPU / 512 MB RAM service.

A simple published-entry-level reference is approximately **$52/month USD** ($25 + $20 + $7), before taxes, SMS/OTP, domains, extra services, overages, higher compute, monitoring and other costs. This is not a guaranteed production bill. A 512 MB API instance may need upgrading after memory and traffic measurements.

Official references:
- Supabase: https://supabase.com/pricing
- Vercel: https://vercel.com/pricing
- Render: https://render.com/pricing
- Optional future object storage: https://developers.cloudflare.com/r2/pricing/

### Cost controls

- Use local/free resources for development, not for production customer data.
- Start with small paid compute and monitor CPU, memory, latency and errors.
- Compress/resize images and use sensible caching.
- Start with PostgreSQL search; add a dedicated search engine only if measured need justifies it.
- Do not add Redis or background workers until there is a real requirement.
- Keep provider-specific code behind small infrastructure adapters where practical.
- Review actual usage before upgrading plans.

### Storage

Use Supabase Storage initially. Separate public/cacheable shop and product images from private identity documents and private exports. Never make identity documents public. If media storage/egress becomes material, evaluate Cloudflare R2; its published pricing currently includes 10 GB-month free storage and no internet egress charges, with standard storage listed at $0.015/GB-month. Recheck pricing before making a provider decision.

## 4. System shape

Use a **modular monolith** in the NestJS API. Suggested future modules:
`auth`, `users`, `shops`, `shop-memberships`, `customers`, `painters`, `catalogue`, `categories`, `products`, `offers`, `incentives`, `sites`, `carts`, `orders`, `fulfilment`, `bills`, `payments`, `credit`, `rewards`, `ratings`, `files`, `notifications`, `platform-admin`, `audit`.

Do not generate all modules/tables at once. Add them as the roadmap reaches them.

## 5. Application boundaries

- Customer App calls the backend API; it does not connect directly to the database.
- Shop App calls the same API and uses server-verified shop membership and permissions.
- One Next.js portal may host Shop Admin and Platform Super Admin areas with separate route groups/layouts and server-side authorization.
- NestJS owns business rules, validation, authorization and financial transactions.
- The active shop is resolved from verified user membership, never trusted solely from client state.

## 6. Multi-tenant data architecture

Use one PostgreSQL database with shared tables and tenant identifiers for shop-owned data.

Recommended concepts:
- Global `User` for login identity.
- `CustomerProfile` for painter/normal-customer information.
- `Shop` for each tenant.
- `ShopMembership` linking a user to a shop and storing role/status.
- A protected master membership created with each shop.
- Shop-owned records such as catalogue, offers, orders, bills, credit accounts and staff memberships carry shop/tenant ownership.
- A customer can transact with multiple shops.
- A painter's site is owned by the painter and may link orders from multiple shops.
- Every order belongs to one shop.

Customer-wide aggregation is limited to the authenticated customer's own records. Shop users see only their tenant's records. Use database constraints/indexes to reinforce tenant relationships. Evaluate PostgreSQL Row Level Security as defense in depth, but do not assume it protects data automatically when a privileged backend/service key bypasses those policies. Backend authorization is mandatory.

## 7. Financial and ledger design

Do not treat balances as ordinary editable profile fields. Use auditable entries for:
- Shop credit transactions.
- Payments and payment allocations.
- Reward points earned/redeemed/reversed.
- Painter commission/incentive accrual and settlement.
- Bill adjustments, discounts, returns and reversals.

Financial operations must use database transactions. Add idempotency controls where retries could duplicate payments/rewards. Record actor, timestamp and reason for sensitive adjustments. Detailed schema is designed feature by feature; this is not a final ERD.

## 8. Authentication and authorization

Proposed direction: use a managed identity provider such as Supabase Auth rather than inventing password/token infrastructure. Customer phone OTP is the intended experience, but verify supported Indian SMS provider, deliverability, DLT/compliance requirements and per-message cost before locking the provider. Shop master/staff account creation, invitations and resets are managed from the web/API. NestJS validates tokens and performs business authorization. Service-role credentials never go to clients.

Authentication provider and SMS integration are Phase 0 decisions.

## 9. API conventions

- REST API with OpenAPI contract.
- Consistent response and error shapes.
- DTO/schema validation at API boundaries.
- Pagination for growing lists.
- Explicit sorting/filtering contracts.
- Idempotency for sensitive create/payment operations where required.
- Do not expose internal database models directly as public API responses.
- Generate typed clients from OpenAPI when stable; avoid manually duplicating API shapes.

## 10. Repository structure

Implemented in M0 (see §14.2 for the actual tree and ADR 0004 for the reasoning).

Do not create a package just to share a few lines of code. Keep the mobile apps separate while extracting genuinely reusable Flutter components.

## 11. Testing strategy

- Flutter: unit, widget and integration tests for critical flows.
- NestJS: unit tests for business rules and end-to-end API tests.
- Next.js: component tests where useful and browser-level tests for critical admin flows.
- Database: migration checks and integration tests against PostgreSQL.
- Security: explicit cross-tenant access tests for every tenant-owned module.
- Financial flows: partial payments, reversals, duplicate requests, rounding and concurrent updates.

Tooling in place (M0): Flutter `flutter_test`; API Vitest unit tests plus Vitest + supertest e2e tests against a real Postgres test database; web Vitest + Testing Library (jsdom). Browser-level tests (Playwright) and Flutter integration tests are added with the first critical flow that needs them.

## 12. Environments and deployment

Maintain local, staging and production environments. Never use production customer data in development. Use separate databases/storage buckets and credentials per environment. Store secrets in provider secret managers. Run migrations through controlled deployment steps. Back up production data and test restore procedures. Add health checks, structured logs, error reporting and basic uptime monitoring before public launch.

## 13. Decisions still open

- Exact SMS/OTP provider and auth configuration.
- Whether shops self-register or are created only by Platform Admin.
- Final staff roles and account recovery/ownership transfer.
- Inventory and stock reservation behavior.
- Pickup/delivery, approval and partial-fulfilment lifecycle.
- GST invoice, tax, credit-note and invoice-numbering rules.
- Reward-point earning, expiry and redemption rules.
- Commission calculation and settlement.
- Cross-shop search price/stock visibility.
- Shop connection/approval workflow.
- Identity document collection and retention policy.
- DTO validation library for the API (class-validator vs Zod/Standard Schema), API versioning prefix and the standard error-response shape. Decide with the first business endpoint.
- Final Android application IDs / iOS bundle identifiers (currently `com.example` placeholders).

Do not create a final database schema for these unresolved areas by guessing.

## 14. Actual foundation (M0)

Implemented 2026-11-03. Rationale and alternatives: ADR 0004. Versions were verified against the npm registry, pub.dev and official release feeds on that date.

### 14.1 Toolchain and versions

| Area | Choice | Version / pin |
|---|---|---|
| Node.js | LTS | 24.x (`.node-version`; root `engines` `>=24.11 <25`) |
| JS package manager | pnpm workspaces | 12.16.1 (`packageManager`) |
| TypeScript | Both TS apps | ~6.0.3. **Not 7.x**: typescript-eslint, ts tooling and Nest CLI support <6.1 |
| API | NestJS 12, native ESM | `@nestjs/*` 12.3.2, CLI 12.0.11, `@nestjs/config` 12.0.1, `@nestjs/swagger` 12.0.5 |
| ORM | Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg`) | 7.10.1 exact (npm `latest` pointed to an 8.0 RC) |
| API lint/test | oxlint (type-aware) / Vitest + supertest | oxlint ^1.90, Vitest 5.0.5, Vite ^8.3.5 |
| Web | Next.js 16 App Router, Turbopack, React 19, Tailwind CSS 4 | next 16.4.3, react 19.3.0, tailwindcss ^4 |
| Web lint/test | ESLint 9 + `eslint-config-next` / Vitest + Testing Library + jsdom | eslint-config-next 16.4.3, Vitest 5.0.5 |
| Formatting (TS) | Prettier (root config) | 3.9.10 |
| Flutter / Dart | Pinned per project with FVM | Flutter 3.47.9 / Dart 3.13.7 (`.fvmrc`; FVM 4.3.2) |
| Flutter lint | `flutter_lints` + strict analyzer modes | flutter_lints ^6.0.0 |
| Database (local/CI) | PostgreSQL in Docker | `postgres:17-alpine` (matches Supabase's Postgres 17 line) |
| CI | GitHub Actions | checkout v7.0.1, setup-node v7.1.0, pnpm/action-setup v6.1.0, flutter-action v2.23.0, actionlint 1.7.12 (all SHA/digest pinned) |

Verified compatible with Flutter 3.47.9 but **not added yet** (added with the first feature that needs them): flutter_riverpod 3.4.3, go_router 18.1.2, dio 5.11.1, freezed 4.0.3, json_serializable 6.15.2. Also deferred on the web: shadcn/ui, TanStack Query, React Hook Form, Zod and Playwright.

### 14.2 Structure

```text
/
├── .github/workflows/ci.yml        # CI: typescript, flutter, repository jobs
├── apps/
│   ├── admin_web/                  # Next.js shell: one placeholder page, tokens, smoke test
│   ├── api/                        # NestJS shell: config, Prisma wiring, health, OpenAPI export
│   │   ├── prisma/schema.prisma    # datasource + generator only (no models yet)
│   │   └── prisma.config.ts
│   ├── customer_app/               # Flutter shell (android, ios)
│   └── shop_app/                   # Flutter shell (android, ios)
├── packages/
│   ├── api_contracts/              # generated openapi.json (no package.json yet)
│   └── flutter_shared/             # design tokens, AppTheme, bundled Inter fonts
├── infra/local/                    # Docker Compose Postgres (local only)
├── docs/  prompts/  .claude/skills/  CLAUDE.md  README.md
├── package.json  pnpm-workspace.yaml  pnpm-lock.yaml  .node-version   # TS workspace
└── pubspec.yaml  pubspec.lock  analysis_options.yaml  .fvmrc          # Dart pub workspace
```

The two toolchains are independent. pnpm manages only `apps/api` and `apps/admin_web`. The Dart pub workspace (root `pubspec.yaml`, one lockfile) manages the Flutter apps and `flutter_shared`.

### 14.3 What the shells contain

- **API:**
  - `GET /health`: liveness, no dependencies.
  - `GET /health/ready`: runs `SELECT 1` through Prisma; returns 200, or 503 with `{"checks":{"database":"down"}}`.
  - Env validated at startup. Error messages never echo values.
  - Swagger UI at `/docs` and JSON at `/docs-json` when `NODE_ENV` is not `production`.
  - The Prisma client connects lazily, so building the app and exporting OpenAPI need no database.
  - The readiness log records only the error type/code, never driver messages.
  - There are no business endpoints, models or migrations.
- **Web:**
  - A neutral placeholder page with `robots: noindex`.
  - Inter via `next/font` (downloaded at build time and self-hosted).
  - Design tokens as Tailwind v4 `@theme` variables. The default palette, font sizes, radii and breakpoints are reset.
  - Cache Components is enabled: rendering is dynamic unless explicitly cached.
- **Flutter:** each app shows a placeholder screen with `AppTheme.light()` from `flutter_shared`. `flutter_shared` holds the tokens, the Material 3 theme and the Inter 4.1 static fonts (OFL 1.1).

### 14.4 Local development

Prerequisites: Git, Node 24 + pnpm 12.16.1, FVM 4.3.2 (`dart pub global activate fvm`) with `fvm install 3.47.9`, Docker Desktop, and the Android SDK (iOS builds require macOS).

```sh
pnpm install                                   # TS deps; also runs `prisma generate`
fvm flutter pub get                            # Flutter workspace (run at repo root)
cp infra/local/.env.example infra/local/.env   # then set a local-only password
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
pnpm db:up                                     # Postgres 17 on 127.0.0.1:${POSTGRES_PORT:-5432}
pnpm --filter api start:dev                    # API on :3000, docs at /docs
pnpm --filter admin_web dev --port 3001        # web portal
cd apps/customer_app && fvm flutter run        # or apps/shop_app
```

If port 5432 is already used (for example by another project's Postgres), set `POSTGRES_PORT` in `infra/local/.env` and use the same port in `apps/api/.env` and `.env.test`.

### 14.5 Quality commands

| Scope | Command |
|---|---|
| TS format | `pnpm format` / `pnpm format:check` (Prettier; docs and Flutter excluded) |
| TS lint | `pnpm lint` (oxlint for api, ESLint for admin_web; warnings fail) |
| TS types | `pnpm typecheck` |
| TS tests | `pnpm test` (unit/component); `pnpm --filter api test:e2e` (needs DB) |
| TS build | `pnpm build` |
| OpenAPI | `pnpm --filter api openapi:export` (writes `packages/api_contracts/openapi.json`) |
| Prisma | `pnpm --filter api prisma:validate`, `db:migrate:dev`, `db:migrate:deploy` |
| Flutter format | `fvm dart format --set-exit-if-changed apps/customer_app apps/shop_app packages/flutter_shared` |
| Flutter analyze | `fvm flutter analyze` (repo root) |
| Flutter tests | `fvm flutter test` in each Flutter package |

### 14.6 Environment variables (names only; examples hold placeholders)

| File | Variables | Notes |
|---|---|---|
| `infra/local/.env` | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_TEST_DB`, `POSTGRES_PORT` | Local container only |
| `apps/api/.env` | `NODE_ENV`, `PORT`, `DATABASE_URL` | Validated at startup |
| `apps/api/.env.test` | `NODE_ENV`, `DATABASE_URL` | e2e only; must point at the test DB |
| `apps/admin_web/.env.local` | (none yet; `API_BASE_URL` reserved, server-only) | Never put secrets in `NEXT_PUBLIC_*` |
| Flutter | (none yet) | When needed: `--dart-define-from-file`, non-secret values only |

Auth, storage and SMS variables are defined when those providers are chosen. Service-role keys must exist only on the server.

### 14.7 CI (`.github/workflows/ci.yml`)

Runs on pull requests, pushes to `main` and manual dispatch, with `permissions: contents: read` and cancel-in-progress.

- **typescript:** frozen install → Prettier check → lint → typecheck → unit/component tests → build → API e2e against a `postgres:17-alpine` service → OpenAPI drift check.
- **flutter:** Flutter from `.fvmrc` → `pub get` → `dart format` check → `flutter analyze` → `flutter test` per package.
- **repository:** `docker compose config` validation and actionlint.

### 14.8 Supply-chain controls

- pnpm `minimumReleaseAge` 24 h (default) with `minimumReleaseAgeStrict: true`. Too-new versions are replaced by older releases, never excluded.
- `allowBuilds` permits only the `prisma` and `@prisma/engines` build scripts. It denies `@scarf/scarf` (install telemetry), `sharp` and `unrs-resolver`.
- Third-party actions and the actionlint image are pinned by commit SHA / digest.
- `.gitattributes` forces LF line endings. Signing files, `.env` files, FVM caches and generated Prisma output are gitignored.
