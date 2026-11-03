# ADR 0004: Monorepo Layout and Foundation Toolchain

- **Status:** Accepted (M0 foundation)
- **Date:** 2026-11-03
- **Decision owners:** Product / Engineering

## Context

ADR 0003 proposed Flutter, Next.js, NestJS, PostgreSQL and Prisma. The foundation
(prompt 01) needed concrete repository structure, toolchain versions, local
development, quality checks and CI, without implementing product features,
creating a schema or creating cloud resources. Versions were verified against the
npm registry, pub.dev and official release feeds on 2026-11-03.

## Decision

### Repository layout

One Git monorepo with two independent toolchains side by side:

- **TypeScript workspace (pnpm 12.16.1):** `apps/api` (NestJS) and `apps/admin_web`
  (Next.js), declared in `pnpm-workspace.yaml`.
- **Dart pub workspace:** `apps/customer_app`, `apps/shop_app` and
  `packages/flutter_shared`, declared in the root `pubspec.yaml` with one shared
  lockfile. Flutter is never driven through pnpm.
- `packages/api_contracts` holds the generated OpenAPI document (no package yet).
- `infra/local` holds local-only Docker Compose configuration.
- No Turborepo, Nx or Melos. Root scripts (`pnpm -r`) and plain `flutter` commands
  are enough for the current size.

### Toolchain versions

| Tool | Version | Pinned in |
|---|---|---|
| Node.js | 24 LTS | `.node-version`, root `engines` (`>=24.11 <25`) |
| pnpm | 12.16.1 | root `packageManager` |
| TypeScript | ~6.0.3 | app `package.json` files |
| Flutter / Dart | 3.47.9 / 3.13.7 | `.fvmrc` (FVM 4.3.2 locally, `flutter-action` in CI) |
| PostgreSQL (local/CI) | 17 (`postgres:17-alpine`) | `infra/local/compose.yaml`, CI service |

- **TypeScript 7 is deliberately not used.** On 2026-11-03, typescript-eslint
  supported `<6.1`, Nest CLI bundled `~6.0`, and the type-aware tooling was built
  around TS 6.
- **Prisma is pinned to 7.10.1 exactly.** npm's `latest` tag pointed to
  `8.0.0-rc.29`, a release candidate.
- **FVM** pins Flutter per project so the developer's global Flutter SDK is
  untouched. CI reads the same `.fvmrc`.

### Framework defaults followed

- **API:** NestJS 12 official template. Native ESM (`"type": "module"`), oxlint
  (type-aware), Vitest + Vite 8 for tests, `@nestjs/config` for validated env,
  `@nestjs/swagger` for OpenAPI. Template extras for hosted Nest services
  (`@nestjs/mau`, `nest deploy`, the Observe `AGENTS.md`) were removed.
- **Prisma 7:** `prisma-client` generator (ESM, output gitignored under
  `src/generated/prisma`), `pg` driver adapter (`@prisma/adapter-pg`),
  `prisma.config.ts`. **Prisma Migrate owns the application schema**. No models
  or migrations exist yet; the first migration ships with the first feature that
  needs a table.
- **Web:** Next.js 16 official template. App Router, `src/`, Turbopack, Tailwind CSS
  v4 through `@tailwindcss/turbopack`, ESLint 9 with `eslint-config-next`, Cache
  Components enabled. Cache Components keeps rendering dynamic unless explicitly
  cached, which is the safer default for tenant-scoped admin data. Component tests
  use Vitest + Testing Library + jsdom.
- **Flutter:** `flutter create` templates, Android and iOS only. Shared root
  `analysis_options.yaml` uses `flutter_lints` plus strict-casts, strict-inference
  and strict-raw-types.
- **Formatting:** Prettier 3.9.10 at the root for both TS apps. `dart format` for
  Flutter. `.gitattributes` forces LF so the checks behave the same on Windows.

### Local database

Plain PostgreSQL 17 in Docker Compose, bound to `127.0.0.1`. It has a separate
`paintshop_test` database for API e2e tests. Credentials come from a gitignored
`infra/local/.env`. The Supabase CLI local stack is **not** used yet because the
auth provider is undecided (see `DECISIONS_AND_OPEN_QUESTIONS.md`).

### Supply-chain controls

- pnpm's default `minimumReleaseAge` (24 h) is kept, with
  `minimumReleaseAgeStrict: true`. Too-new versions are replaced with older
  releases, never excluded.
- Dependency build scripts are denied unless listed in `allowBuilds`. Allowed:
  `prisma`, `@prisma/engines`. Denied: `@scarf/scarf` (install telemetry),
  `sharp`, `unrs-resolver`.
- CI pins third-party actions and the actionlint image by commit SHA or digest,
  and uses `permissions: contents: read`.

### Shared design tokens

The design-system tokens are the first genuinely shared code:

- Dart: `packages/flutter_shared`, with bundled Inter 4.1 static fonts (OFL 1.1).
- CSS: Tailwind `@theme` in `apps/admin_web/src/app/globals.css`. The default
  Tailwind palette, font sizes, radii and breakpoints are reset.

The two copies are maintained by hand for now.

## Alternatives considered

1. **npm workspaces.** No extra tool, but looser hoisting allows undeclared
   imports. Rejected in favour of pnpm (user decision).
2. **Global Flutter upgrade instead of FVM.** Simpler, but would change other
   projects on the machine. Rejected (user decision).
3. **Node 26 LTS.** Longer support window, but very new for hosting providers.
   Node 24 chosen (user decision). Revisit before production launch.
4. **Supabase CLI local stack.** Would include Auth and Storage locally, but commits
   to Supabase Auth before the auth decision. Deferred.
5. **Jest for the API.** Nest 12's template now defaults to Vitest. Using Vitest
   for both TS apps keeps one test runner.
6. **Melos or Turborepo.** Not needed at the current size.
7. **A single token source (e.g. Style Dictionary) generating Dart and CSS.**
   Premature for 16 colours and a handful of scales. Revisit if tokens churn.

## Consequences

- Two toolchains must be installed locally: Node 24 + pnpm, and FVM + Flutter 3.47.9.
- Upgrading Flutter means changing `.fvmrc` in one commit and running
  `fvm install`. Upgrading Node means changing `.node-version` and `engines`.
- `prisma generate` runs on `pnpm install`. It does not need a database. Migrate
  commands need `DATABASE_URL`.
- OpenAPI drift is caught in CI. API changes must commit the regenerated
  `packages/api_contracts/openapi.json`.
- Design tokens exist in two places and must be changed together (see
  `docs/DESIGN_SYSTEM.md` §10).
- App identifiers are the `com.example` placeholder and must change before any
  store upload.

## Follow-up actions

- [x] Update `docs/TECHNICAL_ARCHITECTURE.md` (§14 Actual foundation).
- [x] Update `docs/PROJECT_STATE.md` and `docs/DECISIONS_AND_OPEN_QUESTIONS.md`.
- [ ] Choose the auth/OTP provider, then decide whether local dev moves to the
      Supabase CLI stack.
- [ ] Choose final Android application IDs and iOS bundle identifiers.
- [ ] Verify Vercel and Render support for Node 24 + pnpm 12 before the first deploy.
