# Paint Shop SaaS Platform — Project Starter Kit

**Working title:** Paint Shop SaaS Platform  
**Product name:** Not decided  
**Stage:** Product definition and technical foundation  
**Last updated:** 2026-11-03

This repository is intended to become a multi-tenant SaaS platform connecting independent paint shops, painters and normal customers. The product name, logo and final visual identity are intentionally not fixed yet.

## Included documentation

- `CLAUDE.md` — permanent project instructions for Claude Code.
- `docs/PRODUCT_OVERVIEW.md` — what the product is, why it exists, users and workflows.
- `docs/FEATURE_CATALOG.md` — feature inventory and suggested delivery phases.
- `docs/TECHNICAL_ARCHITECTURE.md` — proposed stack, architecture and hosting.
- `docs/DESIGN_SYSTEM.md` — provisional colors, typography, spacing and UI rules.
- `docs/DATA_AND_SECURITY.md` — tenant isolation, roles, financial and sensitive-data rules.
- `docs/PROJECT_STATE.md` — living progress file Claude must read and update for every task.
- `docs/DECISIONS_AND_OPEN_QUESTIONS.md` — confirmed decisions, proposals and unresolved questions.
- `docs/DEVELOPMENT_WORKFLOW.md` — one-feature-at-a-time workflow.
- `docs/features/FEATURE_SPEC_TEMPLATE.md` — template for documenting each feature.
- `docs/adr/` — architecture decision records.
- `prompts/01_FOUNDATION_SETUP_PROMPT.md` — first prompt to create the repository foundation.
- `.claude/skills/` — reusable Claude Code workflows.

## How to use

1. Create an empty Git repository.
2. Extract this kit into the repository root. `CLAUDE.md` must be at the root.
3. Review `docs/PRODUCT_OVERVIEW.md` and `docs/DECISIONS_AND_OPEN_QUESTIONS.md`.
4. Open Claude Code from the repository root.
5. Give Claude the prompt in `prompts/01_FOUNDATION_SETUP_PROMPT.md`.
6. Review and approve the foundation plan before asking Claude to implement features.
7. Commit the docs and project foundation to Git so the context is available on every computer.

## Important rule

Do not ask Claude to implement the entire product in one request. Work on one feature at a time. Every feature needs documented requirements, acceptance criteria, tests and updated documentation.

## Git and secrets

Commit documentation, source code, migrations, tests and safe configuration examples. Never commit real `.env` files, API keys, database passwords, OTP credentials, private signing keys, customer data or identity documents.

## Current status

The **project foundation (M0)** is in place: a monorepo with Flutter app shells, a Next.js admin portal, a NestJS API, a shared Flutter design-token package, local PostgreSQL, quality checks and GitHub Actions CI. Built on Supabase Auth so far:
- **AUTH-001:** platform admin sign-in.
- **SHP-001:** shop owners sign in with a mobile OTP and register their shop, with tenant-scoped shop access.
- **PLT-001:** platform shop registry (read-only).
- **SHP-002:** Shop App sign-in, shop list and shop home (Flutter).
- **DS-001:** one source for colours, fonts, sizes and app names (`packages/design_tokens`; see its README to rebrand).
- **CAT-002:** shop catalogue (products from the brand catalogue or own, per-pack prices and availability, favourite and own shades).
- **CAT-001:** platform brand catalogue (categories, brands, products, pack sizes, shades) with CSV import; `pnpm --filter api catalogue:seed-sample` loads a fictional sample brand.
- **SHP-004:** shop photo upload; files go through a replaceable S3-protocol storage port (ADR 0007).
- **SHP-003:** shop profile with address, map location ("Use my current location"; Google map once keys exist, see `docs/guides/GOOGLE_MAPS_SETUP.md`) and the onboarding checklist.

Catalogue, customer and order features are not built yet, and **no cloud infrastructure exists**. See `docs/PROJECT_STATE.md` for the live status.

## Repository layout

| Path | What it is |
|---|---|
| `apps/customer_app`, `apps/shop_app` | Flutter apps (Android, iOS) |
| `apps/admin_web` | Next.js Shop Admin + Platform Super Admin portal |
| `apps/api` | NestJS modular-monolith API (Prisma, PostgreSQL) |
| `packages/flutter_shared` | Design tokens and theme shared by the Flutter apps |
| `packages/api_contracts` | Generated OpenAPI document |
| `infra/local` | Local-only Docker Compose PostgreSQL (app data) |
| `infra/supabase` | Local-only Supabase CLI config (Auth only) |

TypeScript projects use **pnpm**; Flutter projects use a **Dart pub workspace** with Flutter pinned by **FVM**. Details: `docs/TECHNICAL_ARCHITECTURE.md` §14 and ADR 0004.

## Quick start

Prerequisites: Node 24 LTS, pnpm 12.16.1 (`npm i -g pnpm@12.16.1`), FVM (`dart pub global activate fvm`, then `fvm install`), Docker Desktop and the Android SDK. The Supabase CLI is installed by `pnpm install`.

```sh
pnpm install
fvm flutter pub get
cp infra/local/.env.example infra/local/.env       # set a local-only password
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
cp apps/admin_web/.env.example apps/admin_web/.env.local
pnpm db:up
pnpm supabase:keys && pnpm supabase:start         # local Supabase Auth
pnpm supabase:status                                # copy the secret key into apps/api/.env and the
                                                    # publishable key into apps/admin_web/.env.local
pnpm --filter api db:migrate:deploy
pnpm --filter api platform-admin:create --email admin@example.com

pnpm --filter api start:dev                         # http://localhost:3000/health, docs at /docs
pnpm --filter admin_web dev --port 3001             # http://localhost:3001 (local shop sign-in: numbers
                                                    # 99999 00001-00003, code 123456)
cd apps/shop_app && cp config/local.example.json config/local.json   # set the publishable key + API port
fvm flutter run --dart-define-from-file=config/local.json
```

Checks: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm --filter api test:e2e`, `pnpm --filter api db:check-drift`, `fvm dart format --set-exit-if-changed apps/customer_app apps/shop_app packages/flutter_shared`, `fvm flutter analyze`, and `fvm flutter test` in each Flutter package.
