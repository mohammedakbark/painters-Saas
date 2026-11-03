# api — NestJS backend

Modular-monolith API for the Paint Shop SaaS Platform. It owns business rules,
validation, authorization and financial transactions (see
`docs/TECHNICAL_ARCHITECTURE.md`).

**Current state:** auth foundation (AUTH-001). It has a global auth guard that verifies Supabase access tokens against the JWKS, `GET /v1/me`, the platform-admin guard and operator script, an append-only audit table, RFC 9457 errors and Zod validation (ADR 0005, ADR 0006). Also `GET /health`, `GET /health/ready` and Swagger UI at `/docs` outside production.

## Setup

```sh
cp .env.example .env            # local dev database + Supabase Auth (paste the secret key)
cp .env.test.example .env.test  # e2e test database
pnpm install                    # from the repo root; also runs `prisma generate`
pnpm db:up                      # from the repo root; starts local Postgres
pnpm supabase:keys && pnpm supabase:start   # from the repo root; local Supabase Auth
pnpm --filter api db:migrate:deploy
```

## Commands (run from the repo root with `pnpm --filter api <script>`)

| Script | Purpose |
|---|---|
| `start:dev` | Run with watch mode on `PORT` (default 3000) |
| `build` / `start:prod` | Compile to `dist/` and run it |
| `lint` | oxlint (type-aware, warnings fail) |
| `typecheck` | `tsc --noEmit` |
| `test` | Unit tests (Vitest), no database needed |
| `test:e2e` | API tests against the Postgres test database (`.env.test`); applies migrations first and refuses a database whose name lacks "test" |
| `db:check-drift` | Fails if `schema.prisma` and the migrated database differ |
| `platform-admin:create --email <email>` | Create a Platform Super Admin (hidden password prompt; audited) |
| `openapi:export` | Regenerate `packages/api_contracts/openapi.json` |
| `prisma:generate` / `prisma:validate` | Regenerate or validate the Prisma client and schema |
| `db:migrate:dev` / `db:migrate:deploy` | Create and apply migrations (dev) / apply them (deploy) |

## Conventions

- ESM (`"type": "module"`): relative imports use the `.js` suffix.
- The Prisma client is generated into `src/generated/prisma` (gitignored).
- Never log secrets, tokens, OTPs or connection strings.
- Every route requires authentication unless marked `@Public()`. Throw `ProblemException` for expected errors (client-safe `detail` and a stable `code`).
- Request validation: Zod schemas via `@Body({ schema })` / `@Query({ schema })` / `@Param(name, { schema })`.
- Every migration enables RLS on new tables; write audit events with `recordAuditEvent(tx, …)` inside the same transaction.
