# api — NestJS backend

Modular-monolith API for the Paint Shop SaaS Platform. It owns business rules,
validation, authorization and financial transactions (see
`docs/TECHNICAL_ARCHITECTURE.md`).

**Current state:** foundation shell only. It has env validation, Prisma wiring (no models
yet), `GET /health` (liveness), `GET /health/ready` (database check) and Swagger UI at
`/docs` outside production. There are no business endpoints yet.

## Setup

```sh
cp .env.example .env            # local dev database
cp .env.test.example .env.test  # e2e test database
pnpm install                    # from the repo root; also runs `prisma generate`
pnpm db:up                      # from the repo root; starts local Postgres
```

## Commands (run from the repo root with `pnpm --filter api <script>`)

| Script | Purpose |
|---|---|
| `start:dev` | Run with watch mode on `PORT` (default 3000) |
| `build` / `start:prod` | Compile to `dist/` and run it |
| `lint` | oxlint (type-aware, warnings fail) |
| `typecheck` | `tsc --noEmit` |
| `test` | Unit tests (Vitest), no database needed |
| `test:e2e` | API tests against the Postgres test database (`.env.test`) |
| `openapi:export` | Regenerate `packages/api_contracts/openapi.json` |
| `prisma:generate` / `prisma:validate` | Regenerate or validate the Prisma client and schema |
| `db:migrate:dev` / `db:migrate:deploy` | Create and apply migrations (dev) / apply them (deploy) |

## Conventions

- ESM (`"type": "module"`): relative imports use the `.js` suffix.
- The Prisma client is generated into `src/generated/prisma` (gitignored).
- Never log secrets, tokens, OTPs or connection strings.
