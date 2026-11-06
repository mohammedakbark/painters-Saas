# Feature: Your shops screen

- **Feature ID:** WEB-003
- **Status:** Complete (local verification; see §5)
- **Last updated:** 2026-11-06
- **Related modules:** `apps/admin_web`: `app/shops/page.tsx`, `components/shops/my-shops-view.tsx`, `components/ui/card.tsx` (`CardLink` variants)
- **Decisions:** D-039 (shared components), D-040 (brand), DESIGN_SYSTEM §9a (wording)

## 1. Goal

`/shops` is the first screen a shop owner sees after **Sign in**. Before this change it was a plain list with no brand. It now matches the home, sign-in and registration pages (UI/UX pass, product owner, 2026-11-05).

## 2. Behaviour

- **Top bar:** the SevenPalette Admin mark, which links to `/`, and **Sign out**.
- **Welcome band** (teal gradient): "Shop Admin", the heading "Your shops", "Signed in as …" and **Register a shop** (shown when the user already has a shop).
- **Shop cards:**
  - one column on phones, two from the medium breakpoint;
  - each card shows the shop name, role, status badge and status explanation (`lib/shops/labels.ts`), plus "Open shop";
  - the whole card links to `/shops/{id}` and lifts on hover;
  - a dashed **Register another shop** tile comes last.
- **No shop yet:** the existing message, then three steps the product already has: register the shop (`/shops/new`), complete the profile, platform team approval. Then **Register a shop**.
- **Loading:** two placeholder cards (`aria-busy`, "Loading your shops…" for screen readers).
- **Footer:** "Powered by zero.byt".
- **Motion:** cards fade in with the shared `.reveal` stagger (reduced-motion safe).

## 3. Security

No API or data change. The memberships come from `getShopUser()`, which reads `/v1/me` for the verified session. Nothing comes from the URL or the client. Opening a shop still goes through `requireShopAccess()`.

## 4. Components

`CardLink` gained `variant`:
- `default`: unchanged;
- `raised`: a main card that lifts on hover;
- `dashed`: an "add another" tile.

The screen uses only shared components and tokens (`pnpm ui:check`).

## 5. Checks (2026-11-06)

| Check | Result |
|---|---|
| admin_web lint, typecheck, tests (`my-shops-view.test.tsx`: empty state, cards, sign-out, loading), build; `ui:check`, `tokens:check` | Passed |
| Headless Chrome against the local API: sign in with a test number that has a shop, and one that has none, at 1280 px and 518 px; header at 2× zoom; a card opens `/shops/{id}`; **Sign out** returns to `/sign-in`; no horizontal scroll; no console errors | Verified |
