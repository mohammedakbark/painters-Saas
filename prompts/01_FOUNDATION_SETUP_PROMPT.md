# Prompt 01 — Create the Project Foundation

Copy the prompt below into Claude Code after opening Claude Code from the root of the Git repository.

---

You are the lead software architect and implementation engineer for this project.

We are building the **Paint Shop SaaS Platform** described in the repository documentation. Your task is to establish the project foundation only. Do not implement customer-facing business features yet.

## Mandatory context

Before doing anything:
1. Read the root `CLAUDE.md`.
2. Read `README.md` and `docs/PROJECT_STATE.md`.
3. Read `docs/PRODUCT_OVERVIEW.md` and `docs/FEATURE_CATALOG.md`.
4. Read `docs/TECHNICAL_ARCHITECTURE.md` and `docs/DESIGN_SYSTEM.md`.
5. Read `docs/DATA_AND_SECURITY.md` and `docs/DECISIONS_AND_OPEN_QUESTIONS.md`.
6. Read relevant skills under `.claude/skills/`.

Repository documentation is the source of truth. Do not invent requirements. Distinguish confirmed decisions, proposals and open questions.

## Product context

This is a multi-tenant SaaS for paint shops, painters and normal customers. Intended applications:
- Flutter Customer App for painters and normal customers.
- Flutter Shop App for shop owners and staff.
- Next.js responsive web portal with Shop Admin and Platform Super Admin areas.
- NestJS backend API.
- PostgreSQL database.

Painters can manage multiple work sites and view combined site spending plus separate shop-wise bills. Normal customers use a simple shopping flow and do not need sites. A shop's private data must never be visible to another shop.

Online payment gateway and subscription billing are explicitly deferred. Do not implement them.

## Proposed stack to evaluate

The docs propose Flutter + Riverpod; Next.js + TypeScript + Tailwind + shadcn/ui; NestJS + TypeScript; PostgreSQL + Prisma; Supabase for managed Postgres/Auth/Storage; Render for API; Vercel for web; GitHub Actions for CI.

These are proposals. Verify compatibility and current stable versions. Do not create cloud resources or incur costs. Do not silently replace the stack.

## Task boundaries

### You must

1. Inspect the current repository, Git status and files before changing anything.
2. Report whether it is empty or already contains code.
3. Review the proposed architecture and identify blocking issues.
4. Propose a maintainable monorepo structure for:
   - `apps/customer_app` — Flutter.
   - `apps/shop_app` — Flutter.
   - `apps/admin_web` — Next.js.
   - `apps/api` — NestJS.
   - `packages/flutter_shared` — only genuinely reusable Flutter code.
   - `packages/api_contracts` — OpenAPI source/generated contracts where appropriate.
   - `docs`, `prompts`, `infra` and `.claude/skills`.
5. Define local development requirements and commands.
6. Define formatting, linting, static analysis and test commands for each app.
7. Prepare safe `.env.example` files with placeholder names only.
8. Prepare `.gitignore` and `.editorconfig`.
9. Prepare reproducible local PostgreSQL configuration, preferably Docker-based. Do not connect to production.
10. Prepare basic GitHub Actions checks.
11. Preserve `CLAUDE.md` and all project skills.
12. Update `docs/TECHNICAL_ARCHITECTURE.md` with actual approved foundation choices.
13. Update `docs/PROJECT_STATE.md` with the actual structure, versions, commands and checks.
14. Add an ADR for any important architecture decision made.

### You must not

- Implement login screens, shop onboarding screens, product CRUD, cart, orders, billing, credit, rewards or other business features.
- Design/create the complete database schema yet.
- Create fake API endpoints or dummy business logic.
- Add microservices, Redis, a dedicated search engine or payment gateway.
- Add subscription billing or paid-seat billing.
- Create cloud projects, databases, buckets, domains or paid resources.
- Add real secrets, API keys or credentials.
- Delete/overwrite existing code without explaining why and obtaining approval.
- Install unnecessary dependencies just because they are popular.

## Work process

### Step A — Inspect and plan

Inspect the repository, then present:
- Existing repository state.
- Proposed folder tree.
- Exact technology/package choices and reasons.
- Local development setup.
- Formatting/lint/test commands.
- Environment variable names only.
- CI checks.
- Architecture risks/open decisions.

If code already exists, adapt rather than replace it. If a decision materially affects tenant security, authentication, database migrations or recurring hosting cost and cannot be safely inferred, ask for approval before implementing that part.

### Step B — Scaffold the foundation

After the plan is clear and there is no blocking decision, create repository structure and configuration files. Create minimal app shells only if needed to prove the toolchain works. Do not implement product features. Keep Flutter and TypeScript toolchains separate; do not force Flutter into the JavaScript package manager.

### Step C — Verify

Run available checks:
- Flutter format/analyze/test for Flutter packages that exist.
- TypeScript format/lint/typecheck/test for web/API packages that exist.
- Docker Compose configuration validation if Docker is available.
- GitHub Actions workflow syntax review.

Do not claim a command passed unless it was run. Report missing prerequisites.

### Step D — Documentation sync

Update `docs/TECHNICAL_ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/DECISIONS_AND_OPEN_QUESTIONS.md`, ADRs and `README.md` as appropriate. `docs/PROJECT_STATE.md` must describe the actual repository state, not intended state.

## Final response

Report:
1. Foundation created.
2. Actual folder structure.
3. Technology choices and versions.
4. Commands to install and run locally.
5. Environment variables to configure.
6. Checks executed and results.
7. Files created/modified.
8. Open decisions/blockers.
9. One next recommended task.

Work carefully. A small, correct foundation is more valuable than a large scaffold that is difficult to maintain.
