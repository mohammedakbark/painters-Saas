# admin_web — Next.js

One responsive web portal with separate Shop Admin and Platform Super Admin areas
(see `docs/PRODUCT_OVERVIEW.md` §3.3–3.4). Authorization is enforced by the API and
server-side. Hiding navigation is not security.

**Current state:** foundation shell only. It has one placeholder page, design tokens in
`src/app/globals.css`, Inter through `next/font` and a Vitest smoke test. No admin
areas or features exist yet.

## Commands (run from the repo root with `pnpm --filter admin_web <script>`)

| Script | Purpose |
|---|---|
| `dev` | Development server (Turbopack) on http://localhost:3000 by default |
| `build` / `start` | Production build and server |
| `lint` | ESLint (`eslint-config-next`), warnings fail |
| `typecheck` | `next typegen` + `tsc --noEmit` |
| `test` | Component tests (Vitest + Testing Library + jsdom) |

The API also defaults to port 3000. When running both, start one on another port,
e.g. `pnpm --filter admin_web dev --port 3001`.

## Design tokens

Use the token utilities only, for example `bg-brand-primary`,
`text-text-secondary`, `border-border-default`, `text-heading1`, `rounded-medium`
and `desktop:`. Tailwind's default palette and sizes are intentionally removed.
Keep `globals.css` in sync with `packages/flutter_shared`.
