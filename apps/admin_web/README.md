# admin_web — Next.js

One responsive web portal with separate Shop Admin and Platform Super Admin areas
(see `docs/PRODUCT_OVERVIEW.md` §3.3–3.4). Authorization is enforced by the API and
server-side. Hiding navigation is not security.

**Current state:** platform admin sign-in (AUTH-001): `/platform/sign-in` (email + password through a Server Action), the platform console shell at `/platform`, `/platform/no-access` and an error boundary. Sessions live in HTTP-only cookies (`@supabase/ssr`); `src/proxy.ts` refreshes them. All API calls are made from the server (`src/lib/api`). Every console page calls `requirePlatformAdmin()` itself.

Shop area (SHP-001):
- `/sign-in`: two-step mobile OTP.
- `/shops`: my shops.
- `/shops/new`: register a shop.
- `/shops/[shopId]`: shop console.

- `/shops/[shopId]/profile`: shop photo upload (SHP-004), support mobile, address and map location (SHP-003). Server Actions accept up to 6 MB (`next.config.ts`) for photos; the API enforces 5 MB.

The layout and every page call `requireShopAccess(shopId)`. The API answers 404 for shops the user is not a member of. Each page reads its data inside its own `<Suspense>` so navigation between console pages is instant.

The shop location map uses OpenStreetMap (Leaflet, Nominatim) and needs no key; see `docs/guides/MAPS.md`.

Setup: copy `.env.example` to `.env.local` and paste the local publishable key from `pnpm supabase:status`. No variable is `NEXT_PUBLIC_*`.

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
Tokens are generated from `packages/design_tokens/tokens.json` into `src/app/tokens.css` (`pnpm tokens:generate`); never edit that file by hand.
